import {
  ExecutionResult,
  TransactionStatus,
  executionResultNumberToName,
  transactionsStatusNumberToName,
  type Hash,
} from "genlayer-js/types";
import { explorerTransactionUrl } from "@/config/chains";
import type { GenLayerReceiptResult, TransactionProgress, TransactionStage } from "./types";

const statusToStage: Record<string, TransactionStage> = {
  UNINITIALIZED: "preparing",
  SUBMITTED: "submitted",
  PENDING: "submitted",
  PROPOSING: "consensus",
  COMMITTING: "consensus",
  REVEALING: "consensus",
  ACCEPTED: "accepted",
  FINALIZED: "accepted",
  CANCELED: "cancelled",
  UNDETERMINED: "undetermined",
  VALIDATORS_TIMEOUT: "timeout",
  LEADER_TIMEOUT: "timeout",
  READY_TO_FINALIZE: "accepted",
  APPEAL_REVEALING: "consensus",
  APPEAL_COMMITTING: "consensus",
};

export const STATE_CONFIRMATION_BACKOFF_MS = [2000, 3000, 5000, 8000, 10000] as const;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

export function normalizeTransactionStatus(transaction: GenLayerReceiptResult): string | undefined {
  if (typeof transaction.statusName === "string") return transaction.statusName;
  if (typeof transaction.status === "string") {
    return transaction.status in statusToStage
      ? transaction.status
      : transactionsStatusNumberToName[
          transaction.status as keyof typeof transactionsStatusNumberToName
        ];
  }
  if (typeof transaction.status === "number") {
    return transactionsStatusNumberToName[
      String(transaction.status) as keyof typeof transactionsStatusNumberToName
    ];
  }
  return undefined;
}

