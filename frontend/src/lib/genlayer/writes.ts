import { HEDGIX_METHODS } from "@/config/contract";
import { BRADBURY_CHAIN_ID, explorerTransactionUrl } from "@/config/chains";
import { requireContractAddress } from "@/config/env";
import type { Hash } from "genlayer-js/types";
import { isAddress, type Address } from "viem";
import { createHedgixWriteClient } from "./client";
import { waitForAcceptedExecution } from "./transactions";
import type {
  ActiveWalletConnector,
  Eip1193Provider,
  PurchaseInput,
  TransactionProgress,
  WriteContext,
} from "./types";

type ProgressCallback = (progress: TransactionProgress) => void;
type ContractArg = string | number | bigint | boolean;
export type HedgixWriteClient = ReturnType<typeof createHedgixWriteClient>;
export type HedgixWriteClientFactory = (input: {
  account: Address;
  provider: Eip1193Provider;
}) => HedgixWriteClient;
export type HedgixWriteOptions = {
  createWriteClient?: HedgixWriteClientFactory;
  confirmTransaction?: typeof waitForAcceptedExecution;
};

function safeStringify(value: unknown): string {
  return (
    JSON.stringify(
      value,
      (_key, child) => (typeof child === "bigint" ? child.toString() : child),
      2,
    ) ?? String(value)
  );
}

export function normalizeWalletAddress(address: unknown): string | null {
  if (typeof address !== "string" || !isAddress(address)) return null;
  return address.toLowerCase();
}

export function parseProviderChainId(value: unknown): number {
  let parsed: number;
  if (typeof value === "number" && Number.isInteger(value)) {
    parsed = value;
  } else if (typeof value === "bigint") {
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error(`WALLET_PROVIDER_CHAIN_UNAVAILABLE: ${String(value)}`);
    }
    parsed = Number(value);
  } else if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^0x[0-9a-fA-F]+$/.test(trimmed)) {
      parsed = Number.parseInt(trimmed, 16);
    } else if (/^\d+$/.test(trimmed)) {
      parsed = Number.parseInt(trimmed, 10);
    } else {
      throw new Error(`WALLET_PROVIDER_CHAIN_UNAVAILABLE: ${trimmed}`);
    }
  } else {
    throw new Error(`WALLET_PROVIDER_CHAIN_UNAVAILABLE: ${safeStringify(value)}`);
  }
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`WALLET_PROVIDER_CHAIN_UNAVAILABLE: ${String(value)}`);
  }
  return parsed;
}

export function isEip1193Provider(provider: unknown): provider is Eip1193Provider {
  return (
    typeof provider === "object" &&
    provider !== null &&
    typeof (provider as { request?: unknown }).request === "function"
  );
}

async function getActiveConnectorProvider(
  activeConnector: ActiveWalletConnector | null | undefined,
): Promise<Eip1193Provider> {
  if (!activeConnector || typeof activeConnector.getProvider !== "function") {
    throw new Error("ACTIVE_CONNECTOR_UNAVAILABLE");
  }
  const provider = await activeConnector.getProvider();
  if (!isEip1193Provider(provider)) {
    throw new Error("WALLET_PROVIDER_UNAVAILABLE");
  }
  return provider;
}

async function getProviderAccounts(provider: Eip1193Provider): Promise<string[]> {
  const accounts = await provider.request({ method: "eth_accounts" });
  if (!Array.isArray(accounts)) {
    throw new Error("WALLET_PROVIDER_UNAVAILABLE: invalid eth_accounts response");
  }
  return accounts.map((account) => {
    const normalized = normalizeWalletAddress(account);
    if (!normalized) {
      throw new Error("WALLET_PROVIDER_UNAVAILABLE: invalid provider account");
    }
    return normalized;
  });
}

async function getProviderChainId(provider: Eip1193Provider): Promise<number> {
  return parseProviderChainId(await provider.request({ method: "eth_chainId" }));
}

