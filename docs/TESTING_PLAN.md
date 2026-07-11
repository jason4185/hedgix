# Hedgix Testing Plan

Testing should focus on registry verification, Binance data parsing, date sequencing, and pool accounting.

## Contract Checks

- Purchase rejects unsupported assets, protection types, event levels, and durations.
- Purchase rejects incorrect premium amounts.
- Purchase rejects insufficient pool capacity.
- Depeg purchase rejects when the reference price is already at or below the trigger.
- Settlement requires owner or settlement operator.
- Settlement rejects duplicate dates, skipped dates, and dates whose daily candle is not closed.
- Triggered protections can be claimed only by the protection owner.
- Cancelled protections release reserved liability and do not refund premiums.
- Owner withdrawals cannot use reserved liability.

## Historical Testing

Use `create_historical_test_protection(...)` to create test positions from historical Binance 5-minute candles. Then call `settle_protection_day(...)` for each historical coverage date. This exercises the same daily settlement path used by live protections.

Historical test positions are marked with `is_test_position = true` and are not claimable.

## GenLayer Testing

Use GenLayer Test or Studio to validate:

- `gl.eq_principle.strict_eq` registry fetch behavior
- Binance kline leader/validator agreement
- Storage persistence for protection records and settlement history
- Payable purchase and pool funding flows
- Native GEN transfers for claims and owner withdrawals

No automated test files are included yet.
