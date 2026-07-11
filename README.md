# Hedgix

A transparent crypto market protection platform for price-drop and stablecoin depeg coverage, using verified market data, on-chain policy records, and rules-based settlement.

## Current MVP Products

- Price Drop Protection for BTCUSDT, ETHUSDT, SOLUSDT, and BNBUSDT
- Depeg Protection for USDC using USDCUSDT

## Repository Structure

```text
hedgix/
├── contract/   # GenLayer intelligent contract source
├── frontend/   # Lovable-generated Hedgix frontend
├── registry/   # Public registry JSON and registry hosting files
├── docs/       # Architecture notes, plans, audits, and testing notes
├── evidence/   # Future transaction, testing, settlement, and accounting evidence
├── .gitignore
└── README.md
```

## Contract

Production GenLayer contract:

```text
contract/Hedgix.py
```

The historical MVP contract snapshot is preserved for reference:

```text
contract/archive/HedgixHistoricalMVP.py
```

## Frontend

The frontend is located in:

```text
frontend/
```

It is the current Lovable-generated Hedgix frontend. Contract integration, wallet integration, and live policy actions are the next phase.

## Registry

Registry URL:

```text
https://hedgix-market-registry.netlify.app/hedgix-market-protection-registry.v1.json
```

Registry version: `v1`

Local registry source:

```text
registry/hedgix-market-protection-registry.v1.json
```

## Current Status

This repository combines the production-style Hedgix GenLayer contract, the public registry source, project documentation, and the current frontend.

Frontend contract integration is the next phase.

Historical and production settlement evidence will be documented later as verified transactions and test records become available.