function requireSelectedAccount(address: WriteContext["address"]): {
  account: Address;
  normalizedAccount: string;
} {
  const normalizedAccount = normalizeWalletAddress(address);
  if (!address || !normalizedAccount) {
    throw new Error("WALLET_NOT_CONNECTED");
  }
  return { account: address, normalizedAccount };
}

export async function prepareHedgixWriteClient(
  context: WriteContext,
  createWriteClient: HedgixWriteClientFactory = createHedgixWriteClient,
) {
  const { account, normalizedAccount } = requireSelectedAccount(context.address);
  const provider = await getActiveConnectorProvider(context.activeConnector);
  const providerAccounts = await getProviderAccounts(provider);
  if (!providerAccounts.includes(normalizedAccount)) {
    throw new Error("WALLET_ACCOUNT_MISMATCH");
  }
  const providerChainId = await getProviderChainId(provider);
  if (providerChainId !== BRADBURY_CHAIN_ID) {
    throw new Error(`WRONG_NETWORK: expected ${BRADBURY_CHAIN_ID}, received ${providerChainId}`);
  }
  if (context.chainId !== undefined && context.chainId !== BRADBURY_CHAIN_ID) {
    throw new Error(`WRONG_NETWORK: wagmi selected ${context.chainId}`);
  }
  return {
    account,
    provider,
    providerAccounts,
    providerChainId,
    client: createWriteClient({ account, provider }),
  };
}

export function extractTransactionHash(raw: unknown): Hash {
  if (typeof raw === "string" && /^0x[0-9a-fA-F]+$/.test(raw)) {
    return raw as Hash;
  }
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    for (const key of [
      "hash",
      "txHash",
      "transactionHash",
      "txId",
      "transactionId",
      "transaction_hash",
    ]) {
      const value = record[key];
      if (typeof value === "string" && /^0x[0-9a-fA-F]+$/.test(value)) {
        return value as Hash;
      }
    }
  }
  throw new Error(`TRANSACTION_HASH_MISSING: ${safeStringify(raw)}`);
}

function debugWrite(label: string, detail: Record<string, unknown>) {
  if (!import.meta.env.DEV) return;
  console.debug(`[hedgix:write] ${label}`, detail);
}

export function logDevelopmentWriteError(
  label: string,
  error: unknown,
  detail: Record<string, unknown>,
) {
  if (!import.meta.env.DEV) return;
  console.error(`[hedgix:write] ${label}`, { ...detail, error });
}

export async function writeHedgixContract({
  context,
  functionName,
  args = [],
  value = 0n,
  onProgress,
  createWriteClient,
  confirmTransaction = waitForAcceptedExecution,
}: {
  context: WriteContext;
  functionName: string;
  args?: ContractArg[];
  value?: bigint;
  onProgress?: ProgressCallback;
} & HedgixWriteOptions) {
  onProgress?.({ stage: "awaiting_signature" });
  const safeArgs = args.map((item) => (typeof item === "bigint" ? item.toString() : item));
  const baseLogDetail = {
    account: context.address ?? "not connected",
    wagmiChainId: context.chainId ?? "unknown",
    functionName,
    args: safeArgs,
    value: value.toString(),
  };
  try {
    const address = requireContractAddress();
    const { account, client, providerChainId } = await prepareHedgixWriteClient(
      context,
      createWriteClient,
    );
    debugWrite("submitting", {
      ...baseLogDetail,
      account,
      providerChainId,
      contractAddress: address,
    });
    const rawWriteResult = await client.writeContract({
      address,
      functionName,
      args,
      value,
    });
    debugWrite("submitted", { functionName, rawWriteResult });
    const hash = extractTransactionHash(rawWriteResult);
    const submittedAt = new Date().toISOString();
    const technicalDetails = safeStringify({
      account,
      chainId: providerChainId,
      contractAddress: address,
      functionName,
      args: safeArgs,
      value: value.toString(),
      rawWriteResult,
    });
    onProgress?.({
      stage: "submitted",
      hash,
      status: "SUBMITTED",
      explorerUrl: explorerTransactionUrl(hash),
      checkedAt: submittedAt,
      technicalDetails,
    });
    onProgress?.({
      stage: "consensus",
      hash,
      status: "WAITING_FOR_ACCEPTED",
      explorerUrl: explorerTransactionUrl(hash),
      checkedAt: submittedAt,
      technicalDetails,
    });
    const receipt = await confirmTransaction({ client, hash, onProgress });
    onProgress?.({
      stage: "accepted",
      hash,
      status: "ACCEPTED",
      receipt,
      explorerUrl: explorerTransactionUrl(hash),
      checkedAt: new Date().toISOString(),
      technicalDetails,
    });
    return { hash, receipt };
  } catch (error) {
    logDevelopmentWriteError("submission failed", error, baseLogDetail);
    throw error;
  }
}

