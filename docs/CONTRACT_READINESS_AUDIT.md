# Hedgix Contract Readiness Audit

Audit date: 2026-07-08

## GenLayer Dev Plugin Status

- GenLayer Dev plugin status: installed and enabled as `genlayer-dev@genlayerlabs` version `1.1.3`.
- GenLayer Node plugin status: installed and enabled as `genlayernode@genlayerlabs` version `1.0.1`.
- GenLayer Dev guidance used: yes. The installed skill guidance was read from `/Users/jxson/.codex/plugins/cache/genlayerlabs/genlayer-dev/1.1.3/skills/write-contract/SKILL.md`.
- GenVM lint guidance used: yes. The installed skill guidance was read from `/Users/jxson/.codex/plugins/cache/genlayerlabs/genlayer-dev/1.1.3/skills/genvm-lint/SKILL.md`.
- Live callable GenLayer MCP/tools exposed in this session: no GenLayer MCP namespace or GenLayer app tools were exposed. `tool_search` surfaced Lovable app tools, not GenLayer tools.
- Local GenLayer CLI validation available: yes, `/opt/homebrew/bin/genvm-lint`.

## GenLayer Guidance Applied

- Kept the pinned runner dependency header and did not use `py-genlayer:test`, `latest`, or an unversioned runner.
- Checked persistent storage declarations for class-level annotations and GenLayer storage types.
- Kept user/business failures as `raise gl.vm.UserError("ERROR_CODE")`.
- Kept `return False` only inside nondeterministic validator logic.
- Used `gl.eq_principle.strict_eq` for the static registry JSON fetch.
- Used `gl.vm.run_nondet_unsafe` for Binance market data and strengthened validator-side comparison of stable fields and derived settlement decisions.
- Used `gl.message.sender_address` for caller identity and did not trust frontend-provided owner, user, price, threshold, premium, payout, or settlement result.

## Method Surface Checked

Write methods checked:

- `purchase_protection(protected_asset, protection_type, event_level, duration_days)`
- `settle_protection_day(protection_id, settlement_date)`
- `claim_payout(protection_id)`
- `cancel_protection(protection_id)`
- `add_pool_funds()`
- `withdraw_from_pool(amount)`
- `set_settlement_operator(operator_address)`
- `set_registry_url(new_registry_url)`
- `pause_contract()`
- `unpause_contract()`
- `create_historical_test_protection(protected_asset, protection_type, event_level, duration_days, reference_date)`

Read methods checked:

- `get_protection(protection_id)`
- `get_my_protection_ids()`
- `get_my_protections()`
- `get_my_last_protection_id()`
- `get_my_last_protection()`
- `get_protection_owner(protection_id)`
- `get_active_protection_ids()`
- `get_active_protection_ids_paginated(start, limit)`
- `get_settlement_readiness(protection_id)`
- `get_expected_settlement_date(protection_id)`
- `get_settlement_history(protection_id)`
- `get_pool_status()`
- `get_registry_url()`
- `get_registry_version()`
- `get_settlement_operator()`
- `get_owner()`
- `is_paused()`
- `get_supported_summary()`

## Storage Issues Found/Fixed

- Confirmed persistent contract fields are declared as class-level annotations.
- Confirmed persistent collections use GenLayer storage types: `TreeMap`, `DynArray`, `u256`, `Address`, and `@allow_storage` dataclasses.
- Fixed active-protection removal to avoid `DynArray.pop(index)`, which the SDK typechecker rejects. The contract now shifts entries and uses no-argument `pop()`.
- No raw Python `dict` or `list` is used for persistent contract storage.

## Error-Handling Issues Found/Fixed

- Confirmed normal user/business validation failures use `gl.vm.UserError` error codes.
- Fixed registry and Binance web response handling so a missing response body raises `INVALID_REGISTRY_RESPONSE` or `INVALID_BINANCE_RESPONSE` instead of risking a VM-level optional-body decode failure.
- Confirmed silent failure returns are not used in write methods.
- Confirmed `return False` remains confined to nondeterministic validator rejection paths.

## Nondeterminism and Equivalence Issues Found/Fixed

