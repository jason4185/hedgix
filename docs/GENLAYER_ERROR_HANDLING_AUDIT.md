# GenLayer Error Handling Audit

## Skills Status

- GenLayer Labs marketplace available: yes
- GenLayer Dev plugin detected: yes
- GenLayer Dev plugin installed/enabled: yes, `genlayer-dev@genlayerlabs` version `1.1.3`
- GenLayer Node plugin detected: yes
- GenLayer Node plugin installed/enabled: yes, `genlayernode@genlayerlabs` version `1.0.1`
- `genlayer-dev` guidance used: yes, from the installed plugin cache at `/Users/jxson/.codex/plugins/cache/genlayerlabs/genlayer-dev/1.1.3/skills/write-contract/SKILL.md`
- Live callable GenLayer MCP/tools exposed to this Codex session: no GenLayer MCP namespace or GenLayer app tools were exposed.
- Local GenLayer CLI validation exposed to this shell: yes, `genvm-lint` at `/opt/homebrew/bin/genvm-lint`.
- Evidence: the installed plugin cache contains `genlayer-dev@genlayerlabs` and `genlayernode@genlayerlabs`; Codex `tool_search` for GenLayer surfaced Lovable app tools rather than GenLayer tools; local `genvm-lint` was available on PATH and was run during the contract-readiness audit.

Because live GenLayer tools were not exposed to this session, the audit used the installed GenLayer Dev skill guidance by reading the plugin cache, plus the official GenLayer docs directly.

## GenLayer Docs Followed

- https://docs.genlayer.com/developers/intelligent-contracts/features/error-handling
- https://docs.genlayer.com/developers/intelligent-contracts/features/non-determinism
- https://docs.genlayer.com/developers/intelligent-contracts/equivalence-principle
- https://docs.genlayer.com/developers/intelligent-contracts/storage
- https://docs.genlayer.com/developers/intelligent-contracts/features/transaction-context
- https://skills.genlayer.com/

## Write Methods Audited

- `purchase_protection`
- `settle_protection_day`
- `claim_payout`
- `cancel_protection`
- `add_pool_funds`
- `withdraw_from_pool`
- `set_settlement_operator`
- `set_registry_url`
- `pause_contract`
- `unpause_contract`
- `create_historical_test_protection`

## Already Correct

- User-facing write-method validation used `raise gl.vm.UserError(...)` instead of `raise Exception(...)` or `exit(1)`.
- No write method silently returned `False` for invalid user state.
- Persistent storage fields were declared in the contract class body with GenLayer-compatible annotations.
- `gl.nondet.web.get` calls were inside nondeterministic functions passed to `gl.eq_principle.strict_eq` or `gl.vm.run_nondet_unsafe`.
- Registry fetch used strict equality, appropriate for the static registry JSON.
- Binance kline reads used a leader/validator pattern with independent validator fetches and price tolerance.
- Frontend-supplied price, payout, premium, threshold, and settlement values were not trusted.

## Fixed

- Normalized user-facing validation errors to uppercase error codes.
- Added status-specific errors for already triggered, paid, expired, and cancelled protections.
- Added paused-state errors for duplicate `pause_contract` and `unpause_contract` calls.
- Added `INVALID_ADDRESS` handling around settlement-operator address parsing.
- Added `INVALID_PROTECTION_ID` for zero protection IDs.
- Added clearer registry errors: `REGISTRY_FETCH_FAILED`, `INVALID_REGISTRY_RESPONSE`, `UNSUPPORTED_PROTECTION_TYPE`, `UNSUPPORTED_ASSET`, `UNSUPPORTED_EVENT_LEVEL`, and `UNSUPPORTED_BINANCE_SYMBOL`.
- Added clearer Binance errors: `BINANCE_FETCH_FAILED`, `INVALID_BINANCE_RESPONSE`, `BINANCE_KLINE_MISSING`, and `PRICE_PARSE_FAILED`.
- Added settlement sequence errors for before coverage start, after coverage end, duplicate, already-settled, skipped, and future dates.
- Added `NONDETERMINISTIC_RESULT_REJECTED` when a Binance nondeterministic result returns without the expected agreed price field.
- Replaced pool and claim accounting messages with explicit error codes.

## Remaining Uncertainty

- `emit_transfer` does not expose a synchronous success/failure result in the contract code, so transfer failure is not directly detectable here.
- `genvm-lint check contracts/Hedgix.py --json` passed during the contract-readiness audit. `genvm-lint typecheck contracts/Hedgix.py --json` also passed with no diagnostics.
- The GenLayer Dev plugin is installed and enabled, but its MCP/docs tools were not exposed as callable tools in this already-running Codex session. Guidance was still available through the installed plugin skill files.

## Scope Confirmation

No frontend, cron, worker, deployment, package, or unrelated project files were created.