export function purchaseProtection(
  context: WriteContext,
  input: PurchaseInput,
  onProgress?: ProgressCallback,
  options?: HedgixWriteOptions,
) {
  return writeHedgixContract({
    context,
    functionName: HEDGIX_METHODS.purchaseProtection,
    args: [
      input.protectedAsset,
      input.protectionType,
      input.eventLevel,
      BigInt(input.durationDays),
    ],
    value: input.premiumWei,
    onProgress,
    ...options,
  });
}

export function cancelProtection(
  context: WriteContext,
  protectionId: string,
  onProgress?: ProgressCallback,
  options?: HedgixWriteOptions,
) {
  return writeHedgixContract({
    context,
    functionName: HEDGIX_METHODS.cancelProtection,
    args: [BigInt(protectionId)],
    onProgress,
    ...options,
  });
}

export function claimPayout(
  context: WriteContext,
  protectionId: string,
  onProgress?: ProgressCallback,
  options?: HedgixWriteOptions,
) {
  return writeHedgixContract({
    context,
    functionName: HEDGIX_METHODS.claimPayout,
    args: [BigInt(protectionId)],
    onProgress,
    ...options,
  });
}

export function settleProtectionDay(
  context: WriteContext,
  protectionId: string,
  settlementDate: string,
  onProgress?: ProgressCallback,
  options?: HedgixWriteOptions,
) {
  return writeHedgixContract({
    context,
    functionName: HEDGIX_METHODS.settleProtectionDay,
    args: [BigInt(protectionId), settlementDate],
    onProgress,
    ...options,
  });
}

export function addPoolFunds(
  context: WriteContext,
  amountWei: bigint,
  onProgress?: ProgressCallback,
  options?: HedgixWriteOptions,
) {
  return writeHedgixContract({
    context,
    functionName: HEDGIX_METHODS.addPoolFunds,
    value: amountWei,
    onProgress,
    ...options,
  });
}

export function withdrawFromPoolGen(
  context: WriteContext,
  amountGen: bigint,
  onProgress?: ProgressCallback,
  options?: HedgixWriteOptions,
) {
  return writeHedgixContract({
    context,
    functionName: HEDGIX_METHODS.withdrawFromPoolGen,
    args: [amountGen],
    onProgress,
    ...options,
  });
}

export function setSettlementOperator(
  context: WriteContext,
  operatorAddress: string,
  onProgress?: ProgressCallback,
  options?: HedgixWriteOptions,
) {
  return writeHedgixContract({
    context,
    functionName: HEDGIX_METHODS.setSettlementOperator,
    args: [operatorAddress],
    onProgress,
    ...options,
  });
}

export function pauseContract(
  context: WriteContext,
  onProgress?: ProgressCallback,
  options?: HedgixWriteOptions,
) {
  return writeHedgixContract({
    context,
    functionName: HEDGIX_METHODS.pauseContract,
    onProgress,
    ...options,
  });
}

export function unpauseContract(
  context: WriteContext,
  onProgress?: ProgressCallback,
  options?: HedgixWriteOptions,
) {
  return writeHedgixContract({
    context,
    functionName: HEDGIX_METHODS.unpauseContract,
    onProgress,
    ...options,
  });
}
