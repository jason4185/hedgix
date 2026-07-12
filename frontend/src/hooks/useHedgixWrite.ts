import { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { runtimeEnv } from "@/config/env";
import { extractErrorCode, mapHedgixError } from "@/lib/genlayer/errors";
import {
  getMyProtectionIds,
  getPoolStatus,
  getProtection,
  getSettlementOperator,
  isPaused,
} from "@/lib/genlayer/reads";
import { createHedgixReadClient } from "@/lib/genlayer/client";
import {
  extractProtectionIdFromReceipt,
  findNewProtectionId,
  waitForAcceptedExecution,
} from "@/lib/genlayer/transactions";
import type { HedgixMappedError } from "@/lib/genlayer/errors";
import type { PurchaseInput, TransactionProgress, WriteContext } from "@/lib/genlayer/types";
import {
  addPoolFunds,
  cancelProtection,
  claimPayout,
  pauseContract,
  purchaseProtection,
  setSettlementOperator,
  settleProtectionDay,
  unpauseContract,
  withdrawFromPoolGen,
} from "@/lib/genlayer/writes";
import { useWalletState } from "./useWalletState";

type MutationError = HedgixMappedError & { cause?: unknown };

function toMutationError(error: unknown): MutationError {
  const mapped = mapHedgixError(error);
  return { ...mapped, cause: error };
}

export function useHedgixWrite() {
  const wallet = useWalletState();
  const queryClient = useQueryClient();
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [transactionProgress, setTransactionProgress] = useState<TransactionProgress>({
    stage: "idle",
  });
  const [transactionAction, setTransactionAction] = useState("Contract action");
  const [transactionError, setTransactionError] = useState<HedgixMappedError | null>(null);

  const noteProgress = useCallback((progress: TransactionProgress) => {
    setTransactionOpen(true);
    setTransactionProgress((previous) => ({ ...previous, ...progress }));
  }, []);

  function beginTransaction(action: string) {
    setTransactionAction(action);
    setTransactionError(null);
    setTransactionOpen(true);
    setTransactionProgress({ stage: "preparing" });
  }

  function failTransaction(error: unknown) {
    const mapped = mapHedgixError(error);
    setTransactionError(mapped);
    setTransactionOpen(true);
    setTransactionProgress((previous) => ({
      ...previous,
      stage: extractErrorCode(error) === "USER_REJECTED" ? "cancelled" : "failed",
      error: mapped.code,
      detail: mapped.description,
      technicalDetails: mapped.raw,
      checkedAt: new Date().toISOString(),
    }));
  }

  async function context(): Promise<WriteContext> {
    if (!runtimeEnv.contractConfigured) throw new Error("CONTRACT_ADDRESS_NOT_CONFIGURED");
    if (!wallet.isConnected) throw new Error("WALLET_NOT_CONNECTED");
    if (wallet.isWrongNetwork) throw new Error("WRONG_NETWORK");
    return wallet.getWriteContext();
  }

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["hedgix-contract"] });
  }

  function confirmState(detail: string) {
    noteProgress({ stage: "confirming", detail, checkedAt: new Date().toISOString() });
  }

  function completeState(detail: string) {
    noteProgress({ stage: "completed", detail, checkedAt: new Date().toISOString() });
  }

  function requirePolicyOwner(policy: { owner: string }, walletAddress: string) {
    if (policy.owner.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new Error("NOT_PROTECTION_OWNER");
    }
  }

  const purchase = useMutation({
    mutationFn: async (input: PurchaseInput) => {
      beginTransaction("Purchase protection");
      const writeContext = await context();
      const beforeIds = await getMyProtectionIds(writeContext.address);
      const submitted = await purchaseProtection(writeContext, input, noteProgress);
      confirmState("Reading the created protection from the contract.");
      const receiptId = extractProtectionIdFromReceipt(submitted.receipt);
      const afterIds = await getMyProtectionIds(writeContext.address);
      const protectionId = receiptId ?? findNewProtectionId(beforeIds, afterIds);
      const policy = protectionId ? await getProtection(protectionId, writeContext.address) : null;
      if (policy) {
        requirePolicyOwner(policy, writeContext.address);
      } else if (protectionId) {
        throw new Error("STATE_CONFIRMATION_FAILED: created protection could not be read");
      }
      if (!protectionId) {
        throw new Error("STATE_CONFIRMATION_FAILED: created protection ID was not identifiable");
      }
      completeState("The created protection was confirmed on-chain.");
      return { ...submitted, protectionId, policy };
    },
    onSuccess: refresh,
    onError: (error) => {
      failTransaction(error);
      refresh();
    },
    throwOnError: false,
  });

  const cancel = useMutation({
    mutationFn: async (protectionId: string) => {
      beginTransaction("Cancel protection");
      const writeContext = await context();
      const before = await getProtection(protectionId, writeContext.address);
      requirePolicyOwner(before, writeContext.address);
      if (before.status !== "ACTIVE") throw new Error("PROTECTION_NOT_ACTIVE");
      const submitted = await cancelProtection(writeContext, protectionId, noteProgress);
      confirmState("Reading the cancelled protection from the contract.");
      const after = await getProtection(protectionId, writeContext.address);
      if (after.status !== "CANCELLED") {
        throw new Error(`STATE_CONFIRMATION_FAILED: expected CANCELLED, received ${after.status}`);
      }
      completeState("The protection status is confirmed as cancelled.");
      return { ...submitted, policy: after };
    },
    onSuccess: refresh,
    onError: failTransaction,
    throwOnError: false,
  });

  const claim = useMutation({
    mutationFn: async (protectionId: string) => {
      beginTransaction("Claim payout");
      const writeContext = await context();
      const before = await getProtection(protectionId, writeContext.address);
      requirePolicyOwner(before, writeContext.address);
      if (before.status !== "TRIGGERED") throw new Error("PROTECTION_NOT_TRIGGERED");
      const submitted = await claimPayout(writeContext, protectionId, noteProgress);
      confirmState("Reading the paid protection from the contract.");
      const after = await getProtection(protectionId, writeContext.address);
      if (after.status !== "PAID") {
        throw new Error(`STATE_CONFIRMATION_FAILED: expected PAID, received ${after.status}`);
      }
      completeState("The payout status is confirmed on-chain.");
      return { ...submitted, policy: after };
    },
    onSuccess: refresh,
    onError: failTransaction,
    throwOnError: false,
  });

  const settle = useMutation({
    mutationFn: async ({
      protectionId,
      settlementDate,
    }: {
      protectionId: string;
      settlementDate: string;
    }) => {
      beginTransaction("Settle next eligible day");
      const writeContext = await context();
      const submitted = await settleProtectionDay(
        writeContext,
        protectionId,
        settlementDate,
        noteProgress,
      );
      confirmState("Reading the settled protection from the contract.");
      const after = await getProtection(protectionId, writeContext.address);
      if (after.last_settled_date !== settlementDate) {
        throw new Error(
          `STATE_CONFIRMATION_FAILED: expected settlement ${settlementDate}, received ${after.last_settled_date || "none"}`,
        );
      }
      completeState("The settlement update was confirmed on-chain.");
      return { ...submitted, policy: after };
    },
    onSuccess: refresh,
    onError: failTransaction,
    throwOnError: false,
  });

  const addFunds = useMutation({
    mutationFn: async (amountWei: bigint) => {
      beginTransaction("Add pool funds");
      const writeContext = await context();
      const submitted = await addPoolFunds(writeContext, amountWei, noteProgress);
      confirmState("Refreshing underwriting-pool status.");
      await getPoolStatus(writeContext.address);
      completeState("The pool update was confirmed on-chain.");
      return submitted;
    },
    onSuccess: refresh,
    onError: failTransaction,
    throwOnError: false,
  });

  const withdraw = useMutation({
    mutationFn: async (amountGen: bigint) => {
      beginTransaction("Withdraw available funds");
      const writeContext = await context();
      const submitted = await withdrawFromPoolGen(writeContext, amountGen, noteProgress);
      confirmState("Refreshing underwriting-pool status.");
      await getPoolStatus(writeContext.address);
      completeState("The withdrawal was confirmed on-chain.");
      return submitted;
    },
    onSuccess: refresh,
    onError: failTransaction,
    throwOnError: false,
  });

  const setOperator = useMutation({
    mutationFn: async (operatorAddress: string) => {
      beginTransaction("Set settlement operator");
      const writeContext = await context();
      const submitted = await setSettlementOperator(writeContext, operatorAddress, noteProgress);
      confirmState("Reading the settlement operator from the contract.");
      const current = await getSettlementOperator(writeContext.address);
      if (current.toLowerCase() !== operatorAddress.toLowerCase()) {
        throw new Error("STATE_CONFIRMATION_FAILED: settlement operator did not update");
      }
      completeState("The settlement operator was confirmed on-chain.");
      return submitted;
    },
    onSuccess: refresh,
    onError: failTransaction,
    throwOnError: false,
  });

  const pause = useMutation({
    mutationFn: async () => {
      beginTransaction("Pause contract");
      const writeContext = await context();
      const submitted = await pauseContract(writeContext, noteProgress);
      confirmState("Reading contract pause status.");
      if (!(await isPaused(writeContext.address))) {
        throw new Error("STATE_CONFIRMATION_FAILED: contract is not paused");
      }
      completeState("The contract pause status was confirmed.");
      return submitted;
    },
    onSuccess: refresh,
    onError: failTransaction,
    throwOnError: false,
  });

  const unpause = useMutation({
    mutationFn: async () => {
      beginTransaction("Resume contract");
      const writeContext = await context();
      const submitted = await unpauseContract(writeContext, noteProgress);
      confirmState("Reading contract pause status.");
      if (await isPaused(writeContext.address)) {
        throw new Error("STATE_CONFIRMATION_FAILED: contract is still paused");
      }
      completeState("The contract resume status was confirmed.");
      return submitted;
    },
    onSuccess: refresh,
    onError: failTransaction,
    throwOnError: false,
  });

  async function continueCheckingStatus() {
    const hash = transactionProgress.hash;
    if (!hash) return;
    setTransactionError(null);
    try {
      const client = createHedgixReadClient();
      await waitForAcceptedExecution({ client, hash, onProgress: noteProgress });
      noteProgress({
        stage: "accepted",
        hash,
        status: "ACCEPTED",
        detail:
          "GenLayer accepted the transaction. Refresh the policy or dashboard to confirm the latest contract state.",
        checkedAt: new Date().toISOString(),
      });
      refresh();
    } catch (error) {
      failTransaction(error);
    }
  }

  return {
    wallet,
    purchase,
    cancel,
    claim,
    settle,
    addFunds,
    withdraw,
    setOperator,
    pause,
    unpause,
    transaction: {
      open: transactionOpen,
      action: transactionAction,
      progress: transactionProgress,
      error: transactionError,
      setOpen: setTransactionOpen,
      reset: () => {
        setTransactionOpen(false);
        setTransactionProgress({ stage: "idle" });
        setTransactionError(null);
      },
      continueCheckingStatus,
    },
    mapError: toMutationError,
  };
}
