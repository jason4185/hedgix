export const REGISTRY_URL =
  "https://hedgix-market-registry.netlify.app/hedgix-market-protection-registry.v1.json";
export const REGISTRY_NAME = "Hedgix Market Protection Registry";
export const REGISTRY_VERSION = "v1";
export const NETWORK_NAME = "GenLayer Bradbury";
export const APP_NAME = "Hedgix";
export const REGISTRY_STATUS = "draft";
export const MARKET_DATA_SOURCE = "Binance";

export type Duration = 7 | 14 | 30;
export type ProtectionStatus = "ACTIVE" | "TRIGGERED" | "PAID" | "EXPIRED" | "CANCELLED";
export type ProductType = "price_drop_protection" | "depeg_protection";
export type ProductLabel = "Price Drop Protection" | "Stablecoin Depeg Protection";
export type PriceDropLevel = "Protected Drop" | "Major Drop" | "Crash Event";
export type DepegLevel = "Soft Depeg" | "Deep Depeg" | "Severe Depeg";
export type EventLevel = PriceDropLevel | DepegLevel;
export type PriceDropAsset = "BTCUSDT" | "ETHUSDT" | "SOLUSDT" | "BNBUSDT";
export type DepegAsset = "USDT" | "USDC";
export type ProtectedAsset = PriceDropAsset | DepegAsset;

export type RegistryAsset = {
  asset: ProtectedAsset;
  protected_asset?: ProtectedAsset;
  display_name?: string;
  binance_settlement_symbol: string;
  settlement_symbol?: string;
  quote_currency?: string;
  protection_type?: ProductType;
};

export type RegistryLevel = {
  name: EventLevel;
  trigger_rule: {
    metric: "price_drop_percent" | "settlement_price_usd";
    operator: ">=" | "<=";
    threshold_percent?: string;
    threshold?: string;
  };
  premium: { amount: number; token: "GEN" };
  payout: { amount: number; token: "GEN" };
};

export type RegistryProduct = {
  protection_type: ProductType;
  display_name: ProductLabel | "Depeg Protection";
  description?: string;
  threshold_type?: string;
  supported_assets: RegistryAsset[];
  event_levels: RegistryLevel[];
};

export type HedgixRegistry = {
  metadata: {
    registry_name: string;
    registry_version: string;
    network: string;
    app_name: string;
    status: string;
  };
  supported_durations: { label: string; duration_days: Duration }[];
  protection_products: RegistryProduct[];
};

export type ContractPolicy = {
  protection_id: string;
  owner: string;
  protection_type: ProductType | string;
  protected_asset: string;
  binance_settlement_symbol: string;
  event_level: string;
  purchase_date: string;
  duration_days: string;
  coverage_start_date: string;
  coverage_end_date: string;
  premium_paid: string;
  payout_amount: string;
  reserved_payout: string;
  reference_price_datetime: string;
  reference_price_source: string;
  reference_price_scaled: string;
  reference_price_display: string;
  trigger_price_scaled: string;
  trigger_price_display: string;
  trigger_metric: string;
  trigger_operator: string;
  last_settled_date: string;
  last_daily_low_scaled: string;
  last_daily_low_display: string;
  triggered_date: string;
  cancelled_date: string;
  paid_date: string;
  status: ProtectionStatus;
  created_at: string;
};

export type SettlementReadiness = {
  ready: boolean;
  reason: string;
  expected_settlement_date: string;
  latest_closed_daily_date?: string;
  status?: string;
};

export type DashboardSummary = {
  wallet: string;
  protection_count: string;
  active_count: string;
  triggered_count: string;
  paid_count: string;
  expired_count: string;
  cancelled_count: string;
  protection_ids: string[];
  protections: ContractPolicy[];
};

export type ContractErrorInfo = {
  code: string;
  message: string;
  raw: string;
};

export const PRICE_DROP_ASSETS: PriceDropAsset[] = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"];
export const DEPEG_ASSETS: DepegAsset[] = ["USDT", "USDC"];
export const DURATIONS: Duration[] = [7, 14, 30];

export const priceDropTerms: RegistryLevel[] = [
  {
    name: "Protected Drop",
    trigger_rule: { metric: "price_drop_percent", operator: ">=", threshold_percent: "2" },
    premium: { amount: 1, token: "GEN" },
    payout: { amount: 2, token: "GEN" },
  },
  {
    name: "Major Drop",
    trigger_rule: { metric: "price_drop_percent", operator: ">=", threshold_percent: "3" },
    premium: { amount: 1, token: "GEN" },
    payout: { amount: 3, token: "GEN" },
  },
  {
    name: "Crash Event",
    trigger_rule: { metric: "price_drop_percent", operator: ">=", threshold_percent: "4" },
    premium: { amount: 1, token: "GEN" },
    payout: { amount: 4, token: "GEN" },
  },
];

