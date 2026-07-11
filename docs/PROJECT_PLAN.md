# Hedgix Project Plan

Hedgix is contract-first. The MVP is a GenLayer Intelligent Contract on the Bradbury testnet that lets users buy fixed-period crypto protection products verified from the official Hedgix Market Protection Registry.

## Current Scope

- GenLayer contract: `contracts/Hedgix.py`
- Registry source: `https://hedgix-market-registry.netlify.app/hedgix-market-protection-registry.v1.json`
- Market data source: Binance public market data via `https://data-api.binance.vision`
- Coverage types: Price Drop Protection and Depeg Protection
- Durations: 7, 14, and 30 days

## Contract Responsibilities

- Fetch and verify registry terms before purchase.
- Fetch Binance 5-minute klines for purchase reference prices.
- Fetch Binance 1-day klines for settlement.
- Store protection ownership, status, settlement history, pool balance, and reserved liability.
- Enforce owner/operator settlement, owner admin controls, and pool-reserve accounting.

## Out of Scope For This Step

- Frontend app
- Backend server
- Cron or worker settlement automation
- Deployment scripts
- Package installation
