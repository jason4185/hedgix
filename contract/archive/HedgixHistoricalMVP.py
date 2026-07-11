# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *

import datetime
import json
import typing


REGISTRY_NAME = "Hedgix Market Protection Registry"
REGISTRY_VERSION = "v1"
NETWORK_NAME = "GenLayer Bradbury"
APP_NAME = "Hedgix"
DEFAULT_REGISTRY_URL = "https://hedgix-market-registry.netlify.app/hedgix-market-protection-registry.v1.json"
BINANCE_BASE_URL = "https://data-api.binance.vision"

PRICE_SCALE = 100000000
BPS_DENOMINATOR = 10000
DAY_MS = 24 * 60 * 60 * 1000
PRICE_TOLERANCE_SCALED = 1
GEN_WEI = 1000000000000000000

PRICE_DROP_PROTECTION = "price_drop_protection"
DEPEG_PROTECTION = "depeg_protection"

STATUS_ACTIVE = "ACTIVE"
STATUS_TRIGGERED = "TRIGGERED"
STATUS_PAID = "PAID"
STATUS_EXPIRED = "EXPIRED"
STATUS_CANCELLED = "CANCELLED"

@gl.evm.contract_interface
class _Recipient:
    class View:
        pass

    class Write:
        pass


def _response_to_text(response) -> str:
    if isinstance(response, str):
        return response
    if isinstance(response, bytes) or isinstance(response, bytearray):
        return response.decode("utf-8")
    if isinstance(response, dict):
        if "body" in response:
            return _response_to_text(response["body"])
        if "content" in response:
            return _response_to_text(response["content"])
        if "text" in response:
            return _response_to_text(response["text"])
        return json.dumps(response, sort_keys=True, separators=(",", ":"))
    if hasattr(response, "body"):
        return _response_to_text(response.body)
    if hasattr(response, "content"):
        return _response_to_text(response.content)
    if hasattr(response, "text"):
        return _response_to_text(response.text)
    return str(response)


def _response_status_code(response) -> int:
    if isinstance(response, dict):
        if "status_code" in response:
            try:
                return int(response["status_code"])
            except Exception:
                return 0
        if "status" in response:
            try:
                return int(response["status"])
            except Exception:
                return 0
        return 200
    if hasattr(response, "status_code"):
        try:
            return int(getattr(response, "status_code"))
        except Exception:
            return 0
    if hasattr(response, "status"):
        try:
            return int(getattr(response, "status"))
        except Exception:
            return 0
    return 200


