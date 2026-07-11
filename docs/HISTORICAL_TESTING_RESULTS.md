# Hedgix Historical Testing Results

Audit date: 2026-07-08

## GenLayer Testing Capability

- GenLayer Dev guidance used: yes.
- Skill files read before testing:
  - `/Users/jxson/.codex/plugins/cache/genlayerlabs/genlayer-dev/1.1.3/skills/direct-tests/SKILL.md`
  - `/Users/jxson/.codex/plugins/cache/genlayerlabs/genlayer-dev/1.1.3/skills/integration-tests/SKILL.md`
  - `/Users/jxson/.codex/plugins/cache/genlayerlabs/genlayer-dev/1.1.3/skills/genvm-lint/SKILL.md`
  - `/Users/jxson/.codex/plugins/cache/genlayerlabs/genlayer-dev/1.1.3/skills/write-contract/SKILL.md`
- Recommended approach applied: lint first, use direct mode for fast state/access/pool tests, use integration tests for real consensus and real web calls before deployment.
- Existing test folders/configs: none found.
- Available local tools: `genvm-lint`.
- Missing local test tools: `pytest`, `gltest`, `glsim`, importable `genlayer`, and importable `gltest`.
- Live GenLayer MCP/tools exposed in this Codex session: none.

Because direct-mode and integration tooling are not installed in this project shell, no `create_historical_test_protection(...)` transactions were executed. This pass verifies registry compatibility, Binance endpoint availability, historical expected outcomes from real Binance data, contract method schema, and static contract logic for settlement/access/accounting.

## Tested Endpoints

- Official registry: `https://hedgix-market-registry.netlify.app/hedgix-market-protection-registry.v1.json`
- Binance exchange info: `https://data-api.binance.vision/api/v3/exchangeInfo?symbol=...`
- Binance klines: `https://data-api.binance.vision/api/v3/klines?symbol=...&interval=...&startTime=...&endTime=...&limit=...`

## Tested Symbols

Latest 5-minute klines returned usable rows for all registry symbols:

| Symbol | Result |
| --- | --- |
| `BTCUSDT` | OK |
| `ETHUSDT` | OK |
| `SOLUSDT` | OK |
| `BNBUSDT` | OK |
| `USDTUSD` | OK |
| `USDCUSD` | OK |

`USDTUSD` and `USDCUSD` are supported by the selected Binance endpoint, but historical USD-pair kline coverage starts on 2025-11-18. The 2023 USDC depeg cannot be tested with the current registry's `USDCUSD` symbol on this endpoint.

## Registry Compatibility

- Remote registry fetch: passed.
- Remote registry equals local registry file byte-for-byte: yes.
- Registry metadata matches contract expectations: yes.
- Supported durations match MVP rules: `7`, `14`, `30`.
- Price Drop products exist for `BTCUSDT`, `ETHUSDT`, `SOLUSDT`, and `BNBUSDT`.
- Depeg products exist for `USDT` and `USDC`.
- MVP level values match:
  - Protected Drop: 10%, premium 1 GEN, payout 3 GEN.
  - Major Drop: 20%, premium 2 GEN, payout 6 GEN.
  - Crash Event: 30%, premium 3 GEN, payout 10 GEN.
  - Soft Depeg: 0.990, premium 1 GEN, payout 3 GEN.
  - Deep Depeg: 0.980, premium 2 GEN, payout 6 GEN.
  - Severe Depeg: 0.950, premium 3 GEN, payout 10 GEN.

## Historical Price Drop Cases

These are endpoint-derived expected outcomes using real Binance candles and the same scaled-integer trigger math as the contract.

| Case | Reference Date | Product | Reference Close | Trigger Price | First Trigger Date | Expected Status |
| --- | --- | --- | ---: | ---: | --- | --- |
| BTC triggered | 2020-03-11 | `BTCUSDT` Protected Drop | 7934.52000000 | 7141.06800000 | 2020-03-12 | `TRIGGERED` |
| BTC not triggered | 2024-01-01 | `BTCUSDT` Protected Drop | 44179.55000000 | 39761.59500000 | none | `EXPIRED` after 2024-01-08 |
| ETH triggered | 2020-03-11 | `ETHUSDT` Major Drop | 194.61000000 | 155.68800000 | 2020-03-12 | `TRIGGERED` |
| BNB triggered | 2021-05-18 | `BNBUSDT` Crash Event | 507.88000000 | 355.51600000 | 2021-05-19 | `TRIGGERED` |

Daily low checks:

- BTC triggered: 2020-03-12 low 4410.00000000 <= 7141.06800000.
- BTC not triggered: all lows from 2024-01-02 through 2024-01-08 stayed above 39761.59500000.
- ETH triggered: 2020-03-12 low 101.20000000 <= 155.68800000.
- BNB triggered: 2021-05-19 low 280.00000000 <= 355.51600000.

Actual contract execution status: not run in this shell because GenLayer direct/integration runtime is unavailable.

## Historical Depeg Cases

