import { z } from "zod";
import type {
  GlobalDashboardSummary,
  HedgixPolicy,
  PaginatedIds,
  PoolStatus,
  Registry,
  SettlementReadiness,
  UserDashboardSummary,
} from "./types";

const statusSchema = z.enum(["ACTIVE", "TRIGGERED", "PAID", "EXPIRED", "CANCELLED"]);

const policySchema = z.object({
  protection_id: z.string(),
  owner: z.string(),
  protection_type: z.string(),
  protected_asset: z.string(),
  binance_settlement_symbol: z.string(),
  event_level: z.string(),
  purchase_date: z.string(),
  duration_days: z.string(),
  coverage_start_date: z.string(),
  coverage_end_date: z.string(),
  premium_paid: z.string(),
  payout_amount: z.string(),
  reserved_payout: z.string(),
  reference_price_datetime: z.string(),
  reference_price_source: z.string(),
  reference_price_scaled: z.string(),
  reference_price_display: z.string(),
  trigger_price_scaled: z.string(),
  trigger_price_display: z.string(),
  trigger_metric: z.string(),
  trigger_operator: z.string(),
  last_settled_date: z.string(),
  last_daily_low_scaled: z.string(),
  last_daily_low_display: z.string(),
  triggered_date: z.string(),
  cancelled_date: z.string(),
  paid_date: z.string(),
  status: statusSchema,
  created_at: z.string(),
});

const dashboardProtectionRowSchema = z.object({
  protection_id: z.string(),
  protected_asset: z.string(),
  protection_type: z.string(),
  event_level: z.string(),
  status: statusSchema,
  premium_paid: z.string(),
  payout_amount: z.string(),
  reserved_payout: z.string(),
  reference_price_display: z.string(),
  trigger_price_display: z.string(),
  last_daily_low_display: z.string(),
  purchase_date: z.string(),
  duration_days: z.string(),
  coverage_start_date: z.string(),
  coverage_end_date: z.string(),
  last_settled_date: z.string(),
  triggered_date: z.string(),
  paid_date: z.string(),
  cancelled_date: z.string(),
  expected_settlement_date: z.string(),
  settlement_ready: z.boolean(),
  binance_settlement_symbol: z.string().optional(),
});

const dashboardSummarySchema = z.object({
  wallet: z.string(),
  protection_count: z.string(),
  active_count: z.string(),
  triggered_count: z.string(),
  paid_count: z.string(),
  expired_count: z.string(),
  cancelled_count: z.string(),
  protection_ids: z.array(z.string()),
  protections: z.array(dashboardProtectionRowSchema),
  start: z.string().optional(),
  limit: z.string().optional(),
  returned_count: z.string().optional(),
  total_count: z.string().optional(),
  has_more: z.boolean().optional(),
});

const globalSummarySchema = z.object({
  owner: z.string(),
  settlement_operator: z.string(),
  registry_url: z.string(),
  registry_version: z.string(),
  paused: z.boolean(),
  next_protection_id: z.string(),
  active_protection_count: z.string(),
  pool_balance: z.string(),
  reserved_liability: z.string(),
  available_to_withdraw: z.string(),
  total_premiums_collected: z.string(),
  total_payouts_paid: z.string(),
});

const poolStatusSchema = z.object({
  pool_balance: z.string(),
  reserved_liability: z.string(),
  available_to_withdraw: z.string(),
  total_premiums_collected: z.string(),
  total_payouts_paid: z.string(),
});

const readinessSchema = z.object({
  ready: z.boolean(),
  reason: z.string(),
  expected_settlement_date: z.string(),
  latest_closed_daily_date: z.string().optional(),
  status: z.string().optional(),
});

const registrySchema = z.object({
  metadata: z.object({
    registry_name: z.literal("Hedgix Market Protection Registry"),
    registry_version: z.literal("v1"),
    network: z.literal("GenLayer Bradbury"),
    app_name: z.literal("Hedgix"),
    status: z.literal("draft"),
  }),
  supported_durations: z.array(
    z.object({
      label: z.string(),
      duration_days: z.union([z.literal(7), z.literal(14), z.literal(30)]),
    }),
  ),
  protection_products: z.array(
    z.object({
      protection_type: z.string(),
      display_name: z.string(),
      description: z.string().optional(),
      threshold_type: z.string().optional(),
      supported_assets: z.array(
        z.object({
          asset: z.string(),
          protected_asset: z.string().optional(),
          display_name: z.string().optional(),
          binance_settlement_symbol: z.string(),
          settlement_symbol: z.string().optional(),
          quote_currency: z.string().optional(),
          protection_type: z.string().optional(),
        }),
      ),
      event_levels: z.array(
        z.object({
          name: z.string(),
          trigger_rule: z.object({
            metric: z.string(),
            operator: z.string(),
            threshold_percent: z.string().optional(),
            threshold: z.string().optional(),
          }),
          premium: z.object({ amount: z.number(), token: z.literal("GEN") }),
          payout: z.object({ amount: z.number(), token: z.literal("GEN") }),
        }),
      ),
    }),
  ),
});

export type ParseResult<T> = { ok: true; value: T } | { ok: false; raw: string; error: string };

export function unwrapContractValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "string") {
      try {
        return JSON.parse(parsed);
      } catch {
        return parsed;
      }
    }
    return parsed;
  } catch {
    return value;
  }
}

export function parseContractJson<T>(value: unknown, schema: z.ZodType<T>): ParseResult<T> {
  const unwrapped = unwrapContractValue(value);
  const parsed = schema.safeParse(unwrapped);
  if (parsed.success) return { ok: true, value: parsed.data };
  return {
    ok: false,
    raw: typeof value === "string" ? value : JSON.stringify(value),
    error: parsed.error.message,
  };
}

export function parsePolicy(value: unknown): ParseResult<HedgixPolicy> {
  return parseContractJson(value, policySchema);
}

export function parseDashboardSummary(value: unknown): ParseResult<UserDashboardSummary> {
  return parseContractJson(value, dashboardSummarySchema);
}

export function parseGlobalDashboardSummary(value: unknown): ParseResult<GlobalDashboardSummary> {
  return parseContractJson(value, globalSummarySchema);
}

export function parsePoolStatus(value: unknown): ParseResult<PoolStatus> {
  return parseContractJson(value, poolStatusSchema);
}

export function parseSettlementReadiness(value: unknown): ParseResult<SettlementReadiness> {
  return parseContractJson(value, readinessSchema);
}

export function parseStringList(value: unknown): ParseResult<string[]> {
  return parseContractJson(value, z.array(z.string()));
}

export function parsePaginatedIds(value: unknown): ParseResult<PaginatedIds> {
  const unwrapped = unwrapContractValue(value);
  if (Array.isArray(unwrapped)) return { ok: true, value: { ids: unwrapped.map(String) } };
  return parseContractJson(
    value,
    z.object({
      ids: z.array(z.string()),
      start: z.string().optional(),
      limit: z.string().optional(),
      returned_count: z.string().optional(),
      total_count: z.string().optional(),
      has_more: z.boolean().optional(),
    }),
  );
}

export function validateRegistry(value: unknown): ParseResult<Registry> {
  const parsed = registrySchema.safeParse(value);
  if (parsed.success) return { ok: true, value: parsed.data as Registry };
  return { ok: false, raw: JSON.stringify(value), error: parsed.error.message };
}
