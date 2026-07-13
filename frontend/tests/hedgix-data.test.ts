import { describe, expect, it } from "bun:test";
import { CONTRACT_METHODS } from "../src/lib/hedgix-contract";
import {
  exampleLegacyUsdcUsdtPolicy,
  exampleUsdtUsdPolicy,
  getDepegMarket,
  mapContractError,
  policyDisplayName,
  priceDisplay,
  readableSource,
  referencePriceNotice,
  safeParseContractJson,
  settlementReadinessText,
  triggerConditionLine,
  triggerDescriptionFromPolicy,
  weiToGen,
  canCancel,
  canClaim,
  type ContractPolicy,
} from "../src/lib/hedgix-data";

const priceDropPolicy: ContractPolicy = {
  ...exampleUsdtUsdPolicy,
  protection_id: "44",
  protection_type: "price_drop_protection",
  protected_asset: "BTCUSDT",
  binance_settlement_symbol: "BTCUSDT",
  event_level: "Protected Drop",
  trigger_price_display: "67410",
};

describe("Hedgix frontend contract data rules", () => {
  it("maps direct USD stablecoin products to the updated registry symbols", () => {
    expect(getDepegMarket("USDT")).toBe("USDTUSD");
    expect(getDepegMarket("USDC")).toBe("USDCUSD");
  });

  it("does not present a pre-purchase current price", () => {
    expect(referencePriceNotice.toLowerCase()).not.toContain("current price");
    expect(referencePriceNotice).toContain("contract retrieves the Binance market price");
    expect(referencePriceNotice).toContain("stores it permanently");
  });

  it("displays stored reference prices and keeps legacy stored symbols unchanged", () => {
    expect(priceDisplay(exampleUsdtUsdPolicy)).toBe("0.99942");
    expect(exampleLegacyUsdcUsdtPolicy.binance_settlement_symbol).toBe("USDCUSDT");
    expect(exampleUsdtUsdPolicy.binance_settlement_symbol).toBe("USDTUSD");
  });

  it("uses product-specific trigger language", () => {
    expect(triggerDescriptionFromPolicy(exampleUsdtUsdPolicy)).toContain("USDTUSD");
    expect(triggerDescriptionFromPolicy(exampleUsdtUsdPolicy)).toContain("less than or equal");
    expect(triggerDescriptionFromPolicy(priceDropPolicy)).toContain("locked reference price");
    expect(triggerConditionLine(exampleUsdtUsdPolicy)).toBe("Daily low at or below $0.998");
  });

  it("uses descriptive policy titles and readable source labels", () => {
    expect(policyDisplayName(priceDropPolicy)).toBe("BTC Protected Drop");
    expect(policyDisplayName(exampleUsdtUsdPolicy)).toBe("USDT Soft Depeg Protection");
    expect(readableSource("binance_ticker_price")).toBe("Binance live ticker");
  });

  it("shows claim and cancel actions only for eligible statuses", () => {
    expect(canClaim({ status: "TRIGGERED" })).toBe(true);
    expect(canClaim({ status: "ACTIVE" })).toBe(false);
    expect(canClaim({ status: "PAID" })).toBe(false);
    expect(canCancel({ status: "ACTIVE" })).toBe(true);
    expect(canCancel({ status: "TRIGGERED" })).toBe(false);
  });

  it("formats wei values and parses contract JSON strings safely", () => {
    expect(weiToGen("1000000000000000000")).toBe("1 GEN");
    expect(weiToGen("2500000000000000000")).toBe("2.5 GEN");
    const parsed = safeParseContractJson<ContractPolicy>(JSON.stringify(exampleUsdtUsdPolicy));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value.binance_settlement_symbol).toBe("USDTUSD");
  });

  it("preserves raw contract errors while showing friendly messages", () => {
    const mapped = mapContractError("VMError: INVALID_PREMIUM");
    expect(mapped.code).toBe("INVALID_PREMIUM");
    expect(mapped.raw).toContain("INVALID_PREMIUM");
  });

  it("respects settlement readiness before operator settlement", () => {
    expect(
      settlementReadinessText({
        ready: false,
        reason: "DAILY_CANDLE_NOT_CLOSED",
        expected_settlement_date: "2026-07-12",
      }),
    ).toBe("DAILY_CANDLE_NOT_CLOSED");
  });

  it("does not expose a public global policy history contract method", () => {
    const methods = Object.values(CONTRACT_METHODS);
    expect(methods).toContain("get_my_dashboard_summary");
    expect(methods).not.toContain("get_all_protections");
    expect(methods).not.toContain("get_global_policy_history");
  });
});
