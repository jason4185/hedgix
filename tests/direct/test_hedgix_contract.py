import datetime
import json


GEN_WEI = 1_000_000_000_000_000_000
DAY_MS = 24 * 60 * 60 * 1000


def _date_to_ms(date_text):
    parsed = datetime.date.fromisoformat(date_text)
    return int(datetime.datetime(parsed.year, parsed.month, parsed.day, tzinfo=datetime.timezone.utc).timestamp() * 1000)


def _registry_body():
    return json.dumps(
        {
            "metadata": {
                "registry_name": "Hedgix Market Protection Registry",
                "registry_version": "v1",
                "network": "GenLayer Bradbury",
                "app_name": "Hedgix",
                "status": "draft",
            },
            "supported_durations": [
                {"label": "7 days", "duration_days": 7},
                {"label": "14 days", "duration_days": 14},
                {"label": "30 days", "duration_days": 30},
            ],
            "protection_products": [
                {
                    "protection_type": "depeg_protection",
                    "display_name": "Stablecoin Depeg Protection",
                    "supported_assets": [
                        {"asset": "USDT", "binance_settlement_symbol": "USDTUSD"},
                        {"asset": "USDC", "binance_settlement_symbol": "USDCUSD"},
                    ],
                    "event_levels": [
                        {
                            "name": "Soft Depeg",
                            "trigger_rule": {
                                "metric": "settlement_price_usd",
                                "operator": "<=",
                                "threshold": "0.998",
                            },
                            "premium": {"amount": 1, "token": "GEN"},
                            "payout": {"amount": 5, "token": "GEN"},
                        }
                    ],
                },
                {
                    "protection_type": "price_drop_protection",
                    "display_name": "Price Drop Protection",
                    "supported_assets": [
                        {"asset": "BTC", "binance_settlement_symbol": "BTCUSDT"}
                    ],
                    "event_levels": [
                        {
                            "name": "Protected Drop",
                            "trigger_rule": {
                                "metric": "price_drop_percent",
                                "operator": ">=",
                                "threshold_percent": "10",
                            },
                            "premium": {"amount": 2, "token": "GEN"},
                            "payout": {"amount": 8, "token": "GEN"},
                        }
                    ],
                },
            ],
        },
        separators=(",", ":"),
    )


def _production_registry_body():
    return json.dumps(
        {
            "metadata": {
                "registry_name": "Hedgix Market Protection Registry",
                "registry_version": "v1",
                "network": "GenLayer Bradbury",
                "app_name": "Hedgix",
                "status": "draft",
            },
            "supported_durations": [
                {"label": "7 days", "duration_days": 7},
                {"label": "14 days", "duration_days": 14},
                {"label": "30 days", "duration_days": 30},
            ],
            "protection_products": [
                {
                    "protection_type": "price_drop_protection",
                    "display_name": "Price Drop Protection",
                    "supported_assets": [
                        {"asset": "BTCUSDT", "binance_settlement_symbol": "BTCUSDT"}
                    ],
                    "event_levels": [
                        {
                            "name": "Protected Drop",
                            "trigger_rule": {
                                "metric": "price_drop_percent",
                                "operator": ">=",
                                "threshold_percent": "2",
                            },
                            "premium": {"amount": 1, "token": "GEN"},
                            "payout": {"amount": 2, "token": "GEN"},
                        }
                    ],
                },
                {
                    "protection_type": "depeg_protection",
                    "display_name": "Depeg Protection",
                    "supported_assets": [
                        {"asset": "USDT", "binance_settlement_symbol": "USDTUSD"},
                    ],
                    "event_levels": [
                        {
                            "name": "Soft Depeg",
                            "trigger_rule": {
                                "metric": "settlement_price_usd",
                                "operator": "<=",
                                "threshold": "0.998",
                            },
                            "premium": {"amount": 1, "token": "GEN"},
                            "payout": {"amount": 2, "token": "GEN"},
                        }
                    ],
                },
            ],
        },
        separators=(",", ":"),
    )


def _kline_body(date_text, low):
    start_ms = _date_to_ms(date_text)
    end_ms = start_ms + DAY_MS - 1
    return json.dumps(
        [[start_ms, "1.01000000", "1.02000000", low, "1.00000000", "1000", end_ms]]
    )


def _deploy_hedgix(direct_vm, direct_deploy, direct_owner):
    direct_vm.sender = direct_owner
    direct_vm.warp("2026-07-10T12:00:00Z")
    contract = direct_deploy("contract/Hedgix.py")
    direct_vm.mock_web(r".*hedgix-market-protection-registry\.v1\.json.*", {"status": 200, "body": _registry_body()})
    direct_vm.mock_web(r".*/api/v3/ticker/price\?symbol=USDTUSD.*", {"status": 200, "body": json.dumps({"symbol": "USDTUSD", "price": "1.00000000"})})
    direct_vm.mock_web(r".*/api/v3/ticker/price\?symbol=BTCUSDT.*", {"status": 200, "body": json.dumps({"symbol": "BTCUSDT", "price": "100.00000000"})})
    return contract