class Hedgix(gl.Contract):
    owner: str
    registry_url: str
    registry_version: str
    paused: bool
    next_protection_id: u256
    protections: TreeMap[str, str]
    user_protections: TreeMap[str, str]
    active_protection_ids: str
    pool_balance: u256
    reserved_liability: u256
    total_premiums_collected: u256
    total_payouts_paid: u256

    def __init__(self):
        self.owner = self._address_key(gl.message.sender_address)
        self.registry_url = DEFAULT_REGISTRY_URL
        self.registry_version = REGISTRY_VERSION
        self.paused = False
        self.next_protection_id = u256(1)
        self.protections = TreeMap()
        self.user_protections = TreeMap()
        self.active_protection_ids = "[]"
        self.pool_balance = u256(0)
        self.reserved_liability = u256(0)
        self.total_premiums_collected = u256(0)
        self.total_payouts_paid = u256(0)

    @gl.public.write.payable
    def create_historical_protection(
        self,
        protected_asset: str,
        protection_type: str,
        event_level: str,
        coverage_start_date: str,
        coverage_end_date: str,
    ) -> u256:
        self._require_not_paused()
        self._parse_date(coverage_start_date)
        self._parse_date(coverage_end_date)
        if self._date_to_ordinal(coverage_start_date) > self._date_to_ordinal(
            coverage_end_date
        ):
            raise gl.vm.UserError("INVALID_COVERAGE_DATES")

        reference_date = self._add_days(coverage_start_date, -1)
        terms = self._load_product_terms(protected_asset, protection_type, event_level)
        if "premium_wei" not in terms or "payout_wei" not in terms:
            raise gl.vm.UserError("INVALID_REGISTRY_RESPONSE")
        try:
            premium_wei = u256(int(str(terms["premium_wei"])))
            payout_wei = u256(int(str(terms["payout_wei"])))
        except Exception:
            raise gl.vm.UserError("INVALID_REGISTRY_RESPONSE")
        if gl.message.value != premium_wei:
            raise gl.vm.UserError("INVALID_PREMIUM")
        if self._available_to_reserve_after_credit(premium_wei) < payout_wei:
            raise gl.vm.UserError("INSUFFICIENT_POOL_CAPACITY")

        reference_price_scaled = self._fetch_binance_kline_price_scaled(
            str(terms["binance_settlement_symbol"]), reference_date, "close"
        )
        trigger_price_scaled = self._calculate_trigger_price_scaled(
            terms, reference_price_scaled
        )
        if terms["protection_type"] == DEPEG_PROTECTION:
            if reference_price_scaled <= trigger_price_scaled:
                raise gl.vm.UserError("DEPEG_REFERENCE_PRICE_AT_OR_BELOW_TRIGGER")

        protection_id = self.next_protection_id
        protection = self._new_protection_record(
            protection_id,
            self._sender_key(),
            terms,
            reference_date,
            coverage_start_date,
            coverage_end_date,
            reference_price_scaled,
            trigger_price_scaled,
            premium_wei,
            payout_wei,
            payout_wei,
        )
        self._store_new_protection(protection)
        self.pool_balance = self.pool_balance + premium_wei
        self.reserved_liability = self.reserved_liability + payout_wei
        self.total_premiums_collected = self.total_premiums_collected + premium_wei
        self.next_protection_id = self.next_protection_id + u256(1)
        return protection_id

    @gl.public.write
    def settle_protection_day(
        self, protection_id: u256, settlement_date: str
    ) -> str:
        self._require_not_paused()
        key = self._protection_key(protection_id)
        protection = self._require_protection(key)
        self._require_protection_owner(protection)
        status = str(protection["status"])
        if status != STATUS_ACTIVE:
            raise gl.vm.UserError(self._inactive_status_error(status))

        self._validate_settlement_date(protection, settlement_date)
        trigger_price_scaled = self._int_record_field(protection, "trigger_price_scaled")
        daily_low_scaled = self._fetch_binance_kline_price_scaled(
            str(protection["binance_settlement_symbol"]), settlement_date, "low"
        )
        triggered = daily_low_scaled <= trigger_price_scaled
        resulting_status = STATUS_ACTIVE
        if triggered:
            resulting_status = STATUS_TRIGGERED
            protection["triggered_date"] = settlement_date
        elif settlement_date == str(protection["coverage_end_date"]):
            resulting_status = STATUS_EXPIRED
        release_amount = u256(0)
        if resulting_status == STATUS_EXPIRED:
            release_amount = self._u256_record_field(protection, "reserved_payout")
            if release_amount > self.reserved_liability:
                raise gl.vm.UserError("RESERVED_LIABILITY_UNDERFLOW")
            protection["reserved_payout"] = "0"

        protection["last_settled_date"] = settlement_date
        protection["last_daily_low_scaled"] = str(daily_low_scaled)
        protection["last_daily_low_display"] = self._scaled_price_to_display(
            daily_low_scaled
        )
        protection["status"] = resulting_status
        self._save_protection(key, protection)
        if release_amount > u256(0):
            self.reserved_liability = self.reserved_liability - release_amount
        if resulting_status != STATUS_ACTIVE:
            self._remove_active_protection_id(str(protection["protection_id"]))

        return self._dumps_json(
            {
                "protection_id": str(protection["protection_id"]),
                "settlement_date": settlement_date,
                "daily_low_scaled": str(daily_low_scaled),
                "daily_low_display": self._scaled_price_to_display(daily_low_scaled),
                "trigger_price_scaled": str(trigger_price_scaled),
                "trigger_price_display": str(protection["trigger_price_display"]),
                "triggered": triggered,
                "resulting_status": resulting_status,
            }
        )

    @gl.public.write
    def claim_payout(self, protection_id: u256) -> None:
        self._require_not_paused()
        key = self._protection_key(protection_id)
        protection = self._require_protection(key)
        self._require_protection_owner(protection)
        status = str(protection["status"])
        if status == STATUS_PAID:
            raise gl.vm.UserError("PAYOUT_ALREADY_PAID")
        if status != STATUS_TRIGGERED:
            raise gl.vm.UserError("PROTECTION_NOT_TRIGGERED")
        payout = self._u256_record_field(protection, "reserved_payout")
        if payout == u256(0):
            raise gl.vm.UserError("NO_RESERVED_PAYOUT")
        if payout > self.reserved_liability or payout > self.pool_balance:
            raise gl.vm.UserError("INSUFFICIENT_POOL_BALANCE")

        receiver = str(protection["owner"])
        protection["status"] = STATUS_PAID
        protection["paid_date"] = self._today_date()
        protection["reserved_payout"] = "0"
        self._save_protection(key, protection)
        self.reserved_liability = self.reserved_liability - payout
        self.pool_balance = self.pool_balance - payout
        self.total_payouts_paid = self.total_payouts_paid + payout
        _Recipient(Address(receiver)).emit_transfer(value=payout)

    @gl.public.write
    def cancel_protection(self, protection_id: u256) -> None:
        self._require_not_paused()
        key = self._protection_key(protection_id)
        protection = self._require_protection(key)
        self._require_protection_owner(protection)
        status = str(protection["status"])
        if status != STATUS_ACTIVE:
            raise gl.vm.UserError(self._inactive_status_error(status))
        release_amount = self._u256_record_field(protection, "reserved_payout")
        if release_amount > self.reserved_liability:
            raise gl.vm.UserError("RESERVED_LIABILITY_UNDERFLOW")
        protection["status"] = STATUS_CANCELLED
        protection["cancelled_date"] = self._today_date()
        protection["reserved_payout"] = "0"
        self._save_protection(key, protection)
        self._remove_active_protection_id(str(protection["protection_id"]))
        if release_amount > u256(0):
            self.reserved_liability = self.reserved_liability - release_amount

    @gl.public.write.payable
    def add_pool_funds(self) -> None:
        if gl.message.value == u256(0):
            raise gl.vm.UserError("INVALID_AMOUNT")
        self.pool_balance = self.pool_balance + gl.message.value

    @gl.public.write
    def withdraw_from_pool_gen(self, amount_gen: u256) -> None:
        self._require_owner()
        if amount_gen == u256(0):
            raise gl.vm.UserError("INVALID_AMOUNT")
        amount_wei = amount_gen * u256(GEN_WEI)
        if amount_wei > self._available_to_withdraw():
            raise gl.vm.UserError("WITHDRAW_EXCEEDS_AVAILABLE_BALANCE")
        self.pool_balance = self.pool_balance - amount_wei
        _Recipient(Address(self.owner)).emit_transfer(value=amount_wei)

    @gl.public.write
    def pause_contract(self) -> None:
        self._require_owner()
        if self.paused:
            raise gl.vm.UserError("CONTRACT_ALREADY_PAUSED")
        self.paused = True

    @gl.public.write
    def unpause_contract(self) -> None:
        self._require_owner()
        if not self.paused:
            raise gl.vm.UserError("CONTRACT_NOT_PAUSED")
        self.paused = False

    @gl.public.view
    def get_protection(self, protection_id: u256) -> str:
        return self._dumps_json(
            self._require_protection(self._protection_key(protection_id))
        )

    @gl.public.view
    def get_my_protection_ids(self) -> str:
        return self._dumps_json(
            self._get_protection_ids_for_owner(self._sender_key())
        )

    @gl.public.view
    def get_active_protection_ids(self) -> str:
        return self.active_protection_ids

    @gl.public.view
    def get_settlement_readiness(self, protection_id: u256) -> str:
        protection = self._require_protection(self._protection_key(protection_id))
        expected_date = self._expected_settlement_date(protection)
        status = str(protection["status"])
        if status != STATUS_ACTIVE:
            return self._dumps_json(
                {
                    "ready": False,
                    "reason": f"protection status is {status}",
                    "expected_settlement_date": expected_date,
                }
            )
        if expected_date == "":
            return self._dumps_json(
                {
                    "ready": False,
                    "reason": "coverage is fully settled",
                    "expected_settlement_date": "",
                }
            )
        return self._dumps_json(
            {
                "ready": True,
                "reason": "ready",
                "expected_settlement_date": expected_date,
            }
        )

    @gl.public.view
    def get_pool_status(self) -> str:
        return self._dumps_json(
            {
                "pool_balance": str(self.pool_balance),
                "reserved_liability": str(self.reserved_liability),
                "available_to_withdraw": str(self._available_to_withdraw()),
                "total_premiums_collected": str(self.total_premiums_collected),
                "total_payouts_paid": str(self.total_payouts_paid),
            }
        )

    @gl.public.view
    def get_owner(self) -> str:
        return self.owner

    @gl.public.view
    def is_paused(self) -> bool:
        return self.paused

    @gl.public.view
    def get_registry_url(self) -> str:
        return self.registry_url

    @gl.public.view
    def get_registry_version(self) -> str:
        return self.registry_version

    def _new_protection_record(
        self,
        protection_id: u256,
        owner: str,
        terms: typing.Any,
        reference_date: str,
        coverage_start_date: str,
        coverage_end_date: str,
        reference_price_scaled: int,
        trigger_price_scaled: int,
        premium_paid: u256,
        payout_amount: u256,
        reserved_payout: u256,
    ) -> typing.Any:
        return {
            "protection_id": str(protection_id),
            "owner": owner,
            "protection_type": str(terms["protection_type"]),
            "protected_asset": str(terms["protected_asset"]),
            "binance_settlement_symbol": str(terms["binance_settlement_symbol"]),
            "event_level": str(terms["event_level"]),
            "reference_date": reference_date,
            "coverage_start_date": coverage_start_date,
            "coverage_end_date": coverage_end_date,
            "premium_paid": str(premium_paid),
            "payout_amount": str(payout_amount),
            "reserved_payout": str(reserved_payout),
            "reference_price_scaled": str(reference_price_scaled),
            "reference_price_display": self._scaled_price_to_display(
                reference_price_scaled
            ),
            "trigger_price_scaled": str(trigger_price_scaled),
            "trigger_price_display": self._scaled_price_to_display(
                trigger_price_scaled
            ),
            "trigger_metric": "daily_low_scaled",
            "trigger_operator": "<=",
            "last_settled_date": "",
            "last_daily_low_scaled": "",
            "last_daily_low_display": "",
            "triggered_date": "",
            "cancelled_date": "",
            "paid_date": "",
            "status": STATUS_ACTIVE,
            "created_at": self._now_iso(),
            "is_historical_test": True,
        }

    def _store_new_protection(self, protection: typing.Any) -> None:
        key = self._protection_key_from_string(str(protection["protection_id"]))
        owner = str(protection["owner"])
        protection_id = str(protection["protection_id"])
        self.protections[key] = self._dumps_json(protection)
        user_ids = self._get_protection_ids_for_owner(owner)
        if not self._contains_id(user_ids, protection_id):
            user_ids.append(protection_id)
        self.user_protections[owner] = self._dumps_json(user_ids)
        active_ids = self._loads_json_list(self.active_protection_ids)
        if not self._contains_id(active_ids, protection_id):
            active_ids.append(protection_id)
        self.active_protection_ids = self._dumps_json(active_ids)

    def _save_protection(self, key: str, protection: typing.Any) -> None:
        self.protections[key] = self._dumps_json(protection)

    def _remove_active_protection_id(self, protection_id: str) -> None:
        active_ids = self._loads_json_list(self.active_protection_ids)
        self.active_protection_ids = self._dumps_json(
            self._remove_id(active_ids, protection_id)
        )

    def _load_product_terms(
        self, protected_asset: str, protection_type: str, event_level: str
    ) -> typing.Any:
        requested_type = self._normalize_product_type(protection_type)
        requested_asset = protected_asset.strip().upper()
        requested_level = self._normalize_label(event_level)
        registry_url = self.registry_url
        registry_version = self.registry_version

        def fetch_selected_terms_text() -> str:
            response = gl.nondet.web.get(registry_url)
            status_code = _response_status_code(response)
            if status_code != 200:
                raise gl.vm.UserError("REGISTRY_FETCH_FAILED")
            response_text = _response_to_text(response)
            if response_text == "":
                raise gl.vm.UserError("INVALID_REGISTRY_RESPONSE")
            try:
                registry = json.loads(response_text, parse_float=str)
            except Exception:
                raise gl.vm.UserError("INVALID_REGISTRY_RESPONSE")
            metadata = registry.get("metadata", {})
            if metadata.get("registry_name") != REGISTRY_NAME:
                raise gl.vm.UserError("INVALID_REGISTRY_RESPONSE")
            if metadata.get("registry_version") != registry_version:
                raise gl.vm.UserError("INVALID_REGISTRY_RESPONSE")
            if metadata.get("network") != NETWORK_NAME:
                raise gl.vm.UserError("INVALID_REGISTRY_RESPONSE")
            if metadata.get("app_name") != APP_NAME:
                raise gl.vm.UserError("INVALID_REGISTRY_RESPONSE")
            if metadata.get("status") != "draft":
                raise gl.vm.UserError("INVALID_REGISTRY_RESPONSE")
            product = self._find_product(registry, requested_type)
            asset = self._find_supported_asset(product, requested_asset)
            level = self._find_event_level(product, requested_level)
            symbol = str(asset.get("binance_settlement_symbol", "")).upper()
            if symbol == "":
                raise gl.vm.UserError("UNSUPPORTED_BINANCE_SYMBOL")
            selected_terms = {
                "protection_type": requested_type,
                "protected_asset": str(asset.get("asset", "")).upper(),
                "event_level": str(level.get("name", "")),
                "binance_settlement_symbol": symbol,
            }
            if "premium" in level:
                selected_terms["premium_wei"] = str(
                    self._gen_amount_to_wei(level.get("premium", {}))
                )
            if "payout" in level:
                selected_terms["payout_wei"] = str(
                    self._gen_amount_to_wei(level.get("payout", {}))
                )
            self._apply_trigger_terms(selected_terms, level.get("trigger_rule", {}))
            return json.dumps(selected_terms, sort_keys=True, separators=(",", ":"))

        selected_terms_text = gl.eq_principle.strict_eq(fetch_selected_terms_text)
        try:
            selected_terms = json.loads(selected_terms_text)
        except Exception:
            raise gl.vm.UserError("INVALID_REGISTRY_RESPONSE")
        if not isinstance(selected_terms, dict):
            raise gl.vm.UserError("INVALID_REGISTRY_RESPONSE")
        return self._parse_selected_terms(
            selected_terms, requested_type, requested_asset, requested_level
        )

    def _find_product(self, registry: typing.Any, protection_type: str) -> typing.Any:
        for product in registry.get("protection_products", []):
            if self._normalize_product_type(str(product.get("protection_type", ""))) == protection_type:
                return product
        raise gl.vm.UserError("UNSUPPORTED_PROTECTION_TYPE")

    def _find_supported_asset(self, product: typing.Any, asset: str) -> typing.Any:
        for supported_asset in product.get("supported_assets", []):
            if str(supported_asset.get("asset", "")).upper() == asset:
                return supported_asset
        raise gl.vm.UserError("UNSUPPORTED_ASSET")

    def _find_event_level(self, product: typing.Any, event_level: str) -> typing.Any:
        for level in product.get("event_levels", []):
            if self._normalize_label(str(level.get("name", ""))) == event_level:
                return level
        raise gl.vm.UserError("UNSUPPORTED_EVENT_LEVEL")

    def _apply_trigger_terms(
        self, selected_terms: typing.Any, trigger_rule: typing.Any
    ) -> None:
        metric = str(trigger_rule.get("metric", ""))
        operator = str(trigger_rule.get("operator", ""))
        if selected_terms["protection_type"] == PRICE_DROP_PROTECTION:
            if metric != "price_drop_percent" or operator != ">=":
                raise gl.vm.UserError("INVALID_TRIGGER_RULE")
            if "threshold_percent" not in trigger_rule:
                raise gl.vm.UserError("INVALID_TRIGGER_RULE")
            selected_terms["drop_basis_points"] = str(
                self._parse_percent_to_basis_points(trigger_rule.get("threshold_percent"))
            )
            return
        if selected_terms["protection_type"] == DEPEG_PROTECTION:
            if metric != "settlement_price_usd" or operator not in ["<", "<="]:
                raise gl.vm.UserError("INVALID_TRIGGER_RULE")
            if "threshold" not in trigger_rule:
                raise gl.vm.UserError("INVALID_TRIGGER_RULE")
            selected_terms["depeg_threshold_scaled"] = str(
                self._parse_scaled_price(str(trigger_rule.get("threshold")))
            )
            return
        raise gl.vm.UserError("UNSUPPORTED_PROTECTION_TYPE")

    def _parse_selected_terms(
        self,
        data: typing.Any,
        requested_type: str,
        requested_asset: str,
        requested_level: str,
    ) -> typing.Any:
        returned_type = self._normalize_product_type(str(data.get("protection_type", "")))
        returned_asset = str(data.get("protected_asset", "")).upper()
        returned_level = self._normalize_label(str(data.get("event_level", "")))
        if returned_type != requested_type:
            raise gl.vm.UserError("REGISTRY_TERMS_MISMATCH")
        if returned_asset != requested_asset:
            raise gl.vm.UserError("REGISTRY_TERMS_MISMATCH")
        if returned_level != requested_level:
            raise gl.vm.UserError("REGISTRY_TERMS_MISMATCH")
        symbol = str(data.get("binance_settlement_symbol", "")).upper()
        if symbol == "":
            raise gl.vm.UserError("UNSUPPORTED_BINANCE_SYMBOL")
        terms = {
            "protection_type": returned_type,
            "protected_asset": returned_asset,
            "event_level": str(data.get("event_level", "")),
            "binance_settlement_symbol": symbol,
        }
        if "premium_wei" not in data or "payout_wei" not in data:
            raise gl.vm.UserError("INVALID_REGISTRY_RESPONSE")
        try:
            int(str(data["premium_wei"]))
            int(str(data["payout_wei"]))
        except Exception:
            raise gl.vm.UserError("INVALID_REGISTRY_RESPONSE")
        terms["premium_wei"] = str(data["premium_wei"])
        terms["payout_wei"] = str(data["payout_wei"])
        if returned_type == PRICE_DROP_PROTECTION:
            if "drop_basis_points" not in data:
                raise gl.vm.UserError("INVALID_TRIGGER_RULE")
            try:
                terms["drop_basis_points"] = int(str(data["drop_basis_points"]))
            except Exception:
                raise gl.vm.UserError("INVALID_TRIGGER_RULE")
            return terms
        if returned_type == DEPEG_PROTECTION:
            if "depeg_threshold_scaled" not in data:
                raise gl.vm.UserError("INVALID_TRIGGER_RULE")
            try:
                terms["depeg_threshold_scaled"] = int(
                    str(data["depeg_threshold_scaled"])
                )
            except Exception:
                raise gl.vm.UserError("INVALID_TRIGGER_RULE")
            return terms
        raise gl.vm.UserError("UNSUPPORTED_PROTECTION_TYPE")

    def _calculate_trigger_price_scaled(
        self, terms: typing.Any, reference_price_scaled: int
    ) -> int:
        if terms["protection_type"] == PRICE_DROP_PROTECTION:
            drop_basis_points = int(terms["drop_basis_points"])
            return (
                reference_price_scaled
                * (BPS_DENOMINATOR - drop_basis_points)
            ) // BPS_DENOMINATOR
        return int(terms["depeg_threshold_scaled"])

    def _fetch_binance_kline_price_scaled(
        self, symbol: str, date_text: str, price_field: str
    ) -> int:
        start_ms = self._date_to_ms(date_text)
        end_ms = start_ms + DAY_MS - 1
        result = self._fetch_binance_kline_evidence(
            symbol, "1d", start_ms, end_ms, price_field
        )
        return int(result["price_scaled"])

    def _fetch_binance_kline_evidence(
        self,
        symbol: str,
        interval: str,
        start_ms: int,
        end_ms: int,
        price_field: str,
    ) -> typing.Any:
        if price_field == "close":
            price_index = 4
        elif price_field == "low":
            price_index = 3
        else:
            raise gl.vm.UserError("UNSUPPORTED_BINANCE_PRICE_FIELD")
        url = (
            f"{BINANCE_BASE_URL}/api/v3/klines?symbol={symbol}&interval={interval}"
            f"&startTime={start_ms}&endTime={end_ms}&limit=1"
        )

        def leader_fn() -> typing.Any:
            response = gl.nondet.web.get(url)
            status_code = _response_status_code(response)
            if status_code != 200:
                raise gl.vm.UserError("BINANCE_FETCH_FAILED")
            response_text = _response_to_text(response)
            if response_text == "":
                raise gl.vm.UserError("INVALID_BINANCE_RESPONSE")
            try:
                rows = json.loads(response_text)
            except Exception:
                raise gl.vm.UserError("INVALID_BINANCE_RESPONSE")
            if not isinstance(rows, list) or len(rows) != 1:
                raise gl.vm.UserError("BINANCE_KLINE_MISSING")
            row = rows[0]
            if not isinstance(row, list) or len(row) <= max(6, price_index):
                raise gl.vm.UserError("INVALID_BINANCE_RESPONSE")
            try:
                open_time = int(row[0])
                close_time = int(row[6])
                price_value = str(row[price_index])
            except Exception:
                raise gl.vm.UserError("INVALID_BINANCE_RESPONSE")
            if open_time != start_ms or close_time != end_ms:
                raise gl.vm.UserError("INVALID_BINANCE_RESPONSE")
            price_scaled = self._parse_scaled_price(price_value)
            return {
                "symbol": symbol,
                "interval": interval,
                "start_ms": str(start_ms),
                "end_ms": str(end_ms),
                "open_time": str(open_time),
                "close_time": str(close_time),
                "price_field": price_field,
                "price_scaled": str(price_scaled),
            }

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            try:
                validator_result = leader_fn()
                leader_data = leader_result.calldata
                for field in [
                    "symbol",
                    "interval",
                    "start_ms",
                    "end_ms",
                    "open_time",
                    "close_time",
                    "price_field",
                ]:
                    if leader_data[field] != validator_result[field]:
                        return False
                leader_price = int(leader_data["price_scaled"])
                validator_price = int(validator_result["price_scaled"])
                return abs(leader_price - validator_price) <= PRICE_TOLERANCE_SCALED
            except Exception:
                return False

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        if "price_scaled" not in result:
            raise gl.vm.UserError("NONDETERMINISTIC_RESULT_REJECTED")
        return result

    def _validate_settlement_date(
        self, protection: typing.Any, settlement_date: str
    ) -> None:
        self._parse_date(settlement_date)
        settlement_ordinal = self._date_to_ordinal(settlement_date)
        start_ordinal = self._date_to_ordinal(str(protection["coverage_start_date"]))
        end_ordinal = self._date_to_ordinal(str(protection["coverage_end_date"]))
        if settlement_ordinal < start_ordinal:
            raise gl.vm.UserError("SETTLEMENT_DATE_BEFORE_COVERAGE_START")
        if settlement_ordinal > end_ordinal:
            raise gl.vm.UserError("SETTLEMENT_DATE_AFTER_COVERAGE_END")
        expected_date = self._expected_settlement_date(protection)
        if settlement_date != expected_date:
            raise gl.vm.UserError("SETTLEMENT_DATE_NOT_SEQUENTIAL")

    def _expected_settlement_date(self, protection: typing.Any) -> str:
        if str(protection["status"]) != STATUS_ACTIVE:
            return ""
        last_settled_date = str(protection["last_settled_date"])
        if last_settled_date == "":
            return str(protection["coverage_start_date"])
        return self._add_days(last_settled_date, 1)

    def _date_to_ms(self, date_text: str) -> int:
        parsed = self._parse_date(date_text)
        start = datetime.datetime(
            parsed.year,
            parsed.month,
            parsed.day,
            tzinfo=datetime.timezone.utc,
        )
        return int(start.timestamp() * 1000)

    def _parse_date(self, date_text: str) -> datetime.date:
        if len(date_text) != 10:
            raise gl.vm.UserError("INVALID_DATE_FORMAT")
        if date_text[4] != "-" or date_text[7] != "-":
            raise gl.vm.UserError("INVALID_DATE_FORMAT")
        try:
            return datetime.date.fromisoformat(date_text)
        except Exception:
            raise gl.vm.UserError("INVALID_DATE_FORMAT")

    def _add_days(self, date_text: str, days: int) -> str:
        parsed = self._parse_date(date_text)
        return (parsed + datetime.timedelta(days=days)).isoformat()

    def _today_date(self) -> str:
        return self._date_from_datetime_text(self._message_datetime_text())

    def _date_to_ordinal(self, date_text: str) -> int:
        return self._parse_date(date_text).toordinal()

    def _now_iso(self) -> str:
        return self._message_datetime_text()

    def _message_datetime_text(self) -> str:
        return str(gl.message_raw["datetime"])

    def _date_from_datetime_text(self, datetime_text: str) -> str:
        text = str(datetime_text)
        if len(text) < 10:
            raise gl.vm.UserError("INVALID_TRANSACTION_DATETIME")
        date_text = text[:10]
        self._parse_date(date_text)
        return date_text

    def _parse_scaled_price(self, value: str) -> int:
        text = value.strip()
        if text == "" or text.startswith("-"):
            raise gl.vm.UserError("PRICE_PARSE_FAILED")
        parts = text.split(".")
        if len(parts) > 2:
            raise gl.vm.UserError("PRICE_PARSE_FAILED")
        try:
            whole = int(parts[0]) if parts[0] != "" else 0
            fraction = ""
            if len(parts) == 2:
                fraction = parts[1]
            fraction = (fraction + "00000000")[:8]
            return whole * PRICE_SCALE + int(fraction)
        except Exception:
            raise gl.vm.UserError("PRICE_PARSE_FAILED")

    def _scaled_price_to_display(self, price_scaled: int) -> str:
        try:
            value = int(price_scaled)
        except Exception:
            raise gl.vm.UserError("PRICE_PARSE_FAILED")
        if value < 0:
            raise gl.vm.UserError("PRICE_PARSE_FAILED")
        whole = value // PRICE_SCALE
        fraction = value % PRICE_SCALE
        if fraction == 0:
            return str(whole)
        return f"{whole}.{str(fraction).rjust(8, '0').rstrip('0')}"

    def _parse_percent_to_basis_points(self, value: typing.Any) -> int:
        text = str(value).strip()
        if text.endswith("%"):
            text = text[:-1]
        if text.startswith("-") or text == "":
            raise gl.vm.UserError("INVALID_TRIGGER_RULE")
        parts = text.split(".")
        if len(parts) > 2:
            raise gl.vm.UserError("INVALID_TRIGGER_RULE")
        try:
            whole = int(parts[0]) if parts[0] != "" else 0
            fraction = ""
            if len(parts) == 2:
                fraction = parts[1]
            fraction = (fraction + "00")[:2]
            return whole * 100 + int(fraction)
        except Exception:
            raise gl.vm.UserError("INVALID_TRIGGER_RULE")

    def _gen_amount_to_wei(self, amount_record: typing.Any) -> u256:
        if amount_record.get("token") != "GEN":
            raise gl.vm.UserError("INVALID_REGISTRY_RESPONSE")
        amount = str(amount_record.get("amount", "")).strip()
        if amount == "" or "." in amount:
            raise gl.vm.UserError("INVALID_REGISTRY_RESPONSE")
        try:
            return u256(int(amount)) * u256(GEN_WEI)
        except Exception:
            raise gl.vm.UserError("INVALID_REGISTRY_RESPONSE")

    def _available_to_reserve_after_credit(self, credit: u256) -> u256:
        credited_balance = self.pool_balance + credit
        if credited_balance <= self.reserved_liability:
            return u256(0)
        return credited_balance - self.reserved_liability

    def _available_to_withdraw(self) -> u256:
        if self.pool_balance <= self.reserved_liability:
            return u256(0)
        return self.pool_balance - self.reserved_liability

    def _normalize_product_type(self, value: str) -> str:
        normalized = self._normalize_label(value)
        if normalized in ["price_drop", "price_drop_protection"]:
            return PRICE_DROP_PROTECTION
        if normalized in ["depeg", "depeg_protection"]:
            return DEPEG_PROTECTION
        return normalized

    def _normalize_label(self, value: str) -> str:
        return value.strip().lower().replace("-", "_").replace(" ", "_")

    def _protection_key(self, protection_id: u256) -> str:
        if protection_id == u256(0):
            raise gl.vm.UserError("INVALID_PROTECTION_ID")
        return str(protection_id)

    def _protection_key_from_string(self, protection_id: str) -> str:
        key = str(protection_id).strip()
        if key == "" or key == "0":
            raise gl.vm.UserError("INVALID_PROTECTION_ID")
        return key

    def _sender_key(self) -> str:
        return self._address_key(gl.message.sender_address)

    def _address_key(self, address: typing.Any) -> str:
        return self._normalize_address(str(address))

    def _normalize_address(self, address: str) -> str:
        normalized = str(address).strip().lower()
        if not self._is_valid_address(normalized):
            raise gl.vm.UserError("INVALID_ADDRESS")
        return normalized

    def _is_valid_address(self, address: str) -> bool:
        text = str(address).strip().lower()
        if len(text) != 42 or not text.startswith("0x"):
            return False
        for char in text[2:]:
            if char not in "0123456789abcdef":
                return False
        return True

    def _get_protection_ids_for_owner(self, owner: str) -> typing.Any:
        owner_key = self._normalize_address(owner)
        if owner_key not in self.user_protections:
            return []
        return self._loads_json_list(self.user_protections[owner_key])

    def _require_protection(self, key: str) -> typing.Any:
        if key not in self.protections:
            raise gl.vm.UserError("PROTECTION_NOT_FOUND")
        protection = self._loads_json_object(self.protections[key])
        if str(protection.get("protection_id", "")) == "":
            raise gl.vm.UserError("PROTECTION_NOT_FOUND")
        return protection

    def _require_not_paused(self) -> None:
        if self.paused:
            raise gl.vm.UserError("CONTRACT_PAUSED")

    def _require_owner(self) -> None:
        if self._sender_key() != self.owner:
            raise gl.vm.UserError("NOT_OWNER")

    def _require_protection_owner(self, protection: typing.Any) -> None:
        if self._sender_key() != str(protection["owner"]):
            raise gl.vm.UserError("NOT_PROTECTION_OWNER")

    def _inactive_status_error(self, status: str) -> str:
        if status == STATUS_TRIGGERED:
            return "PROTECTION_ALREADY_TRIGGERED"
        if status == STATUS_PAID:
            return "PROTECTION_ALREADY_PAID"
        if status == STATUS_EXPIRED:
            return "PROTECTION_ALREADY_EXPIRED"
        if status == STATUS_CANCELLED:
            return "PROTECTION_ALREADY_CANCELLED"
        return "PROTECTION_NOT_ACTIVE"

    def _int_record_field(self, record: typing.Any, field_name: str) -> int:
        try:
            return int(str(record[field_name]))
        except Exception:
            raise gl.vm.UserError("INVALID_STORED_JSON")

    def _u256_record_field(self, record: typing.Any, field_name: str) -> u256:
        try:
            return u256(int(str(record[field_name])))
        except Exception:
            raise gl.vm.UserError("INVALID_STORED_JSON")

    def _loads_json_object(self, value: str) -> typing.Any:
        if str(value).strip() == "":
            return {}
        try:
            result = json.loads(value)
        except Exception:
            raise gl.vm.UserError("INVALID_STORED_JSON")
        if not isinstance(result, dict):
            raise gl.vm.UserError("INVALID_STORED_JSON")
        return result

    def _loads_json_list(self, value: str) -> typing.Any:
        if str(value).strip() == "":
            return []
        try:
            result = json.loads(value)
        except Exception:
            raise gl.vm.UserError("INVALID_STORED_JSON")
        if not isinstance(result, list):
            raise gl.vm.UserError("INVALID_STORED_JSON")
        return result

    def _dumps_json(self, value: typing.Any) -> str:
        try:
            return json.dumps(value, sort_keys=True, separators=(",", ":"))
        except Exception:
            raise gl.vm.UserError("JSON_SERIALIZATION_FAILED")

    def _contains_id(self, ids: typing.Any, item_id: str) -> bool:
        target = str(item_id)
        for current_id in ids:
            if str(current_id) == target:
                return True
        return False

    def _remove_id(self, ids: typing.Any, item_id: str) -> typing.Any:
        target = str(item_id)
        result = []
        for current_id in ids:
            if str(current_id) != target:
                result.append(str(current_id))
        return result
