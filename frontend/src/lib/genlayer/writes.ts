import { HEDGIX_METHODS } from "@/config/contract";
import { BRADBURY_CHAIN_ID, explorerTransactionUrl } from "@/config/chains";
import { requireContractAddress } from "@/config/env";
import type { Hash } from "genlayer-js/types";
import { createHedgixWriteClient } from "./client";
import { waitForAcceptedExecution } from "./transactions";
import type { Eip1193Provider, PurchaseInput, TransactionProgress, WriteContext } from "./types";

type ProgressCallback = (progress: TransactionProgress) => void;

async function createConnectedClient(context: WriteContext) {
  if (context.chainId !== BRADBURY_CHAIN_ID) {
    throw new Error("WRONG_NETWORK");
  }
  return createHedgixWriteClient({
    account: context.address,
    provider: context.provider as Eip1193Provider,
  });
}

function safeStringify(value: unknown): string {
  return (
    JSON.stringify(
      value,
      (_key, child) => (typeof child === "bigint" ? child.toString() : child),
      2,
    ) ?? String(value)
  );
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

export async function writeHedgixContract({
  context,
  functionName,
  args = [],
  value = 0n,
  onProgress,
}: {
  context: WriteContext;
  functionName: string;
  args?: (string | number | bigint | boolean)[];
  value?: bigint;
  onProgress?: ProgressCallback;
}) {
  onProgress?.({ stage: "awaiting_signature" });
  const client = await createConnectedClient(context);
  const address = requireContractAddress();
  const safeArgs = args.map((item) => (typeof item === "bigint" ? item.toString() : item));
  debugWrite("submitting", {
    account: context.address,
    chainId: context.chainId,
    contractAddress: address,
    functionName,
    args: safeArgs,
    value: value.toString(),
  });
  let rawWriteResult: unknown;
  try {
    rawWriteResult = await client.writeContract({
      address,
      functionName,
      args,
      value,
    });
  } catch (error) {
    debugWrite("submission failed", {
      account: context.address,
      chainId: context.chainId,
      contractAddress: address,
      functionName,
      args: safeArgs,
      value: value.toString(),
      error,
    });
    throw error;
  }
  debugWrite("submitted", { functionName, rawWriteResult });
  const hash = extractTransactionHash(rawWriteResult);
  const submittedAt = new Date().toISOString();
  const technicalDetails = safeStringify({
    account: context.address,
    chainId: context.chainId,
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
  const receipt = await waitForAcceptedExecution({ client, hash, onProgress });
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
}

export function purchaseProtection(
  context: WriteContext,
  input: PurchaseInput,
  onProgress?: ProgressCallback,
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
  });
}

export function cancelProtection(
  context: WriteContext,
  protectionId: string,
  onProgress?: ProgressCallback,
) {
  return writeHedgixContract({
    context,
    functionName: HEDGIX_METHODS.cancelProtection,
    args: [BigInt(protectionId)],
    onProgress,
  });
}

export function claimPayout(
  context: WriteContext,
  protectionId: string,
  onProgress?: ProgressCallback,
) {
  return writeHedgixContract({
    context,
    functionName: HEDGIX_METHODS.claimPayout,
    args: [BigInt(protectionId)],
    onProgress,
  });
}

export function settleProtectionDay(
  context: WriteContext,
  protectionId: string,
  settlementDate: string,
  onProgress?: ProgressCallback,
) {
  return writeHedgixContract({
    context,
    functionName: HEDGIX_METHODS.settleProtectionDay,
    args: [BigInt(protectionId), settlementDate],
    onProgress,
  });
}

export function addPoolFunds(
  context: WriteContext,
  amountWei: bigint,
  onProgress?: ProgressCallback,
) {
  return writeHedgixContract({
    context,
    functionName: HEDGIX_METHODS.addPoolFunds,
    value: amountWei,
    onProgress,
  });
}

export function withdrawFromPoolGen(
  context: WriteContext,
  amountGen: bigint,
  onProgress?: ProgressCallback,
) {
  return writeHedgixContract({
    context,
    functionName: HEDGIX_METHODS.withdrawFromPoolGen,
    args: [amountGen],
    onProgress,
  });
}

export function setSettlementOperator(
  context: WriteContext,
  operatorAddress: string,
  onProgress?: ProgressCallback,
) {
  return writeHedgixContract({
    context,
    functionName: HEDGIX_METHODS.setSettlementOperator,
    args: [operatorAddress],
    onProgress,
  });
}

export function pauseContract(context: WriteContext, onProgress?: ProgressCallback) {
  return writeHedgixContract({
    context,
    functionName: HEDGIX_METHODS.pauseContract,
    onProgress,
  });
}

export function unpauseContract(context: WriteContext, onProgress?: ProgressCallback) {
  return writeHedgixContract({
    context,
    functionName: HEDGIX_METHODS.unpauseContract,
    onProgress,
  });
}