export const depegTerms: RegistryLevel[] = [
  {
    name: "Soft Depeg",
    trigger_rule: { metric: "settlement_price_usd", operator: "<=", threshold: "0.998" },
    premium: { amount: 1, token: "GEN" },
    payout: { amount: 2, token: "GEN" },
  },
  {
    name: "Deep Depeg",
    trigger_rule: { metric: "settlement_price_usd", operator: "<=", threshold: "0.996" },
    premium: { amount: 1, token: "GEN" },
    payout: { amount: 3, token: "GEN" },
  },
  {
    name: "Severe Depeg",
    trigger_rule: { metric: "settlement_price_usd", operator: "<=", threshold: "0.994" },
    premium: { amount: 1, token: "GEN" },
    payout: { amount: 4, token: "GEN" },
  },
];

export const depegAssetTerms: RegistryAsset[] = [
  {
    asset: "USDT",
    protected_asset: "USDT",
    display_name: "Tether",
    binance_settlement_symbol: "USDTUSD",
    settlement_symbol: "USDTUSD",
    quote_currency: "USD",
    protection_type: "depeg_protection",
  },
  {
    asset: "USDC",
    protected_asset: "USDC",
    display_name: "USD Coin",
    binance_settlement_symbol: "USDCUSD",
    settlement_symbol: "USDCUSD",
    quote_currency: "USD",
    protection_type: "depeg_protection",
  },
];

export const registry: HedgixRegistry = {
  metadata: {
    registry_name: REGISTRY_NAME,
    registry_version: REGISTRY_VERSION,
    network: NETWORK_NAME,
    app_name: APP_NAME,
    status: REGISTRY_STATUS,
  },
  supported_durations: DURATIONS.map((duration_days) => ({
    label: `${duration_days} days`,
    duration_days,
  })),
  protection_products: [
    {
      protection_type: "price_drop_protection",
      display_name: "Price Drop Protection",
      supported_assets: PRICE_DROP_ASSETS.map((asset) => ({
        asset,
        binance_settlement_symbol: asset,
      })),
      event_levels: priceDropTerms,
    },
    {
      protection_type: "depeg_protection",
      display_name: "Depeg Protection",
      description:
        "Stablecoin depeg protection using the daily low of the configured direct USD market.",
      threshold_type: "absolute_usd_price",
      supported_assets: depegAssetTerms,
      event_levels: depegTerms,
    },
  ],
};

export const referencePriceNotice =
  "The contract retrieves the Binance market price when your transaction executes and stores it permanently with your protection.";

export const exampleLegacyUsdcUsdtPolicy: ContractPolicy = {
  protection_id: "42",
  owner: "0x0000000000000000000000000000000000000042",
  protection_type: "depeg_protection",
  protected_asset: "USDC",
  binance_settlement_symbol: "USDCUSDT",
  event_level: "Soft Depeg",
  purchase_date: "2026-07-01",
  duration_days: "7",
  coverage_start_date: "2026-07-02",
  coverage_end_date: "2026-07-08",
  premium_paid: "1000000000000000000",
  payout_amount: "2000000000000000000",
  reserved_payout: "2000000000000000000",
  reference_price_datetime: "2026-07-01T18:12:00+00:00",
  reference_price_source: "binance_ticker_price",
  reference_price_scaled: "100047000",
  reference_price_display: "1.00047",
  trigger_price_scaled: "99800000",
  trigger_price_display: "0.998",
  trigger_metric: "daily_low_scaled",
  trigger_operator: "<=",
  last_settled_date: "",
  last_daily_low_scaled: "",
  last_daily_low_display: "",
  triggered_date: "",
  cancelled_date: "",
  paid_date: "",
  status: "ACTIVE",
  created_at: "2026-07-01T18:12:00+00:00",
};

export const exampleUsdtUsdPolicy: ContractPolicy = {
  ...exampleLegacyUsdcUsdtPolicy,
  protection_id: "43",
  protected_asset: "USDT",
  binance_settlement_symbol: "USDTUSD",
  reference_price_scaled: "99942000",
  reference_price_display: "0.99942",
};

export function productTypeLabel(type: string): ProductLabel {
  return type === "depeg_protection" ? "Stablecoin Depeg Protection" : "Price Drop Protection";
}

export function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