def _deploy_hedgix_with_production_registry(direct_vm, direct_deploy, direct_owner):
    direct_vm.sender = direct_owner
    direct_vm.warp("2026-07-10T12:00:00Z")
    contract = direct_deploy("contract/Hedgix.py")
    direct_vm.mock_web(r".*hedgix-market-protection-registry\.v1\.json.*", {"status": 200, "body": _production_registry_body()})
    return contract


def _fund_pool(direct_vm, contract, amount_wei=50 * GEN_WEI):
    direct_vm.value = amount_wei
    contract.add_pool_funds()
    direct_vm.value = 0


def _purchase_usdt(direct_vm, contract, buyer, value_wei=GEN_WEI):
    direct_vm.sender = buyer
    direct_vm.value = value_wei
    protection_id = contract.purchase_protection("USDT", "depeg_protection", "Soft Depeg", 7)
    direct_vm.value = 0
    return protection_id


def _purchase_btc(direct_vm, contract, buyer, value_wei=2 * GEN_WEI):
    direct_vm.sender = buyer
    direct_vm.value = value_wei
    protection_id = contract.purchase_protection("BTC", "price_drop_protection", "Protected Drop", 7)
    direct_vm.value = 0
    return protection_id


def test_purchase_valid_terms_creates_active_and_reserves_liability(direct_vm, direct_deploy, direct_owner, direct_alice):
    contract = _deploy_hedgix(direct_vm, direct_deploy, direct_owner)
    _fund_pool(direct_vm, contract)

    protection_id = _purchase_usdt(direct_vm, contract, direct_alice)
    protection = json.loads(contract.get_protection(protection_id))
    pool = json.loads(contract.get_pool_status())

    assert protection["status"] == "ACTIVE"
    assert protection["protected_asset"] == "USDT"
    assert protection["binance_settlement_symbol"] == "USDTUSD"
    assert protection["reference_price_scaled"] == "100000000"
    assert protection["trigger_price_scaled"] == "99800000"
    assert protection["reserved_payout"] == str(5 * GEN_WEI)
    assert pool["reserved_liability"] == str(5 * GEN_WEI)


def test_production_btc_and_usdt_trigger_calculations(direct_vm, direct_deploy, direct_owner, direct_alice):
    contract = _deploy_hedgix_with_production_registry(direct_vm, direct_deploy, direct_owner)
    _fund_pool(direct_vm, contract)
    direct_vm.mock_web(r".*/api/v3/ticker/price\?symbol=BTCUSDT.*", {"status": 200, "body": json.dumps({"symbol": "BTCUSDT", "price": "62287"})})
    direct_vm.sender = direct_alice
    direct_vm.value = GEN_WEI
    btc_id = contract.purchase_protection("BTCUSDT", "price_drop_protection", "Protected Drop", 7)
    direct_vm.value = 0
    btc = json.loads(contract.get_protection(btc_id))
    assert btc["reference_price_display"] == "62287"
    assert btc["trigger_price_display"] == "61041.26"
    assert btc["reserved_payout"] == str(2 * GEN_WEI)

    direct_vm.mock_web(r".*/api/v3/ticker/price\?symbol=USDTUSD.*", {"status": 200, "body": json.dumps({"symbol": "USDTUSD", "price": "0.99933"})})
    direct_vm.value = GEN_WEI
    usdt_id = contract.purchase_protection("USDT", "depeg_protection", "Soft Depeg", 7)
    direct_vm.value = 0
    usdt = json.loads(contract.get_protection(usdt_id))
    assert usdt["reference_price_display"] == "0.99933"
    assert usdt["trigger_price_display"] == "0.998"
    assert usdt["reserved_payout"] == str(2 * GEN_WEI)


def test_ticker_zero_and_negative_prices_are_rejected(direct_vm, direct_deploy, direct_owner, direct_alice):
    for price, error_code in [("0", "BINANCE_TICKER_PRICE_MISSING"), ("-1", "PRICE_PARSE_FAILED")]:
        direct_vm.clear_mocks()
        contract = _deploy_hedgix(direct_vm, direct_deploy, direct_owner)
        _fund_pool(direct_vm, contract)
        direct_vm.mock_web(r".*/api/v3/ticker/price\?symbol=USDTUSD.*", {"status": 200, "body": json.dumps({"symbol": "USDTUSD", "price": price})})
        with direct_vm.expect_revert(error_code):
            _purchase_usdt(direct_vm, contract, direct_alice)
        assert json.loads(contract.get_pool_status())["reserved_liability"] == "0"