The 2023 USDC depeg was not testable against current registry symbols because `USDCUSD` kline history on the selected endpoint starts on 2025-11-18. The following real-data cases use available `USDCUSD` and `USDTUSD` candles.

| Case | Reference Date | Product | Reference Close | Trigger Price | Purchase Rejected By Ref? | First Trigger Date | Expected Status |
| --- | --- | --- | ---: | ---: | --- | --- | --- |
| USDC triggered | 2025-11-18 | `USDC` Deep Depeg | 1.00100000 | 0.98000000 | no | 2025-11-19 | `TRIGGERED` |
| USDT triggered | 2025-11-18 | `USDT` Severe Depeg | 1.00000000 | 0.95000000 | no | 2025-11-19 | `TRIGGERED` |
| USDC not triggered | 2026-06-01 | `USDC` Soft Depeg | 1.00000000 | 0.99000000 | no | none | `EXPIRED` after 2026-06-08 |
| USDT not triggered | 2026-06-01 | `USDT` Soft Depeg | 0.99900000 | 0.99000000 | no | none | `EXPIRED` after 2026-06-08 |

Daily low checks:

- USDC triggered: 2025-11-19 low 0.97500000 <= 0.98000000.
- USDT triggered: 2025-11-19 low 0.91510000 <= 0.95000000.
- USDC not triggered: all lows from 2026-06-02 through 2026-06-08 stayed above 0.99000000.
- USDT not triggered: all lows from 2026-06-02 through 2026-06-08 stayed above 0.99000000.

Actual contract execution status: not run in this shell because GenLayer direct/integration runtime is unavailable.

## Sequential Settlement Rules

Static contract check:

- Duplicate date rejected by `SETTLEMENT_DATE_DUPLICATE`.
- Skipped date rejected by `SETTLEMENT_DATE_NOT_SEQUENTIAL`.
- Before coverage start rejected by `SETTLEMENT_DATE_BEFORE_COVERAGE_START`.
- After coverage end rejected by `SETTLEMENT_DATE_AFTER_COVERAGE_END`.
- Current/future UTC date rejected by `SETTLEMENT_DATE_IN_FUTURE`.
- Settlement after non-active status rejected before fetching Binance data.

Actual contract execution status: not run because direct/integration runtime is unavailable.

## Pool Accounting Behavior

Static contract check:

- `add_pool_funds()` increases `pool_balance`.
- `purchase_protection(...)` credits premium, reserves payout liability, and increments `total_premiums_collected`.
- `cancel_protection(...)` releases reserved liability and does not refund premium.
- Expiry in `settle_protection_day(...)` releases reserved liability and clears `reserved_payout`.
- `claim_payout(...)` releases reserved liability, reduces pool balance, and increments `total_payouts_paid`.
- `withdraw_from_pool(amount)` uses `_available_to_withdraw()` and cannot withdraw reserved liability.

Actual contract execution status: not run because direct/integration runtime is unavailable.

## Access Control

Static contract check:

- Settlement requires owner or settlement operator.
- Historical test creation requires owner or settlement operator.
- Cancel requires protection owner.
- Claim requires protection owner and rejects test positions.
- Withdraw, pause, unpause, registry URL update, and settlement-operator update require owner.

Actual contract execution status: not run because direct/integration runtime is unavailable.

## Failures and Fixes

- No contract bug was found in this pass.
- No contract file changes were made.
- No registry changes were made.
- No fake prices were used.
- Data limitation found: `USDTUSD` and `USDCUSD` are supported, but usable USD-pair historical klines begin on 2025-11-18, so older depeg events such as the 2023 USDC depeg require a different Binance-supported symbol/endpoint if they must be tested historically.

## Validation Command Results

- `python3 -m py_compile contracts/Hedgix.py`: passed.
- `genvm-lint check contracts/Hedgix.py --json`: passed with `ok: true`; 29 methods, 18 view methods, 11 write methods.
- `genvm-lint typecheck contracts/Hedgix.py --json`: passed with `ok: true` and no diagnostics.
- `genvm-lint schema contracts/Hedgix.py --json`: passed and confirmed the required public method surface.
- GenVM warning: a newer pinned runner is available. The contract remains pinned and lint-valid.

## Remaining Risks

- Full direct-mode contract execution was not run because `pytest`, `genlayer`, and `genlayer-test` are not installed.
- Full integration/consensus testing was not run because `gltest`/`glsim` and a GenLayer runtime are not installed or configured.
- Binance latest candles include currently forming candles; settlement tests should use closed historical days only.
- Stablecoin USD-pair historical coverage is limited to dates on or after 2025-11-18 on the selected endpoint.
- `emit_transfer` success/failure is not synchronously observable in the contract.

## Deployment Readiness

Hedgix is ready for GenLayer historical execution testing in a configured direct-mode or integration environment. It is not yet fully signed off for live Bradbury testnet deployment because this shell could not execute the contract state transitions through `create_historical_test_protection(...)`, `settle_protection_day(...)`, pool accounting flows, or access-control reverts.