export function progressFromStatus(hash: string, status?: string): TransactionProgress {
  return {
    stage: status ? (statusToStage[status] ?? "submitted") : "submitted",
    hash: hash as Hash,
    status,
    explorerUrl: explorerTransactionUrl(hash),
    checkedAt: new Date().toISOString(),
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export type StateConfirmationResult<T> =
  | { outcome: "confirmed"; value: T; attempts: number }
  | { outcome: "pending"; attempts: number; error: unknown; technicalDetails: string };

export async function retryStateConfirmation<T>({
  read,
  isConfirmed,
  backoffMs = STATE_CONFIRMATION_BACKOFF_MS,
  onAttempt,
}: {
  read: () => Promise<T>;
  isConfirmed: (value: T) => boolean;
  backoffMs?: readonly number[];
  onAttempt?: (attempt: number) => void;
}): Promise<StateConfirmationResult<T>> {
  let lastError: unknown = new Error("STATE_CONFIRMATION_FAILED: expected state was not found");

  for (let index = 0; index < backoffMs.length; index += 1) {
    await sleep(backoffMs[index]);
    const attempt = index + 1;
    onAttempt?.(attempt);
    try {
      const value = await read();
      if (isConfirmed(value)) {
        return { outcome: "confirmed", value, attempts: attempt };
      }
      lastError = new Error(
        `STATE_CONFIRMATION_PENDING: expected state was not found on attempt ${attempt}`,
      );
    } catch (error) {
      lastError = error;
    }
  }

  return {
    outcome: "pending",
    attempts: backoffMs.length,
    error: lastError,
    technicalDetails: safeStringify({
      code: "STATE_CONFIRMATION_FAILED",
      attempts: backoffMs.length,
      error: errorMessage(lastError),
    }),
  };
}

export function assertAcceptedExecution(receipt: GenLayerReceiptResult): GenLayerReceiptResult {
  const execution =
    receipt.txExecutionResultName ??
    (typeof receipt.txExecutionResult === "number"
      ? executionResultNumberToName[
          String(receipt.txExecutionResult) as keyof typeof executionResultNumberToName
        ]
      : undefined);
  if (execution === ExecutionResult.FINISHED_WITH_RETURN || execution === "FINISHED_WITH_RETURN") {
    return receipt;
  }
  if (execution === ExecutionResult.FINISHED_WITH_ERROR || execution === "FINISHED_WITH_ERROR") {
    throw new Error("FINISHED_WITH_ERROR");
  }
  throw new Error(`TRANSACTION_EXECUTION_RESULT_MISSING: ${safeStringify(receipt)}`);
}

export async function waitForAcceptedExecution({
  client,
  hash,
  onProgress,
}: {
  client: {
    getTransaction: (args: { hash: Hash }) => Promise<GenLayerReceiptResult>;
    debugTraceTransaction?: (args: { hash: Hash; round?: number }) => Promise<unknown>;
    waitForTransactionReceipt: (args: {
      hash: Hash;
      status: TransactionStatus;
      interval?: number;
      retries?: number;
    }) => Promise<GenLayerReceiptResult>;
  };
  hash: `0x${string}`;
  onProgress?: (progress: TransactionProgress) => void;
}) {
  let lastTransaction: GenLayerReceiptResult | null = null;

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const transaction = await client.getTransaction({ hash: hash as Hash });
    lastTransaction = transaction;
    const status = normalizeTransactionStatus(transaction);
    onProgress?.(progressFromStatus(hash, status));

    if (status === TransactionStatus.CANCELED || status === "CANCELED") {
      throw new Error(`TRANSACTION_CANCELLED: ${hash}`);
    }
    if (status === TransactionStatus.UNDETERMINED || status === "UNDETERMINED") {
      throw new Error(`TRANSACTION_UNDETERMINED: ${hash}`);
    }
    if (
      status === TransactionStatus.VALIDATORS_TIMEOUT ||
      status === TransactionStatus.LEADER_TIMEOUT
    ) {
      throw new Error(`TRANSACTION_TIMEOUT: ${hash}`);
    }
    if (
      status === TransactionStatus.ACCEPTED ||
      status === TransactionStatus.FINALIZED ||
      status === TransactionStatus.READY_TO_FINALIZE ||
      status === "ACCEPTED" ||
      status === "FINALIZED"
    ) {
      try {
        const accepted = assertAcceptedExecution(transaction);
        onProgress?.({
          stage: "accepted",
          hash: hash as Hash,
          status: status ?? "ACCEPTED",
          receipt: accepted,
          explorerUrl: explorerTransactionUrl(hash),
          checkedAt: new Date().toISOString(),
        });
        return accepted;
      } catch (error) {
        if (String(error).includes("FINISHED_WITH_ERROR")) {
          const details = await traceExecutionError(client, hash as Hash, transaction);
          throw new Error(details);
        }
        throw error;
      }
    }
    await sleep(3000);
  }

  onProgress?.({
    stage: "timeout",
    hash: hash as Hash,
    status: normalizeTransactionStatus(lastTransaction ?? {}) ?? "TIMEOUT",
    receipt: lastTransaction ?? undefined,
    explorerUrl: explorerTransactionUrl(hash),
    checkedAt: new Date().toISOString(),
  });
  throw new Error(`TRANSACTION_TIMEOUT: ${hash}`);
}

async function traceExecutionError(
  client: {
    debugTraceTransaction?: (args: { hash: Hash; round?: number }) => Promise<unknown>;
  },
  hash: Hash,
  receipt: GenLayerReceiptResult,
): Promise<string> {
  if (!client.debugTraceTransaction) {
    return `FINISHED_WITH_ERROR: ${safeStringify(receipt)}`;
  }
  try {
    const trace = await client.debugTraceTransaction({ hash, round: 0 });
    const text = safeStringify(trace);
    return `FINISHED_WITH_ERROR: ${text}`;
  } catch (error) {
    return `FINISHED_WITH_ERROR: ${error instanceof Error ? error.message : String(error)} ${safeStringify(receipt)}`;
  }
}

export function extractProtectionIdFromReceipt(receipt: unknown): string | null {
  const seen = new Set<unknown>();
  const candidates: string[] = [];

  function visit(value: unknown, key = "") {
    if (value === null || value === undefined || seen.has(value)) return;
    if (typeof value === "object") seen.add(value);
    if (typeof value === "bigint" || typeof value === "number") {
      const text = String(value);
      if (/^[1-9]\d*$/.test(text)) candidates.push(text);
      return;
    }
    if (typeof value === "string") {
      if (/^[1-9]\d*$/.test(value) && /return|result|value|data|calldata|output/i.test(key)) {
        candidates.push(value);
      }
      try {
        visit(JSON.parse(value), key);
      } catch {
        // Not JSON; ignore.
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${key}.${index}`));
      return;
    }
    if (typeof value === "object") {
      Object.entries(value as Record<string, unknown>).forEach(([childKey, child]) => {
        visit(child, `${key}.${childKey}`);
      });
    }
  }

  visit(receipt);
  return candidates.length === 1 ? candidates[0] : null;
}

export function findNewProtectionId(before: string[], after: string[]): string | null {
  const beforeSet = new Set(before.map(String));
  const added = after.map(String).filter((id) => !beforeSet.has(id));
  return added.length === 1 ? added[0] : null;
}
