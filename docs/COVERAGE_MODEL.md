# Hedgix Coverage Model

Hedgix separates product permissioning from market truth.

- Registry: defines what users are allowed to buy.
- Binance: defines what happened in the market.
- GenLayer contract: verifies registry terms, reads Binance data, and stores protection state.

## Price Drop Protection

Supported assets:

- BTCUSDT
- ETHUSDT
- SOLUSDT
- BNBUSDT

Levels:

- Protected Drop: 10% drop, premium 1 GEN, payout 3 GEN
- Major Drop: 20% drop, premium 2 GEN, payout 6 GEN
- Crash Event: 30% drop, premium 3 GEN, payout 10 GEN

Purchase reference price is the latest closed Binance 5-minute candle close. Trigger price is:

`reference_price * (10000 - drop_basis_points) / 10000`

## Depeg Protection

Supported assets:

- USDT, settled with Binance symbol USDTUSD
- USDC, settled with Binance symbol USDCUSD

Levels:

- Soft Depeg: below 0.990, premium 1 GEN, payout 3 GEN
- Deep Depeg: below 0.980, premium 2 GEN, payout 6 GEN
- Severe Depeg: below 0.950, premium 3 GEN, payout 10 GEN

The purchase reference price is the latest closed Binance 5-minute candle close. The trigger price is the fixed depeg threshold from the registry. Purchases are rejected if the reference price is already at or below the selected trigger.

## Settlement

Coverage starts on the next UTC day after purchase and ends after the selected duration. Settlement is sequential by UTC date with no skipped or duplicate dates. The contract uses the closed Binance 1-day candle low for each settlement day.

Statuses:

- ACTIVE
- TRIGGERED
- PAID
- EXPIRED
- CANCELLED

All market prices are stored as scaled integers with `PRICE_SCALE = 100000000`. Drop percentages are stored in basis points.
