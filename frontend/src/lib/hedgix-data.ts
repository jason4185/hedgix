// Mock registry & policy data for Hedgix MVP frontend.
// This is not real market data. Structured to make future contract wiring simple.

export type Duration = 7 | 14 | 30;

export type PriceDropLevel = "Protected Drop" | "Major Drop" | "Crash Event";
export type DepegLevel = "Soft Depeg" | "Deep Depeg" | "Severe Depeg";

export const PRICE_DROP_ASSETS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"] as const;
export type PriceDropAsset = (typeof PRICE_DROP_ASSETS)[number];

export const DURATIONS: Duration[] = [7, 14, 30];

export const priceDropTerms: {
  level: PriceDropLevel;
  triggerPct: number;
  premium: string;
  payout: string;
}[] = [
  { level: "Protected Drop", triggerPct: 2, premium: "1 GEN", payout: "2 GEN" },
  { level: "Major Drop", triggerPct: 3, premium: "1 GEN", payout: "3 GEN" },
  { level: "Crash Event", triggerPct: 4, premium: "1 GEN", payout: "4 GEN" },
];

export const depegTerms: {
  level: DepegLevel;
  threshold: number;
  premium: string;
  payout: string;
}[] = [
  { level: "Soft Depeg", threshold: 0.998, premium: "1 GEN", payout: "2 GEN" },
  { level: "Deep Depeg", threshold: 0.996, premium: "1 GEN", payout: "3 GEN" },
  { level: "Severe Depeg", threshold: 0.994, premium: "1 GEN", payout: "4 GEN" },
];

export const registry = {
  name: "Hedgix Registry",
  version: "v1",
  network: "GenLayer Testnet",
  app: "Hedgix Protocol",
  status: "Active",
  durations: DURATIONS,
  products: {
    "Price Drop Protection": {
      assets: PRICE_DROP_ASSETS,
      levels: priceDropTerms,
    },
    "Depeg Protection": {
      asset: "USDC",
      settlementSymbol: "USDCUSDT",
      levels: depegTerms,
    },
  },
} as const;

export type PolicyStatus = "ACTIVE" | "TRIGGERED" | "PAID" | "EXPIRED" | "CANCELLED";

export type Policy = {
  id: string;
  asset: string;
  settlementSymbol?: string;
  type: "Price Drop Protection" | "Depeg Protection";
  level: PriceDropLevel | DepegLevel;
  status: PolicyStatus;
  referencePrice: string;
  triggerPrice: string;
  coverageStart: string;
  coverageEnd: string;
  expectedSettlement: string;
  settlementReadiness: string;
  premium: string;
  payout: string;
  lastSettled?: string;
};

export const mockPolicies: Policy[] = [
  {
    id: "1",
    asset: "BTCUSDT",
    type: "Price Drop Protection",
    level: "Protected Drop",
    status: "ACTIVE",
    referencePrice: "63,772.06",
    triggerPrice: "62,496.6188",
    coverageStart: "2026-07-11",
    coverageEnd: "2026-07-17",
    expectedSettlement: "2026-07-11",
    settlementReadiness: "Waiting for daily candle to close",
    premium: "1 GEN",
    payout: "2 GEN",
  },
  {
    id: "2",
    asset: "USDC",
    settlementSymbol: "USDCUSDT",
    type: "Depeg Protection",
    level: "Soft Depeg",
    status: "ACTIVE",
    referencePrice: "1.00047",
    triggerPrice: "0.998",
    coverageStart: "2026-07-11",
    coverageEnd: "2026-07-17",
    expectedSettlement: "2026-07-11",
    settlementReadiness: "Waiting for daily candle to close",
    premium: "1 GEN",
    payout: "2 GEN",
  },
];