- Confirmed registry fetch uses `gl.eq_principle.strict_eq`, appropriate for exact static registry text.
- Confirmed Binance price reads use `gl.vm.run_nondet_unsafe` with independent validator fetches.
- Strengthened Binance evidence validation to compare symbol, interval, requested start/end window, open/close time, price field, scaled price tolerance, and expected response shape.
- Fixed settlement validation so validators compare `trigger_price_scaled` and the derived `triggered` decision, not only the raw daily low.

## Registry Verification Issues Found/Fixed

- Confirmed the default registry URL is `https://hedgix-market-registry.netlify.app/hedgix-market-protection-registry.v1.json`.
- Confirmed registry metadata is checked for name, version, network, app name, and status.
- Confirmed contract terms are loaded from the registry for protected asset, protection type, event level, duration, premium, payout, trigger rule, and Binance settlement symbol.
- Remaining governance warning: `set_registry_url` is owner-only but can point to another HTTPS registry that passes metadata checks. This is useful for registry migration, but it means registry URL governance must be treated as privileged.

## Binance Purchase and Settlement Issues Found/Fixed

- Purchase still uses the latest closed Binance 5-minute candle close as the reference price.
- Depeg purchase still rejects if the 5-minute reference price is already at or below the registry trigger.
- Price-drop trigger price still derives from the reference price and registry drop basis points.
- Depeg trigger price still comes directly from the registry threshold.
- Settlement still uses the closed Binance 1-day candle low.
- Fixed settlement consensus validation to include the trigger price and trigger decision.

## Coverage Date Issues Found/Fixed

- Confirmed coverage starts the next UTC day after purchase/reference date.
- Confirmed `coverage_end_date = coverage_start_date + duration_days - 1`.
- Confirmed first settlement date must equal `coverage_start_date`.
- Confirmed next settlement date must equal `last_settled_date + 1 day`.
- Confirmed duplicate, skipped, before-coverage, after-coverage, and not-yet-closed settlement dates are rejected.
- No code changes were needed for coverage sequencing.

## Pool Accounting Issues Found/Fixed

- Confirmed purchase reserves payout liability after premium credit and rejects insufficient pool capacity.
- Confirmed claim releases reserved liability, reduces pool balance, and increments total payouts.
- Confirmed cancel releases reserved liability with no MVP refund.
- Fixed expiry accounting: when the last covered day settles without a trigger, the contract now releases the expired protection's reserved liability and clears `reserved_payout`.
- Confirmed `withdraw_from_pool` uses only unreserved pool balance.
- Remaining transfer warning: `emit_transfer` does not expose a synchronous success/failure result here, so claim and withdrawal transfer failures cannot be fully handled inside the same write method.

## Historical Testing Issues Found/Fixed

- Confirmed `create_historical_test_protection` is owner/operator only.
- Confirmed it fetches historical Binance 5-minute reference data and does not use fake prices.
- Confirmed created test protections are marked `is_test_position = true`.
- Confirmed test positions are not claimable and do not reserve pool liability.
- Confirmed test positions can use the normal `settle_protection_day` path for historical settlement dates.
- No code changes were needed for historical test creation.

## Validation Results

- `python3 -m py_compile contracts/Hedgix.py`: passed.
- `genvm-lint check contracts/Hedgix.py --json`: passed lint and SDK validation. Output reported 29 methods, 18 view methods, 11 write methods.
- `genvm-lint typecheck contracts/Hedgix.py --json`: passed with no diagnostics.
- GenVM lint warning: a newer pinned runner is available, but the current contract remains pinned and lint-valid.

## Remaining Warnings

- Native GEN `emit_transfer` success/failure is not synchronously observable in this contract.
- No live GenLayer MCP tools were exposed in this Codex session; validation used the installed skill guidance and local `genvm-lint` CLI.
- Historical testing still depends on live Binance data availability for the chosen symbols and dates.
- Owner registry URL changes are privileged governance actions.

## Readiness

The contract is ready for historical testing by the owner or settlement operator. Use `create_historical_test_protection(...)` with a historical reference date, then settle closed historical coverage dates through `settle_protection_day(...)`.
