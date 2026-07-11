# Studio Debugging Notes

Date: 2026-07-09

## Final Diagnosis

GenLayer Studio accepted Hedgix deploy transactions but could not load the contract method surface. Earlier local validation passed, so the issue was isolated as a Studio/runtime compatibility problem rather than a missing runner comment.

Confirmed Studio test results:

- A simple GenLayer contract worked in Studio.
- Hedgix and earlier Hedgix-shaped probes failed to load methods.
- `DynArray` failed in Studio.
- `TreeMap` plus counter indexing also failed in Studio.
- Parametrix/Genatio-style storage worked in Studio.

The production Hedgix contract was therefore refactored to the Studio-compatible storage pattern that worked:

- `TreeMap[str, str]` for large records.
- JSON strings for protection records, per-user ID lists, active ID list, and settlement history.
- Public complex read methods return `str` JSON.
- Owner/operator/protection-owner addresses are stored as normalized strings.
- `Address(...)` conversion happens only at transfer time.

This is a Studio-compatible MVP storage model. It is not the most granular storage design, but it avoids the confirmed Studio failures while preserving the Hedgix settlement and accounting logic.

## GenLayer Guidance Used

The installed GenLayer Dev guidance was used before editing:

- `genlayer-dev:write-contract`
  - Keep a pinned runner comment on line 1.
  - Declare persistent storage as class-level annotations.
  - Use GenLayer storage types instead of raw persistent Python dict/list fields.
  - Use `u256` for token accounting.
  - Use `gl.vm.UserError(...)` for business validation failures.
  - Validate with `genvm-lint check`.
- `genlayer-dev:genvm-lint`
  - Run `genvm-lint check`, `typecheck`, and `schema`.
  - Treat schema output as the contract ABI surface to inspect.
- `genlayer-dev:direct-tests` and `genlayer-dev:integration-tests`
  - Direct/integration execution tools were not available in this session.
  - Studio retesting remains the runtime compatibility check.

No live GenLayer MCP/tooling was used. Local callable tooling was `genvm-lint`.

## Why JSON Storage Was Used

The preferred GenLayer-native model would normally use typed `TreeMap`, `DynArray`, and storage-safe dataclasses. Studio testing showed that Hedgix's confirmed failing boundary was storage/schema compatibility, especially `DynArray` and indexed/nested collection patterns.

Full JSON storage was not chosen as a design preference. It was chosen because the Studio-compatible pattern that actually worked for comparable contracts stores large records as JSON strings in `TreeMap[str, str]`, while keeping contract-level accounting fields as native `u256` values.

Current split:

- Native storage remains for global scalar state and accounting:
  - `paused: bool`
  - `next_protection_id: u256`
  - `pool_balance: u256`
  - `reserved_liability: u256`
  - `total_premiums_collected: u256`
  - `total_payouts_paid: u256`
- JSON strings are used for variable-size record/list state:
  - protection records
  - user protection ID lists
  - active protection ID list
  - settlement history lists

## Why `emit_transfer` Stayed

`emit_transfer` is no longer the main suspect because Parametrix works in Studio while using the same GenLayer team recommended transfer style.

Hedgix keeps:

```python
@gl.evm.contract_interface
class _NativeRecipient:
    class View:
        pass

    class Write:
        pass
```

Transfers are emitted as:

```python
_NativeRecipient(Address(receiver_string)).emit_transfer(value=amount)
```

`claim_payout` updates protection/accounting state first, then emits transfer to the protection owner. `withdraw_from_pool` reduces pool balance first, then emits transfer to the owner.

Warning retained: `emit_transfer` does not expose a synchronous success/failure result to this contract, so the contract cannot synchronously detect a downstream transfer failure.

## Storage Model Before And After

Before:

- `owner: Address`
- `settlement_operator: Address`
- `@allow_storage Protection`
- `@allow_storage SettlementRecord`
- `protections: TreeMap[str, Protection]`
- `protection_owners: TreeMap[str, Address]`
- `user_protections: TreeMap[str, DynArray[u256]]`
- `active_protection_ids: DynArray[u256]`
- `settlement_history: TreeMap[str, DynArray[SettlementRecord]]`

After:

- `owner: str`
- `settlement_operator: str`
- `protections: TreeMap[str, str]`
- `protection_owners: TreeMap[str, str]`
- `user_protections: TreeMap[str, str]`
- `active_protection_ids: str`
- `settlement_history: TreeMap[str, str]`
- `paused: bool`
- `next_protection_id: u256`
- `pool_balance: u256`
- `reserved_liability: u256`
- `total_premiums_collected: u256`
- `total_payouts_paid: u256`

Removed complex schema/storage patterns:

- No `DynArray` remains.
- No `@allow_storage` dataclass remains.
- No public method returns `Address`.
- No public method returns `dict`.
- No public method returns `list`.
- No storage field uses `Address`.
- Protection owner/operator fields are normalized lowercase strings.

## Public Schema Shape