def test_purchase_validation_rejects_bad_terms_and_capacity(direct_vm, direct_deploy, direct_owner, direct_alice):
    contract = _deploy_hedgix(direct_vm, direct_deploy, direct_owner)

    with direct_vm.expect_revert("INSUFFICIENT_POOL_CAPACITY"):
        _purchase_usdt(direct_vm, contract, direct_alice)

    _fund_pool(direct_vm, contract, 5 * GEN_WEI)

    with direct_vm.expect_revert("INVALID_PREMIUM"):
        _purchase_usdt(direct_vm, contract, direct_alice, 2 * GEN_WEI)
    with direct_vm.expect_revert("UNSUPPORTED_ASSET"):
        direct_vm.value = GEN_WEI
        contract.purchase_protection("DAI", "depeg_protection", "Soft Depeg", 7)
    with direct_vm.expect_revert("UNSUPPORTED_PROTECTION_TYPE"):
        direct_vm.value = GEN_WEI
        contract.purchase_protection("USDT", "unsupported", "Soft Depeg", 7)
    with direct_vm.expect_revert("UNSUPPORTED_EVENT_LEVEL"):
        direct_vm.value = GEN_WEI
        contract.purchase_protection("USDT", "depeg_protection", "Hard Depeg", 7)
    with direct_vm.expect_revert("UNSUPPORTED_DURATION"):
        direct_vm.value = GEN_WEI
        contract.purchase_protection("USDT", "depeg_protection", "Soft Depeg", 3)
    direct_vm.value = 0


def test_settlement_zero_price_is_rejected_before_state_change(direct_vm, direct_deploy, direct_owner, direct_alice):
    contract = _deploy_hedgix(direct_vm, direct_deploy, direct_owner)
    _fund_pool(direct_vm, contract)
    protection_id = _purchase_usdt(direct_vm, contract, direct_alice)
    direct_vm.warp("2026-07-12T12:00:00Z")
    direct_vm.mock_web(r".*/api/v3/klines.*USDTUSD.*", {"status": 200, "body": _kline_body("2026-07-11", "0.00000000")})

    with direct_vm.expect_revert("BINANCE_KLINE_PRICE_INVALID"):
        contract.settle_protection_day(protection_id, "2026-07-11")

    protection = json.loads(contract.get_protection(protection_id))
    assert protection["status"] == "ACTIVE"
    assert protection["last_settled_date"] == ""


def test_settlement_negative_price_is_rejected_before_state_change(direct_vm, direct_deploy, direct_owner, direct_alice):
    contract = _deploy_hedgix(direct_vm, direct_deploy, direct_owner)
    _fund_pool(direct_vm, contract)
    protection_id = _purchase_usdt(direct_vm, contract, direct_alice)
    direct_vm.warp("2026-07-12T12:00:00Z")
    direct_vm.mock_web(r".*/api/v3/klines.*USDTUSD.*", {"status": 200, "body": _kline_body("2026-07-11", "-0.01000000")})

    with direct_vm.expect_revert("PRICE_PARSE_FAILED"):
        contract.settle_protection_day(protection_id, "2026-07-11")

    protection = json.loads(contract.get_protection(protection_id))
    assert protection["status"] == "ACTIVE"
    assert protection["last_settled_date"] == ""


def test_settlement_trigger_boundaries(direct_vm, direct_deploy, direct_owner, direct_alice):
    for low, expected_status in [
        ("0.99800001", "ACTIVE"),
        ("0.99800000", "TRIGGERED"),
        ("0.99799999", "TRIGGERED"),
    ]:
        direct_vm.clear_mocks()
        contract = _deploy_hedgix(direct_vm, direct_deploy, direct_owner)
        _fund_pool(direct_vm, contract)
        protection_id = _purchase_usdt(direct_vm, contract, direct_alice)
        direct_vm.warp("2026-07-12T12:00:00Z")
        direct_vm.mock_web(r".*/api/v3/klines.*USDTUSD.*", {"status": 200, "body": _kline_body("2026-07-11", low)})

        result = json.loads(contract.settle_protection_day(protection_id, "2026-07-11"))
        protection = json.loads(contract.get_protection(protection_id))

        assert protection["status"] == expected_status
        assert result["triggered"] == (expected_status == "TRIGGERED")