export function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: "border-success/40 text-success bg-success/8",
    TRIGGERED: "border-danger/40 text-danger bg-danger/10",
    PAID: "border-ink/30 text-ink bg-ink/5",
    EXPIRED: "border-hairline text-muted-ink bg-stone",
    CANCELLED: "border-hairline text-muted-ink bg-stone",
  };
  return map[status] ?? "border-hairline text-muted-ink bg-stone";
}

export function shortAddress(address: string | undefined): string {
  if (!address) return "";
  return address.length > 12 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
}

export function assetDisplayName(asset: string): string {
  return asset !== "USDT" && asset.endsWith("USDT") ? asset.replace("USDT", "") : asset;
}

export function policyDisplayName(
  policy: Pick<ContractPolicy, "protected_asset" | "event_level" | "protection_type">,
): string {
  const asset = assetDisplayName(policy.protected_asset);
  const suffix = policy.protection_type === "depeg_protection" ? " Protection" : "";
  return `${asset} ${policy.event_level}${suffix}`;
}

export function readableSource(source: string | undefined): string {
  if (source === "binance_ticker_price") return "Binance live ticker";
  if (source === "binance_1d_close") return "Binance daily close";
  if (source === "binance_1d_low") return "Binance daily low";
  if (!source) return "Binance";
  return source
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getRegistryProduct(type: ProductType): RegistryProduct {
  const product = registry.protection_products.find((item) => item.protection_type === type);
  if (!product) throw new Error(`Unsupported product type: ${type}`);
  return product;
}

export function getDepegMarket(asset: string): string {
  const term = depegAssetTerms.find((item) => item.asset === asset);
  return term?.binance_settlement_symbol ?? "";
}

export function getAssetTerms(type: ProductType): RegistryAsset[] {
  return getRegistryProduct(type).supported_assets;
}

export function getEventLevels(type: ProductType): RegistryLevel[] {
  return getRegistryProduct(type).event_levels;
}

export function getSelectedRegistryLevel(type: ProductType, levelName: string): RegistryLevel {
  return getEventLevels(type).find((level) => level.name === levelName) ?? getEventLevels(type)[0];
}

export function premiumToWei(level: RegistryLevel): string {
  return `${BigInt(level.premium.amount) * 1_000_000_000_000_000_000n}`;
}

export function weiToGen(value: string | number | bigint | undefined): string {
  if (value === undefined || value === "") return "0 GEN";
  try {
    const wei = BigInt(String(value));
    const base = 1_000_000_000_000_000_000n;
    const whole = wei / base;
    const fraction = wei % base;
    if (fraction === 0n) return `${whole} GEN`;
    const decimals = fraction.toString().padStart(18, "0").replace(/0+$/, "");
    return `${whole}.${decimals} GEN`;
  } catch {
    return `${String(value)} wei`;
  }
}

export function scaledPriceToDisplay(value: string | number | undefined): string {
  if (value === undefined || value === "") return "";
  try {
    const scaled = BigInt(String(value));
    const base = 100_000_000n;
    const whole = scaled / base;
    const fraction = scaled % base;
    if (fraction === 0n) return whole.toString();
    return `${whole}.${fraction.toString().padStart(8, "0").replace(/0+$/, "")}`;
  } catch {
    return String(value);
  }
}

export function priceDisplay(
  policy: Pick<ContractPolicy, "reference_price_display" | "reference_price_scaled">,
): string {
  return policy.reference_price_display || scaledPriceToDisplay(policy.reference_price_scaled);
}

export function formatUsdPrice(value: string | undefined): string {
  if (!value) return "No value recorded";
  return `$${value}`;
}

export function formatUtcDate(value: string | undefined): string {
  if (!value) return "Not set";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatUtcDateTime(value: string | undefined): string {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })} UTC`;
}

export function addUtcDays(date: Date, days: number): Date {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function expectedCoverageDates(
  duration: Duration,
  from = new Date(),
): { start: string; end: string } {
  const start = addUtcDays(from, 1);
  const end = addUtcDays(start, duration - 1);
  return { start: isoDate(start), end: isoDate(end) };
}

export function triggerDescriptionFromLevel(type: ProductType, level: RegistryLevel): string {
  if (type === "depeg_protection") {
    return `Binance daily low less than or equal to $${level.trigger_rule.threshold}`;
  }
  return `${level.trigger_rule.threshold_percent}% drop from locked reference price`;
}

export function triggerDescriptionFromPolicy(policy: ContractPolicy): string {
  const market = policy.binance_settlement_symbol;
  if (policy.protection_type === "depeg_protection") {
    return `Triggers when the verified Binance daily low for ${market} is less than or equal to ${formatUsdPrice(policy.trigger_price_display)}.`;
  }
  return `Triggers when the verified Binance daily low is less than or equal to the stored trigger price calculated from the locked reference price.`;
}

export function triggerConditionLine(
  policy: Pick<ContractPolicy, "trigger_price_display">,
): string {
  return `Daily low at or below ${formatUsdPrice(policy.trigger_price_display)}`;
}

export function settlementReadinessText(readiness?: SettlementReadiness): string {
  if (!readiness) return "Settlement readiness not loaded";
  if (readiness.ready) return "Ready for the next expected settlement";
  return readiness.reason || "Not ready";
}

export function canClaim(policy: Pick<ContractPolicy, "status">): boolean {
  return policy.status === "TRIGGERED";
}

export function canCancel(policy: Pick<ContractPolicy, "status">): boolean {
  return policy.status === "ACTIVE";
}

export function safeParseContractJson<T>(
  value: unknown,
): { ok: true; value: T } | { ok: false; error: string; raw: string } {
  if (typeof value !== "string") {
    return { ok: false, error: "Contract response was not a JSON string", raw: String(value) };
  }
  try {
    return { ok: true, value: JSON.parse(value) as T };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid JSON",
      raw: value,
    };
  }
}

export function extractContractErrorCode(raw: unknown): string {
  const text = raw instanceof Error ? raw.message : String(raw);
  const known = [
    "INVALID_PREMIUM",
    "INSUFFICIENT_POOL_CAPACITY",
    "UNSUPPORTED_ASSET",
    "UNSUPPORTED_PROTECTION_TYPE",
    "UNSUPPORTED_EVENT_LEVEL",
    "UNSUPPORTED_DURATION",
    "REGISTRY_FETCH_FAILED",
    "INVALID_REGISTRY_RESPONSE",
    "DEPEG_REFERENCE_PRICE_AT_OR_BELOW_TRIGGER",
    "BINANCE_TICKER_FETCH_FAILED",
    "INVALID_BINANCE_TICKER_RESPONSE",
    "NONDETERMINISTIC_RESULT_REJECTED",
    "CONTRACT_PAUSED",
    "DAILY_CANDLE_NOT_CLOSED",
    "SETTLEMENT_DATE_NOT_SEQUENTIAL",
    "PROTECTION_NOT_TRIGGERED",
    "PAYOUT_ALREADY_PAID",
    "CONTRACT_CLIENT_NOT_CONFIGURED",
  ];
  return known.find((code) => text.includes(code)) ?? text;
}

export function mapContractError(raw: unknown): ContractErrorInfo {
  const code = extractContractErrorCode(raw);
  const messages: Record<string, string> = {
    INVALID_PREMIUM: "The transaction value does not match the registry premium.",
    INSUFFICIENT_POOL_CAPACITY:
      "The underwriting pool does not currently have enough available capacity for this payout.",
    UNSUPPORTED_ASSET: "This asset is not supported by the current registry.",
    UNSUPPORTED_PROTECTION_TYPE: "This protection type is not supported by the current registry.",
    UNSUPPORTED_EVENT_LEVEL: "This event level is not supported for the selected product.",
    UNSUPPORTED_DURATION: "This coverage duration is not supported by the current registry.",
    REGISTRY_FETCH_FAILED: "The contract could not fetch the official Hedgix registry.",
    INVALID_REGISTRY_RESPONSE:
      "The registry response did not match the structure expected by the contract.",
    DEPEG_REFERENCE_PRICE_AT_OR_BELOW_TRIGGER:
      "The asset is already at or below this threshold, so new protection cannot be purchased for this level.",
    BINANCE_TICKER_FETCH_FAILED:
      "The contract could not fetch the Binance live ticker during purchase.",
    INVALID_BINANCE_TICKER_RESPONSE:
      "Binance returned a ticker response the contract could not validate.",
    NONDETERMINISTIC_RESULT_REJECTED:
      "GenLayer validators rejected the nondeterministic market-data result.",
    CONTRACT_PAUSED: "The contract is currently paused.",
    DAILY_CANDLE_NOT_CLOSED: "The selected UTC daily candle has not closed yet.",
    SETTLEMENT_DATE_NOT_SEQUENTIAL: "This policy must be settled for its next expected date first.",
    PROTECTION_NOT_TRIGGERED: "This protection has not reached its trigger condition.",
    PAYOUT_ALREADY_PAID: "This payout has already been claimed.",
    CONTRACT_CLIENT_NOT_CONFIGURED:
      "The frontend needs a deployed contract address, wallet client, and GenLayer transaction adapter before it can submit this action.",
  };
  return { code, message: messages[code] ?? "The contract action failed.", raw: String(raw) };
}