Complex reads now return JSON strings:

- `get_protection -> str`
- `get_my_protection_ids -> str`
- `get_my_protections -> str`
- `get_active_protection_ids -> str`
- `get_settlement_readiness -> str`
- `get_settlement_history -> str`
- `get_pool_status -> str`
- `get_price_source_summary -> str`

Scalar reads remain scalar:

- `get_registry_url -> str`
- `get_registry_version -> str`
- `get_owner -> str`
- `get_settlement_operator -> str`
- `is_paused -> bool`

Write return values:

- `purchase_protection -> u256`
- `create_historical_test_protection -> u256`
- `settle_protection_day -> str` JSON settlement record
- all other writes return `None`

## Catalog Compaction

`get_supported_summary` was removed to reduce source size for Studio deployment. The official Hedgix product catalog and terms already live in the registry at `get_registry_url()`.

For catalog/source metadata, the contract now exposes only:

- `get_registry_url`
- `get_registry_version`
- `get_price_source_summary`

Frontend display/catalog screens should fetch the registry directly. The contract still fetches the registry during `purchase_protection` and `create_historical_test_protection` to verify selected terms, premiums, payouts, trigger rules, supported durations, and Binance settlement symbols.

Line count:

- Before compaction: 1,357 lines.
- After compaction: 1,289 lines.

## Dashboard Read Compaction

A second compaction pass removed duplicate/convenience reads while keeping the reads needed for a real user dashboard.

Dashboard reads kept:

- `get_owner`
- `get_settlement_operator`
- `get_registry_url`
- `get_registry_version`
- `is_paused`
- `get_pool_status`
- `get_price_source_summary`
- `get_my_protection_ids`
- `get_my_protections`
- `get_protection`
- `get_settlement_history`
- `get_active_protection_ids`
- `get_settlement_readiness`

Duplicate/optional reads removed:

- `get_my_last_protection_id`
- `get_my_last_protection`
- `get_protection_owner`
- `get_active_protection_ids_paginated`
- `get_expected_settlement_date`

Reasons:

- `get_my_last_protection_id` and `get_my_last_protection` duplicate `get_my_protection_ids` / `get_my_protections`.
- `get_protection_owner` duplicates the `owner` field inside `get_protection`.
- `get_active_protection_ids_paginated` is not required for MVP Studio testing.
- `get_expected_settlement_date` duplicates data available through `get_settlement_readiness` and stored protection fields.

Line count after dashboard read compaction:

- Before this pass: 1,289 lines.
- After this pass: 1,242 lines.

## Reference Price Source Update

Before this update, Hedgix used Binance 5-minute kline close prices for both live purchase reference prices and historical test reference prices.

Current source model:

- Live purchase reference price: Binance latest ticker price from `/api/v3/ticker/price?symbol=...`.
- Historical test reference price: Binance 1-day candle close for `reference_date`.
- Settlement trigger price check: unchanged, Binance 1-day candle low for the caller-provided `settlement_date`.

The live ticker helper uses `gl.vm.run_nondet_unsafe` with custom numeric validator logic:

- Leader and validator independently fetch the ticker endpoint.
- Symbol must match exactly.
- Price must be present, parseable, and greater than zero.
- Source field must be `binance_ticker_price`.
- Leader and validator prices may differ by at most `LIVE_PRICE_TOLERANCE_BPS = 200`, which is 2%.

Historical testing flow remains aligned with the existing plan:

- `create_historical_test_protection` still uses the caller-provided `reference_date`.
- Historical test `created_at` now uses `T23:59:59+00:00` to match the 1-day reference close label.
- Coverage still starts the day after `reference_date`.
- `settle_protection_day` still uses the caller-provided `settlement_date`.
- Old Binance daily candles remain usable for historical tests.

Storage model was not changed by this reference-source update. No `DynArray` remains.

## FINISHED_WITH_ERROR Runtime Update

After Studio accepted Hedgix but historical-test transactions finished with execution error, the likely runtime causes were narrowed to response-body parsing and wall-clock datetime usage.

Parametrix-style response parsing was added through `_response_to_text(response)`. Registry, Binance ticker, and Binance kline fetches now use this helper instead of directly decoding `response.body`.

Studio then surfaced `FINISHED_WITH_ERROR` inside equivalence-principle outputs. The next likely runtime cause was direct `response.status_code` access inside nondeterministic web fetches, because GenLayer may return a string, dict, or response-like object without that attribute.

Parametrix-style safe status handling was added through `_response_status_code(response)`:

- dict responses use `status_code` or `status` when present
- response-like objects use `getattr(...)` for `status_code` or `status`
- responses without an exposed status default to `200`
- non-200 statuses still raise the existing fetch errors
- if status is absent, JSON/text parsing and shape validation decide validity

Direct `response.status_code` access was removed from registry, Binance ticker, and Binance kline fetch paths.

The next HedgixFlowProbe lesson was that strict equality on the entire registry JSON was too heavy and fragile. The working production flow is now:

- fetch the full Hedgix registry inside the nondeterministic function
- validate registry metadata inside that function
- filter only the selected product, asset, event level, duration, premium, payout, trigger terms, and Binance settlement symbol inside that function
- return only compact selected-terms JSON with sorted keys and compact separators
- call `gl.eq_principle.strict_eq(...)` on that compact selected-terms JSON
- fetch Binance prices separately through `gl.vm.run_nondet_unsafe`
- calculate trigger price after selected terms are agreed

The old `_load_registry` full-registry strict-equality helper was removed. The main contract no longer strict-equals the full registry body.

Datetime helpers now use the transaction context:

- `_today_date()` reads `gl.message_raw["datetime"]`, extracts the `YYYY-MM-DD` date, and validates it with the existing date parser.
- `_now_iso()` returns `gl.message_raw["datetime"]`.
- No `datetime.datetime.now(...)` usage remains.

No Hedgix business logic was changed by this update:

- registry URL and registry verification are unchanged
- live purchase still uses Binance ticker latest price with 2% tolerance
- historical test reference still uses Binance 1-day close
- settlement still uses Binance 1-day low
- storage remains `TreeMap[str, str]` plus JSON strings
- production dashboard read method set is unchanged
- `emit_transfer` remains unchanged

Temporary debug/probe public methods were removed from production:

- `debug_registry_terms`
- `debug_historical_reference_price`
- `get_runtime_source_summary`

Stored protection and settlement JSON records now keep scaled integer prices for contract math and add display strings for frontend readability:

- `purchase_reference_price_scaled` remains the internal reference price
- `purchase_reference_price_display` is the human-readable reference price
- `trigger_price_scaled` remains the internal trigger price
- `trigger_price_display` is the human-readable trigger price
- `daily_low_scaled` remains the internal settlement comparison value
- `daily_low_display` is the human-readable settlement low

All trigger calculations and settlement comparisons continue to use scaled integer values.

Line count after production cleanup: 1,367 lines.

## Business Logic Preserved

The refactor preserved Hedgix behavior:

- registry metadata and product-term verification
- Binance reference price fetch, now split between live ticker and historical 1-day close
- Binance settlement fetch
- price drop trigger calculation
- depeg trigger logic
- historical test protection creation
- sequential settlement rules
- duplicate/skipped/future settlement rejection
- pool accounting
- expiry liability release
- cancel liability release with no MVP refund
- triggered payout claim flow
- historical test positions remain not claimable
- owner/operator access control
- protection owner claim/cancel access control
- existing `UserError` codes

`_today_date` returns `YYYY-MM-DD` from `gl.message_raw["datetime"]`.

## Files Deleted

Temporary Studio diagnosis files were deleted:

- `contracts/HedgixStudioProbe_MinSchema.py`
- `contracts/HedgixStudioProbe_NoNativeTransfer.py`
- `contracts/HedgixStudioProbe_NoNondet.py`
- `contracts/studio_ladder/`
- generated `contracts/__pycache__/`

## Validation Results

Commands run:

```text
python3 -m py_compile contracts/Hedgix.py
genvm-lint check contracts/Hedgix.py --json
genvm-lint typecheck contracts/Hedgix.py --json
genvm-lint schema contracts/Hedgix.py --json
```

Results:

- `python3 -m py_compile contracts/Hedgix.py`: passed.
- `genvm-lint check contracts/Hedgix.py --json`: passed with `ok: true`; 24 methods, 13 view methods, 11 write methods. Only warning was `I200` that a newer runner is available.
- `genvm-lint typecheck contracts/Hedgix.py --json`: passed with `ok: true`; 0 errors, 0 warnings, 0 info.
- `genvm-lint schema contracts/Hedgix.py --json`: passed with `ok: true`.

Schema confirmation:

- No public method returns `Address`.
- No public method returns `dict`.
- No public method returns `list`.
- Complex public returns are `string`.
- No temporary debug/probe public methods remain.

## Studio Retest Steps

1. Open `contracts/Hedgix.py`.
2. Confirm line 1 is still:

```python
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
```

3. Paste/deploy the updated `Hedgix.py` in GenLayer Studio.
4. Wait for the deploy transaction receipt.
5. Confirm execution succeeded, not only `ACCEPTED` / `AGREE`.
6. Load the contract method panel.
7. If methods load, test these first:
   - `get_owner`
   - `get_pool_status`
   - `get_price_source_summary`
   - `get_registry_url`
   - `get_registry_version`
   - `add_pool_funds`
   - `create_historical_test_protection`
   - `get_my_protection_ids`
   - `get_my_protections`
   - `get_protection`
   - `get_settlement_readiness`
   - `get_settlement_history`

If Studio still fails to load methods after this storage refactor, the next suspect is not `DynArray`, nested storage, or public complex return schema; capture the exact new `gen_getContractCode` and `gen_getContractSchema` errors before changing logic again.
