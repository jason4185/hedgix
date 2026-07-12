import type { TransactionStatus, ExecutionResult, Hash } from "genlayer-js/types";
import type { Address } from "viem";
import type { ContractPolicy, HedgixRegistry } from "@/lib/hedgix-data";

export type ProtectionType = "price_drop_protection" | "depeg_protection";
export type HedgixStatus = "ACTIVE" | "TRIGGERED" | "PAID" | "EXPIRED" | "CANCELLED";
export type HedgixPolicy = ContractPolicy;
export type Registry = HedgixRegistry;
export type RegistryProduct = HedgixRegistry["protection_products"][number];
export type RegistryAsset = RegistryProduct["supported_assets"][number];
export type RegistryEventLevel = RegistryProduct["event_levels"][number];

export type PoolStatus = {
  pool_balance: string;
  reserved_liability: string;
  available_to_withdraw: string;
  total_premiums_collected: string;
  total_payouts_paid: string;
};

export type SettlementReadiness = {
  ready: boolean;
  reason: string;
  expected_settlement_date: string;
  latest_closed_daily_date?: string;
  status?: string;
};

export type DashboardProtectionRow = {
  protection_id: string;
  protected_asset: string;
  protection_type: string;
  event_level: string;
  status: HedgixStatus;
  premium_paid: string;
  payout_amount: string;
  reserved_payout: string;
  reference_price_display: string;
  trigger_price_display: string;
  last_daily_low_display: string;
  purchase_date: string;
  duration_days: string;
  coverage_start_date: string;
  coverage_end_date: string;
  last_settled_date: string;
  triggered_date: string;
  paid_date: string;
  cancelled_date: string;
  expected_settlement_date: string;
  settlement_ready: boolean;
  binance_settlement_symbol?: string;
};

export type UserDashboardSummary = {
  wallet: string;
  protection_count: string;
  active_count: string;
  triggered_count: string;
  paid_count: string;
  expired_count: string;
  cancelled_count: string;
  protection_ids: string[];
  protections: DashboardProtectionRow[];
  start?: string;
  limit?: string;
  returned_count?: string;
  total_count?: string;
  has_more?: boolean;
};

export type GlobalDashboardSummary = {
  owner: string;
  settlement_operator: string;
  registry_url: string;
  registry_version: string;
  paused: boolean;
  next_protection_id: string;
  active_protection_count: string;
  pool_balance: string;
  reserved_liability: string;
  available_to_withdraw: string;
  total_premiums_collected: string;
  total_payouts_paid: string;
};

export type PaginatedIds = {
  ids: string[];
  start?: string;
  limit?: string;
  returned_count?: string;
  total_count?: string;
  has_more?: boolean;
};

export type TransactionStage =
  | "idle"
  | "review"
  | "preparing"
  | "awaiting_signature"
  | "consensus"
  | "submitted"
  | "proposing"
  | "committing"
  | "revealing"
  | "accepted"
  | "confirming"
  | "completed"
  | "finalized"
  | "cancelled"
  | "undetermined"
  | "failed"
  | "timeout";

export type TransactionProgress = {
  stage: TransactionStage;
  hash?: Hash;
  status?: TransactionStatus | string;
  receipt?: GenLayerReceiptResult;
  explorerUrl?: string;
  error?: string;
  detail?: string;
  checkedAt?: string;
  technicalDetails?: string;
};

export type GenLayerReceiptResult = {
  status?: TransactionStatus | string | number;
  statusName?: TransactionStatus | string;
  txExecutionResult?: number;
  txExecutionResultName?: ExecutionResult | string;
  data?: unknown;
};

export type WriteContext = {
  address: Address;
  provider: Eip1193Provider;
  chainId: number | undefined;
};

export type Eip1193Provider = {
  request: (args: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }) => Promise<unknown>;
};

export type PurchaseInput = {
  protectedAsset: string;
  protectionType: ProtectionType;
  eventLevel: string;
  durationDays: number;
  premiumWei: bigint;
};
