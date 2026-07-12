import type { Address } from "viem";
import { HEDGIX_METHODS } from "@/config/contract";
import { requireContractAddress } from "@/config/env";
import { createHedgixReadClient } from "./client";
import {
  parseDashboardSummary,
  parseGlobalDashboardSummary,
  parsePaginatedIds,
  parsePolicy,
  parsePoolStatus,
  parseSettlementReadiness,
  parseStringList,
} from "./parsing";

function parseOrThrow<T>(
  result: { ok: true; value: T } | { ok: false; raw: string; error: string },
): T {
  if (result.ok) return result.value;
  throw new Error(`CONTRACT_RESPONSE_PARSE_FAILED: ${result.error}\n${result.raw}`);
}

export async function readHedgixContract(
  functionName: string,
  args: (string | number | bigint | boolean)[] = [],
  account?: Address,
) {
  const client = createHedgixReadClient(account);
  return client.readContract({
    address: requireContractAddress(),
    functionName,
    args,
  });
}

export async function getMyDashboardSummary(account: Address) {
  return parseOrThrow(
    parseDashboardSummary(
      await readHedgixContract(HEDGIX_METHODS.getMyDashboardSummary, [], account),
    ),
  );
}

export async function getMyDashboardSummaryPaginated(
  account: Address,
  start: bigint,
  limit: bigint,
) {
  return parseOrThrow(
    parseDashboardSummary(
      await readHedgixContract(
        HEDGIX_METHODS.getMyDashboardSummaryPaginated,
        [start, limit],
        account,
      ),
    ),
  );
}

export async function getProtection(protectionId: string | bigint, account?: Address) {
  return parseOrThrow(
    parsePolicy(
      await readHedgixContract(HEDGIX_METHODS.getProtection, [BigInt(protectionId)], account),
    ),
  );
}

export async function getMyProtectionIds(account: Address) {
  return parseOrThrow(
    parseStringList(await readHedgixContract(HEDGIX_METHODS.getMyProtectionIds, [], account)),
  );
}

export async function getActiveProtectionIds(account?: Address) {
  return parseOrThrow(
    parseStringList(await readHedgixContract(HEDGIX_METHODS.getActiveProtectionIds, [], account)),
  );
}

export async function getActiveProtectionIdsPaginated(
  start: bigint,
  limit: bigint,
  account?: Address,
) {
  return parseOrThrow(
    parsePaginatedIds(
      await readHedgixContract(
        HEDGIX_METHODS.getActiveProtectionIdsPaginated,
        [start, limit],
        account,
      ),
    ),
  );
}

export async function getExpectedSettlementDate(protectionId: string | bigint, account?: Address) {
  return String(
    await readHedgixContract(
      HEDGIX_METHODS.getExpectedSettlementDate,
      [BigInt(protectionId)],
      account,
    ),
  );
}

export async function getSettlementReadiness(protectionId: string | bigint, account?: Address) {
  return parseOrThrow(
    parseSettlementReadiness(
      await readHedgixContract(
        HEDGIX_METHODS.getSettlementReadiness,
        [BigInt(protectionId)],
        account,
      ),
    ),
  );
}

export async function getDashboardSummary(account?: Address) {
  return parseOrThrow(
    parseGlobalDashboardSummary(
      await readHedgixContract(HEDGIX_METHODS.getDashboardSummary, [], account),
    ),
  );
}

export async function getPoolStatus(account?: Address) {
  return parseOrThrow(
    parsePoolStatus(await readHedgixContract(HEDGIX_METHODS.getPoolStatus, [], account)),
  );
}

export async function getOwner(account?: Address) {
  return String(await readHedgixContract(HEDGIX_METHODS.getOwner, [], account));
}

export async function getSettlementOperator(account?: Address) {
  return String(await readHedgixContract(HEDGIX_METHODS.getSettlementOperator, [], account));
}

export async function getRegistryUrl(account?: Address) {
  return String(await readHedgixContract(HEDGIX_METHODS.getRegistryUrl, [], account));
}

export async function getRegistryVersion(account?: Address) {
  return String(await readHedgixContract(HEDGIX_METHODS.getRegistryVersion, [], account));
}

export async function isPaused(account?: Address) {
  return Boolean(await readHedgixContract(HEDGIX_METHODS.isPaused, [], account));
}

export async function verifyDeployedSchema(account?: Address) {
  const client = createHedgixReadClient(account);
  return client.getContractSchema(requireContractAddress());
}
