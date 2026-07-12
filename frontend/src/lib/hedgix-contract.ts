import type {
  ContractPolicy,
  DashboardSummary,
  Duration,
  ProductType,
  SettlementReadiness,
} from "./hedgix-data";
import { runtimeEnv } from "@/config/env";

export const CONTRACT_METHODS = {
  purchase: "purchase_protection",
  getProtection: "get_protection",
  getMyProtectionIds: "get_my_protection_ids",
  getMyDashboardSummary: "get_my_dashboard_summary",
  getMyDashboardSummaryPaginated: "get_my_dashboard_summary_paginated",
  getDashboardSummary: "get_dashboard_summary",
  getPoolStatus: "get_pool_status",
  getActiveProtectionIds: "get_active_protection_ids",
  getActiveProtectionIdsPaginated: "get_active_protection_ids_paginated",
  getExpectedSettlementDate: "get_expected_settlement_date",
  getSettlementReadiness: "get_settlement_readiness",
  settleProtectionDay: "settle_protection_day",
  claimPayout: "claim_payout",
  cancelProtection: "cancel_protection",
  addPoolFunds: "add_pool_funds",
  withdrawFromPoolGen: "withdraw_from_pool_gen",
  pauseContract: "pause_contract",
  unpauseContract: "unpause_contract",
  setSettlementOperator: "set_settlement_operator",
} as const;

export type PurchaseArgs = {
  protected_asset: string;
  protection_type: ProductType;
  event_level: string;
  duration_days: Duration;
  value_wei: string;
};

export type ContractDashboardSummary = {
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

export type PoolStatus = {
  pool_balance: string;
  reserved_liability: string;
  available_to_withdraw: string;
  total_premiums_collected: string;
  total_payouts_paid: string;
};

export type HedgixContractClient = {
  purchaseProtection(
    args: PurchaseArgs,
  ): Promise<{ protectionId?: string; transactionHash?: string }>;
  getProtection(protectionId: string): Promise<ContractPolicy>;
  getMyProtectionIds(): Promise<string[]>;
  getMyDashboardSummary(): Promise<DashboardSummary>;
  getDashboardSummary(): Promise<ContractDashboardSummary>;
  getPoolStatus(): Promise<PoolStatus>;
  getActiveProtectionIds(): Promise<string[]>;
  getSettlementReadiness(protectionId: string): Promise<SettlementReadiness>;
  settleProtectionDay(protectionId: string, settlementDate: string): Promise<string>;
  claimPayout(protectionId: string): Promise<void>;
  cancelProtection(protectionId: string): Promise<void>;
};

export const contractIntegrationStatus = {
  configured: runtimeEnv.contractConfigured,
  reason: runtimeEnv.contractConfigured
    ? "GenLayerJS is configured for the deployed Hedgix Intelligent Contract."
    : runtimeEnv.contractError,
};

export async function unavailableContractAction(): Promise<never> {
  throw new Error("CONTRACT_CLIENT_NOT_CONFIGURED");
}