def test_settlement_sequential_duplicate_future_and_outside_dates(direct_vm, direct_deploy, direct_owner, direct_alice):
    contract = _deploy_hedgix(direct_vm, direct_deploy, direct_owner)
    _fund_pool(direct_vm, contract)
    protection_id = _purchase_btc(direct_vm, contract, direct_alice)
    direct_vm.warp("2026-07-13T12:00:00Z")
    direct_vm.mock_web(r".*/api/v3/klines.*BTCUSDT.*", {"status": 200, "body": _kline_body("2026-07-11", "91.00000000")})

    contract.settle_protection_day(protection_id, "2026-07-11")

    with direct_vm.expect_revert("SETTLEMENT_DATE_NOT_SEQUENTIAL"):
        contract.settle_protection_day(protection_id, "2026-07-11")
    with direct_vm.expect_revert("SETTLEMENT_DATE_NOT_SEQUENTIAL"):
        contract.settle_protection_day(protection_id, "2026-07-13")
    with direct_vm.expect_revert("DAILY_CANDLE_NOT_CLOSED"):
        contract.settle_protection_day(protection_id, "2026-07-14")
    with direct_vm.expect_revert("SETTLEMENT_DATE_AFTER_COVERAGE_END"):
        contract.settle_protection_day(protection_id, "2026-07-18")


def test_final_day_expiry_releases_reserved_liability_and_active_id(direct_vm, direct_deploy, direct_owner, direct_alice):
    contract = _deploy_hedgix(direct_vm, direct_deploy, direct_owner)
    _fund_pool(direct_vm, contract)
    protection_id = _purchase_usdt(direct_vm, contract, direct_alice)
    for day in range(11, 18):
        settlement_date = f"2026-07-{day}"
        direct_vm.warp(f"2026-07-{day + 1}T12:00:00Z")
        direct_vm.mock_web(r".*/api/v3/klines.*USDTUSD.*", {"status": 200, "body": _kline_body(settlement_date, "0.99900000")})
        contract.settle_protection_day(protection_id, settlement_date)

    protection = json.loads(contract.get_protection(protection_id))
    pool = json.loads(contract.get_pool_status())
    active_ids = json.loads(contract.get_active_protection_ids())
    assert protection["status"] == "EXPIRED"
    assert protection["reserved_payout"] == "0"
    assert pool["reserved_liability"] == "0"
    assert str(protection_id) not in active_ids


def test_claim_cancel_pool_withdraw_and_reads(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    contract = _deploy_hedgix(direct_vm, direct_deploy, direct_owner)
    _fund_pool(direct_vm, contract)
    protection_id = _purchase_usdt(direct_vm, contract, direct_alice)

    with direct_vm.expect_revert("PROTECTION_NOT_TRIGGERED"):
        contract.claim_payout(protection_id)

    direct_vm.warp("2026-07-12T12:00:00Z")
    direct_vm.mock_web(r".*/api/v3/klines.*USDTUSD.*", {"status": 200, "body": _kline_body("2026-07-11", "0.99700000")})
    contract.settle_protection_day(protection_id, "2026-07-11")

    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("NOT_PROTECTION_OWNER"):
            contract.claim_payout(protection_id)

    with direct_vm.prank(direct_alice):
        contract.claim_payout(protection_id)

    paid = json.loads(contract.get_protection(protection_id))
    pool = json.loads(contract.get_pool_status())
    assert paid["status"] == "PAID"
    assert paid["reserved_payout"] == "0"
    assert pool["reserved_liability"] == "0"

    with direct_vm.prank(direct_alice):
        with direct_vm.expect_revert("PAYOUT_ALREADY_PAID"):
            contract.claim_payout(protection_id)

    with direct_vm.prank(direct_alice):
        second_id = _purchase_usdt(direct_vm, contract, direct_alice)
        contract.cancel_protection(second_id)
    cancelled = json.loads(contract.get_protection(second_id))
    assert cancelled["status"] == "CANCELLED"

    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("NOT_OWNER"):
            contract.withdraw_from_pool_gen(1)
    with direct_vm.prank(direct_owner):
        with direct_vm.expect_revert("INVALID_AMOUNT"):
            contract.withdraw_from_pool_gen(0)

    active_ids = json.loads(contract.get_active_protection_ids_paginated(0, 25))
    assert "protection_ids" in active_ids
    assert json.loads(contract.get_my_protection_ids()) == []


def test_owner_cannot_withdraw_reserved_liability(direct_vm, direct_deploy, direct_owner, direct_alice):
    contract = _deploy_hedgix(direct_vm, direct_deploy, direct_owner)
    _fund_pool(direct_vm, contract, 5 * GEN_WEI)
    _purchase_usdt(direct_vm, contract, direct_alice)

    with direct_vm.prank(direct_owner):
        with direct_vm.expect_revert("WITHDRAW_EXCEEDS_AVAILABLE_BALANCE"):
            contract.withdraw_from_pool_gen(1)


def test_settlement_operator_rejects_zero_address(direct_vm, direct_deploy, direct_owner):
    contract = _deploy_hedgix(direct_vm, direct_deploy, direct_owner)
    with direct_vm.expect_revert("INVALID_SETTLEMENT_OPERATOR"):
        contract.set_settlement_operator("0x0000000000000000000000000000000000000000")
