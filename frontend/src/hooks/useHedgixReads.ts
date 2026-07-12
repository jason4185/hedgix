import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { runtimeEnv } from "@/config/env";
import {
  getActiveProtectionIdsPaginated,
  getDashboardSummary,
  getExpectedSettlementDate,
  getOwner,
  getPoolStatus,
  getProtection,
  getRegistryUrl,
  getRegistryVersion,
  getSettlementOperator,
  getSettlementReadiness,
  isPaused,
} from "@/lib/genlayer/reads";

const enabledContract = runtimeEnv.contractConfigured;

export function contractQueryKey(method: string, account?: string, args: unknown[] = []) {
  return [
    "hedgix-contract",
    runtimeEnv.contractAddress ?? "missing-contract",
    account?.toLowerCase() ?? "public",
    method,
    ...args.map(String),
  ];
}

export function usePolicy(protectionId?: string, account?: Address) {
  return useQuery({
    queryKey: contractQueryKey("get_protection", account, [protectionId ?? ""]),
    queryFn: () => getProtection(protectionId ?? "0", account),
    enabled: enabledContract && Boolean(protectionId),
    retry: 1,
  });
}

export function usePolicySettlement(protectionId?: string, account?: Address) {
  const readiness = useQuery({
    queryKey: contractQueryKey("get_settlement_readiness", account, [protectionId ?? ""]),
    queryFn: () => getSettlementReadiness(protectionId ?? "0", account),
    enabled: enabledContract && Boolean(protectionId),
    retry: 1,
  });
  const expectedDate = useQuery({
    queryKey: contractQueryKey("get_expected_settlement_date", account, [protectionId ?? ""]),
    queryFn: () => getExpectedSettlementDate(protectionId ?? "0", account),
    enabled: enabledContract && Boolean(protectionId),
    retry: 1,
  });
  return { readiness, expectedDate };
}

export function useAdminReads(account?: Address) {
  const owner = useQuery({
    queryKey: contractQueryKey("get_owner", account),
    queryFn: () => getOwner(account),
    enabled: enabledContract,
    retry: 1,
  });
  const operator = useQuery({
    queryKey: contractQueryKey("get_settlement_operator", account),
    queryFn: () => getSettlementOperator(account),
    enabled: enabledContract,
    retry: 1,
  });
  const summary = useQuery({
    queryKey: contractQueryKey("get_dashboard_summary", account),
    queryFn: () => getDashboardSummary(account),
    enabled: enabledContract,
    retry: 1,
  });
  const pool = useQuery({
    queryKey: contractQueryKey("get_pool_status", account),
    queryFn: () => getPoolStatus(account),
    enabled: enabledContract,
    retry: 1,
  });
  const active = useQuery({
    queryKey: contractQueryKey("get_active_protection_ids_paginated", account, ["0", "25"]),
    queryFn: () => getActiveProtectionIdsPaginated(0n, 25n, account),
    enabled: enabledContract,
    retry: 1,
  });
  const paused = useQuery({
    queryKey: contractQueryKey("is_paused", account),
    queryFn: () => isPaused(account),
    enabled: enabledContract,
    retry: 1,
  });
  const registryUrl = useQuery({
    queryKey: contractQueryKey("get_registry_url", account),
    queryFn: () => getRegistryUrl(account),
    enabled: enabledContract,
    retry: 1,
  });
  const registryVersion = useQuery({
    queryKey: contractQueryKey("get_registry_version", account),
    queryFn: () => getRegistryVersion(account),
    enabled: enabledContract,
    retry: 1,
  });
  return { owner, operator, summary, pool, active, paused, registryUrl, registryVersion };
}
