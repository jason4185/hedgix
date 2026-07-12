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
  retryStateConfirmation,
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
  const [retryStateCheck, setRetryStateCheck] = useState<(() => Promise<void>) | null>(null);

  const noteProgress = useCallback((progress: TransactionProgress) => {
    setTransactionOpen(true);
    setTransactionProgress((previous) => ({ ...previous, ...progress }));
  }, []);

  function beginTransaction(action: string) {
    setTransactionAction(action);
    setTransactionError(null);
    setRetryStateCheck(null);
    setTransactionOpen(true);
    setTransactionProgress({ stage: "preparing" });
  }

  function failTransaction(error: unknown) {
    const mapped = mapHedgixError(error);
    if (mapped.code === "STATE_CONFIRMATION_FAILED" && transactionProgress.hash) {
      setTransactionError(null);
      setTransactionOpen(true);
      setTransactionProgress((previous) => ({
        ...previous,
        stage: "confirming",
        outcome: "accepted_syncing",
        status: previous.status ?? "ACCEPTED",
        warning: "Latest state not available yet",
        detail:
          "The transaction is already accepted on-chain, but Hedgix could not load the updated contract state yet. Do not submit it again.",
        stateConfirmationDetails: mapped.raw,
        checkedAt: new Date().toISOString(),
      }));
      return;
    }
    setTransactionError(mapped);
    setTransactionOpen(true);
    setTransactionProgress((previous) => ({
      ...previous,
      stage: extractErrorCode(error) === "USER_REJECTED" ? "cancelled" : "failed",
      outcome: "true_failure",
      failedStage:
        extractErrorCode(error) === "USER_REJECTED"
          ? "awaiting_signature"
          : previous.stage === "consensus" ||
              previous.stage === "proposing" ||
              previous.stage === "committing" ||
              previous.stage === "revealing" ||
              previous.stage === "accepted"
            ? "consensus"
            : previous.stage === "submitted" || previous.stage === "awaiting_signature"
              ? "submitted"
              : "preparing",
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
    noteProgress({
      stage: "confirming",
      outcome: "accepted_syncing",
      status: "ACCEPTED",
      detail,
      warning: undefined,
      stateConfirmationDetails: undefined,
      checkedAt: new Date().toISOString(),
    });
  }

  function completeState(detail: string) {
    setRetryStateCheck(null);
    noteProgress({
      stage: "completed",
      outcome: "completed",
      detail,
      checkedAt: new Date().toISOString(),
    });
  }

  function requirePolicyOwner(policy: { owner: string }, walletAddress: string) {
    if (policy.owner.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new Error("NOT_PROTECTION_OWNER");
    }
  }

  function markAcceptedSyncing(details: string) {
    setTransactionError(null);
    noteProgress({
      stage: "confirming",
      outcome: "accepted_syncing",
      status: "ACCEPTED",
      warning: "Latest state not available yet",
      detail:
        "The transaction is already accepted on-chain, but Hedgix could not load the updated contract state yet. Do not submit it again.",
      stateConfirmationDetails: details,
      checkedAt: new Date().toISOString(),
    });
  }

  async function confirmAcceptedState<T>({
    pendingDetail,
    completeDetail,
    read,
    isConfirmed,
  }: {
    pendingDetail: string;
    completeDetail: string;
    read: () => Promise<T>;
    isConfirmed: (value: T) => boolean;
  }): Promise<T | null> {
    confirmState(pendingDetail);
    const result = await retryStateConfirmation({
      read,
      isConfirmed,
      onAttempt: (attempt) => {
        confirmState(`${pendingDetail} State check ${attempt} is in progress.`);
      },
    });
    if (result.outcome === "confirmed") {
      completeState(completeDetail);
      return result.value;
    }
    markAcceptedSyncing(result.technicalDetails);
    return null;
  }

  const purchase = useMutation({
    mutationFn: async (input: PurchaseInput) => {
      beginTransaction("Purchase protection");
      const writeContext = await context();
      const beforeIds = await getMyProtectionIds(writeContext.address);
      const submitted = await purchaseProtection(writeContext, input, noteProgress);
      const receiptId = extractProtectionIdFromReceipt(submitted.receipt);
      const checkPurchaseState = async () => {
        const afterIds = await getMyProtectionIds(writeContext.address);
        const protectionId = receiptId ?? findNewProtectionId(beforeIds, afterIds);
        if (!protectionId) return { protectionId: null, policy: null };
        const policy = await getProtection(protectionId, writeContext.address);
        if (policy.owner.toLowerCase() !== writeContext.address.toLowerCase()) {
          throw new Error("STATE_CONFIRMATION_FAILED: created protection owner mismatch");
        }
        return { protectionId, policy };
      };
      const retryPurchaseState = async () => {
        await confirmAcceptedState({
          pendingDetail:
            "GenLayer accepted this transaction. Hedgix is checking the latest contract state.",
          completeDetail: "The created protection was confirmed on-chain.",
          read: checkPurchaseState,
          isConfirmed: (value) => Boolean(value.protectionId && value.policy),
        });
        refresh();
      };
      setRetryStateCheck(() => retryPurchaseState);
      const confirmed = await confirmAcceptedState({
        pendingDetail:
          "GenLayer accepted this transaction. Hedgix is checking the latest contract state.",
        completeDetail: "The created protection was confirmed on-chain.",
        read: checkPurchaseState,
        isConfirmed: (value) => Boolean(value.protectionId && value.policy),
      });
      return {
        ...submitted,
        protectionId: confirmed?.protectionId ?? null,
        policy: confirmed?.policy ?? null,
        stateConfirmed: Boolean(confirmed),
      };
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
      const checkCancelState = () => getProtection(protectionId, writeContext.address);
      const retryCancelState = async () => {
        await confirmAcceptedState({
          pendingDetail:
            "GenLayer accepted this transaction. Hedgix is checking the latest contract state.",
          completeDetail: "The protection status is confirmed as cancelled.",
          read: checkCancelState,
          isConfirmed: (value) => value.status === "CANCELLED",
        });
        refresh();
      };
      setRetryStateCheck(() => retryCancelState);
      const confirmed = await confirmAcceptedState({
        pendingDetail:
          "GenLayer accepted this transaction. Hedgix is checking the latest contract state.",
        completeDetail: "The protection status is confirmed as cancelled.",
        read: checkCancelState,
        isConfirmed: (value) => value.status === "CANCELLED",
      });
      return { ...submitted, policy: confirmed, stateConfirmed: Boolean(confirmed) };
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
      const checkClaimState = () => getProtection(protectionId, writeContext.address);
      const retryClaimState = async () => {
        await confirmAcceptedState({
          pendingDetail:
            "GenLayer accepted this transaction. Hedgix is checking the latest contract state.",
          completeDetail: "The payout status is confirmed on-chain.",
          read: checkClaimState,
          isConfirmed: (value) => value.status === "PAID",
        });
        refresh();
      };
      setRetryStateCheck(() => retryClaimState);
      const confirmed = await confirmAcceptedState({
        pendingDetail:
          "GenLayer accepted this transaction. Hedgix is checking the latest contract state.",
        completeDetail: "The payout status is confirmed on-chain.",
        read: checkClaimState,
        isConfirmed: (value) => value.status === "PAID",
      });
      return { ...submitted, policy: confirmed, stateConfirmed: Boolean(confirmed) };
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
      const checkSettleState = () => getProtection(protectionId, writeContext.address);
      const retrySettleState = async () => {
        await confirmAcceptedState({
          pendingDetail:
            "GenLayer accepted this transaction. Hedgix is checking the latest contract state.",
          completeDetail: "The settlement update was confirmed on-chain.",
          read: checkSettleState,
          isConfirmed: (value) => value.last_settled_date === settlementDate,
        });
        refresh();
      };
      setRetryStateCheck(() => retrySettleState);
      const confirmed = await confirmAcceptedState({
        pendingDetail:
          "GenLayer accepted this transaction. Hedgix is checking the latest contract state.",
        completeDetail: "The settlement update was confirmed on-chain.",
        read: checkSettleState,
        isConfirmed: (value) => value.last_settled_date === settlementDate,
      });
      return { ...submitted, policy: confirmed, stateConfirmed: Boolean(confirmed) };
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
      const retryPoolState = async () => {
        await confirmAcceptedState({
          pendingDetail:
            "GenLayer accepted this transaction. Hedgix is checking the latest contract state.",
          completeDetail: "The pool update was confirmed on-chain.",
          read: () => getPoolStatus(writeContext.address),
          isConfirmed: () => true,
        });
        refresh();
      };
      setRetryStateCheck(() => retryPoolState);
      const confirmed = await confirmAcceptedState({
        pendingDetail:
          "GenLayer accepted this transaction. Hedgix is checking the latest contract state.",
        completeDetail: "The pool update was confirmed on-chain.",
        read: () => getPoolStatus(writeContext.address),
        isConfirmed: () => true,
      });
      return { ...submitted, stateConfirmed: Boolean(confirmed) };
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
      const retryPoolState = async () => {
        await confirmAcceptedState({
          pendingDetail:
            "GenLayer accepted this transaction. Hedgix is checking the latest contract state.",
          completeDetail: "The withdrawal was confirmed on-chain.",
          read: () => getPoolStatus(writeContext.address),
          isConfirmed: () => true,
        });
        refresh();
      };
      setRetryStateCheck(() => retryPoolState);
      const confirmed = await confirmAcceptedState({
        pendingDetail:
          "GenLayer accepted this transaction. Hedgix is checking the latest contract state.",
        completeDetail: "The withdrawal was confirmed on-chain.",
        read: () => getPoolStatus(writeContext.address),
        isConfirmed: () => true,
      });
      return { ...submitted, stateConfirmed: Boolean(confirmed) };
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
      const retryOperatorState = async () => {
        await confirmAcceptedState({
          pendingDetail:
            "GenLayer accepted this transaction. Hedgix is checking the latest contract state.",
          completeDetail: "The settlement operator was confirmed on-chain.",
          read: () => getSettlementOperator(writeContext.address),
          isConfirmed: (value) => value.toLowerCase() === operatorAddress.toLowerCase(),
        });
        refresh();
      };
      setRetryStateCheck(() => retryOperatorState);
      const confirmed = await confirmAcceptedState({
        pendingDetail:
          "GenLayer accepted this transaction. Hedgix is checking the latest contract state.",
        completeDetail: "The settlement operator was confirmed on-chain.",
        read: () => getSettlementOperator(writeContext.address),
        isConfirmed: (value) => value.toLowerCase() === operatorAddress.toLowerCase(),
      });
      return { ...submitted, stateConfirmed: Boolean(confirmed) };
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
      const retryPauseState = async () => {
        await confirmAcceptedState({
          pendingDetail:
            "GenLayer accepted this transaction. Hedgix is checking the latest contract state.",
          completeDetail: "The contract pause status was confirmed.",
          read: () => isPaused(writeContext.address),
          isConfirmed: Boolean,
        });
        refresh();
      };
      setRetryStateCheck(() => retryPauseState);
      const confirmed = await confirmAcceptedState({
        pendingDetail:
          "GenLayer accepted this transaction. Hedgix is checking the latest contract state.",
        completeDetail: "The contract pause status was confirmed.",
        read: () => isPaused(writeContext.address),
        isConfirmed: Boolean,
      });
      return { ...submitted, stateConfirmed: Boolean(confirmed) };
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
      const retryUnpauseState = async () => {
        await confirmAcceptedState({
          pendingDetail:
            "GenLayer accepted this transaction. Hedgix is checking the latest contract state.",
          completeDetail: "The contract resume status was confirmed.",
          read: () => isPaused(writeContext.address),
          isConfirmed: (value) => !value,
        });
        refresh();
      };
      setRetryStateCheck(() => retryUnpauseState);
      const confirmed = await confirmAcceptedState({
        pendingDetail:
          "GenLayer accepted this transaction. Hedgix is checking the latest contract state.",
        completeDetail: "The contract resume status was confirmed.",
        read: () => isPaused(writeContext.address),
        isConfirmed: (value) => !value,
      });
      return { ...submitted, stateConfirmed: Boolean(confirmed) };
    },
    onSuccess: refresh,
    onError: failTransaction,
    throwOnError: false,
  });

  async function continueCheckingStatus() {
    setTransactionError(null);
    if (retryStateCheck) {
      await retryStateCheck();
      return;
    }
    const hash = transactionProgress.hash;
    if (!hash) return;
    try {
      const client = createHedgixReadClient();
      await waitForAcceptedExecution({ client, hash, onProgress: noteProgress });
      noteProgress({
        stage: "confirming",
        outcome: "accepted_syncing",
        hash,
        status: "ACCEPTED",
        detail: "GenLayer accepted this transaction. Hedgix is checking the latest contract state.",
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
      blocksResubmission: transactionProgress.outcome === "accepted_syncing",
      setOpen: setTransactionOpen,
      reset: () => {
        setTransactionOpen(false);
        setTransactionProgress({ stage: "idle" });
        setTransactionError(null);
        setRetryStateCheck(null);
      },
      continueCheckingStatus,
    },
    mapError: toMutationError,
  };
}
