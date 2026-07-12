import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { runtimeEnv } from "@/config/env";
import {
  getMyDashboardSummary,
  getMyDashboardSummaryPaginated,
  getMyProtectionIds,
} from "@/lib/genlayer/reads";
import { contractQueryKey } from "./useHedgixReads";

export function useMyDashboard(address?: Address) {
  return useQuery({
    queryKey: contractQueryKey("get_my_dashboard_summary", address),
    queryFn: () => getMyDashboardSummary(address as Address),
    enabled: runtimeEnv.contractConfigured && Boolean(address),
    retry: 1,
  });
}

export function useMyDashboardPaginated(address?: Address, start = 0n, limit = 25n) {
  return useQuery({
    queryKey: contractQueryKey("get_my_dashboard_summary_paginated", address, [start, limit]),
    queryFn: () => getMyDashboardSummaryPaginated(address as Address, start, limit),
    enabled: runtimeEnv.contractConfigured && Boolean(address),
    retry: 1,
  });
}

export function useMyProtectionIds(address?: Address, enabled = true) {
  return useQuery({
    queryKey: contractQueryKey("get_my_protection_ids", address),
    queryFn: () => getMyProtectionIds(address as Address),
    enabled: enabled && runtimeEnv.contractConfigured && Boolean(address),
    retry: 1,
  });
}
