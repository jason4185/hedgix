import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { ContractErrorMessage, TechnicalDetails } from "./Feedback";
import type { HedgixMappedError } from "@/lib/genlayer/errors";
import type { TransactionProgress, TransactionStage } from "@/lib/genlayer/types";

type TransactionDialogProps = {
  open: boolean;
  actionTitle: string;
  actionDescription?: ReactNode;
  reviewItems?: { label: string; value: ReactNode }[];
  confirmLabel?: string;
  progress: TransactionProgress;
  error?: HedgixMappedError | null;
  onConfirm?: () => void;
  onOpenChange: (open: boolean) => void;
  onContinueChecking?: () => void;
};

const stageCopy: Record<TransactionStage, { title: string; body: string }> = {
  idle: {
    title: "Review action",
    body: "Review the details before opening your wallet.",
  },
  review: {
    title: "Review action",
    body: "Confirm the details before opening your wallet.",
  },
  preparing: {
    title: "Preparing transaction",
    body: "Hedgix is checking wallet, network, and contract readiness before requesting a signature.",
  },
  awaiting_signature: {
    title: "Confirm in your wallet",
    body: "Review and approve this transaction in your connected wallet. No transaction has been submitted yet.",
  },
  submitted: {
    title: "Transaction submitted",
    body: "Your transaction was submitted to GenLayer. Validators are now evaluating the contract execution.",
  },
  consensus: {
    title: "Waiting for GenLayer consensus",
    body: "Validators are evaluating the contract execution. A transaction hash alone is not treated as success.",
  },
  proposing: {
    title: "Validators are evaluating execution",
    body: "GenLayer validators are proposing execution results.",
  },
  committing: {
    title: "Validators are committing results",
    body: "Validator execution results are being committed.",
  },
  revealing: {
    title: "Validator results are being revealed",
    body: "GenLayer is comparing validator outputs before consensus.",
  },
  accepted: {
    title: "Transaction accepted",
    body: "GenLayer accepted this transaction. Hedgix is checking the latest contract state.",
  },
  confirming: {
    title: "Transaction accepted",
    body: "GenLayer accepted this transaction. Hedgix is checking the latest contract state.",
  },
  completed: {
    title: "Contract state confirmed",
    body: "The latest on-chain read confirms the action was completed.",
  },
  finalized: {
    title: "Transaction finalized",
    body: "The transaction has reached a finalized state.",
  },
  cancelled: {
    title: "Transaction cancelled",
    body: "No transaction was submitted, or the submitted transaction was cancelled.",
  },
  undetermined: {
    title: "Transaction result is undetermined",
    body: "GenLayer has not produced a conclusive result. Do not submit the action again automatically.",
  },
  failed: {
    title: "Transaction failed",
    body: "The action did not complete successfully.",
  },
  timeout: {
    title: "Transaction still being resolved",
    body: "GenLayer has not reached a final result yet. Do not submit this action again.",
  },
};

const flowStages: TransactionStage[] = [
  "preparing",
  "awaiting_signature",
  "submitted",
  "consensus",
  "accepted",
  "confirming",
  "completed",
];

const stageLabels: Record<TransactionStage, string> = {
  idle: "Review",
  review: "Review",
  preparing: "Preparing",
  awaiting_signature: "Awaiting signature",
  submitted: "Submitted",
  consensus: "Consensus",
  proposing: "Consensus",
  committing: "Consensus",
  revealing: "Consensus",
  accepted: "Accepted",
  confirming: "Confirming state",
  completed: "Completed",
  finalized: "Completed",
  cancelled: "Awaiting signature",
  undetermined: "Consensus",
  failed: "Failed",
  timeout: "Consensus",
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

export function TransactionDialog({
  open,
  actionTitle,
  actionDescription,
  reviewItems = [],
  confirmLabel = "Confirm action",
  progress,
  error,
  onConfirm,
  onOpenChange,
  onContinueChecking,
}: TransactionDialogProps) {
  const stage = progress.stage === "idle" ? "review" : progress.stage;
  const copy = stageCopy[stage] ?? stageCopy.submitted;
  const isReview = stage === "review";
  const isAcceptedSyncing = progress.outcome === "accepted_syncing";
  const statusTitle = isAcceptedSyncing ? "Transaction accepted" : copy.title;
  const statusBody = isAcceptedSyncing
    ? "GenLayer accepted this transaction. Hedgix is checking the latest contract state."
    : copy.body;
  const acceptedSyncingWarning = progress.warning ?? "Latest state not available yet";
  const isBusy = [
    "awaiting_signature",
    "preparing",
    "submitted",
    "consensus",
    "proposing",
    "committing",
    "revealing",
    "confirming",
  ].includes(stage);
  const isTerminal = [
    "completed",
    "finalized",
    "failed",
    "cancelled",
    "undetermined",
    "timeout",
  ].includes(stage);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/45 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-auto border-t border-hairline bg-paper p-5 shadow-xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4 md:left-1/2 md:top-1/2 md:bottom-auto md:w-[min(92vw,620px)] md:-translate-x-1/2 md:-translate-y-1/2 md:border md:p-6 md:data-[state=open]:zoom-in-95 md:data-[state=open]:slide-in-from-bottom-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-serif text-3xl leading-tight text-ink">
                {isReview ? actionTitle : statusTitle}
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted-ink">
                {isReview ? actionDescription : statusBody}
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-hairline text-ink hover:bg-ink/5"
              aria-label="Close transaction dialog"
            >
              <X size={16} aria-hidden="true" />
            </Dialog.Close>
          </div>

          <div className="sr-only" aria-live="polite">
            {statusTitle}
          </div>

          {reviewItems.length > 0 && (
            <dl className="mt-6 divide-y divide-hairline border-y border-hairline text-sm">
              {reviewItems.map((item) => (
                <div key={item.label} className="flex items-start justify-between gap-4 py-3">
                  <dt className="text-muted-ink">{item.label}</dt>
                  <dd className="max-w-[58%] break-words text-right font-medium tabular-nums text-ink">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {!isReview && (
            <div className="mt-6 space-y-5">
              <div className="border border-hairline bg-stone p-4 text-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-muted-ink">
                      Current status
                    </div>
                    <div className="mt-1 font-medium text-ink">
                      {isAcceptedSyncing ? "Accepted on-chain" : statusTitle}
                    </div>
                    {progress.detail && (
                      <p className="mt-1 text-xs leading-relaxed text-muted-ink">
                        {progress.detail}
                      </p>
                    )}
                  </div>
                  <div className="min-w-0 text-left text-xs text-muted-ink sm:text-right">
                    {progress.status && <div>Status: {String(progress.status)}</div>}
                    {progress.checkedAt && (
                      <div>Last checked: {new Date(progress.checkedAt).toLocaleTimeString()}</div>
                    )}
                  </div>
                </div>
              </div>
              <TransactionProgressLine
                stage={stage}
                busy={isBusy}
                hasHash={Boolean(progress.hash)}
                errorCode={error?.code}
                failedStage={progress.failedStage}
                acceptedSyncing={isAcceptedSyncing}
              />
              {progress.hash && (
                <div className="border border-hairline bg-paper p-4 text-xs">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-muted-ink">
                    Transaction
                  </div>
                  <div className="mt-2 break-all font-mono text-ink">{progress.hash}</div>
                  {progress.explorerUrl && (
                    <a
                      className="mt-3 inline-flex underline"
                      href={progress.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View transaction
                    </a>
                  )}
                </div>
              )}
              {isAcceptedSyncing && (
                <div className="border border-amber-deep/40 bg-amber/25 p-4 text-sm">
                  <div className="font-medium text-ink">{acceptedSyncingWarning}</div>
                  <p className="mt-2 leading-relaxed text-muted-ink">
                    The transaction is already accepted on-chain, but Hedgix could not load the
                    updated contract state yet. Do not submit it again.
                  </p>
                </div>
              )}
              {progress.technicalDetails && (
                <TechnicalDetails label="Submission details">
                  {progress.technicalDetails}
                </TechnicalDetails>
              )}
              {(progress.receipt || progress.stateConfirmationDetails) && (
                <TechnicalDetails label="Receipt/state-confirmation details">
                  {progress.receipt ? safeStringify(progress.receipt) : ""}
                  {progress.receipt && progress.stateConfirmationDetails ? "\n\n" : ""}
                  {progress.stateConfirmationDetails ?? ""}
                </TechnicalDetails>
              )}
            </div>
          )}

          {error && !isAcceptedSyncing && <ContractErrorMessage mapped={error} className="mt-5" />}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {isReview ? (
              <>
                <Dialog.Close className="border border-hairline px-4 py-2 text-sm text-ink hover:bg-ink/5">
                  Cancel
                </Dialog.Close>
                <button
                  type="button"
                  onClick={onConfirm}
                  className="bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/90"
                >
                  {confirmLabel}
                </button>
              </>
            ) : (
              <>
                {isAcceptedSyncing ? (
                  <button
                    type="button"
                    onClick={onContinueChecking}
                    className="bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/90"
                  >
                    Retry state check
                  </button>
                ) : stage === "timeout" || stage === "undetermined" ? (
                  <button
                    type="button"
                    onClick={onContinueChecking}
                    className="bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/90"
                  >
                    Continue checking status
                  </button>
                ) : null}
                {isAcceptedSyncing && progress.explorerUrl ? (
                  <a
                    className="border border-hairline px-4 py-2 text-center text-sm text-ink hover:bg-ink/5"
                    href={progress.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View transaction
                  </a>
                ) : null}
                <Dialog.Close
                  disabled={!isAcceptedSyncing && !isTerminal && isBusy}
                  className="border border-hairline px-4 py-2 text-sm text-ink hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isTerminal || isAcceptedSyncing ? "Close" : "Keep tracking"}
                </Dialog.Close>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TransactionProgressLine({
  stage,
  busy,
  hasHash,
  errorCode,
  failedStage,
  acceptedSyncing,
}: {
  stage: TransactionStage;
  busy: boolean;
  hasHash: boolean;
  errorCode?: string;
  failedStage?: TransactionStage;
  acceptedSyncing?: boolean;
}) {
  const failureStage =
    failedStage ??
    (stage === "cancelled" || errorCode === "USER_REJECTED"
      ? "awaiting_signature"
      : hasHash || stage === "timeout" || stage === "undetermined"
        ? "consensus"
        : "preparing");
  const displayStage = normalizeVisibleStage(
    ["failed", "timeout", "undetermined", "cancelled"].includes(stage) ? failureStage : stage,
  );
  const activeIndex = Math.max(0, flowStages.indexOf(displayStage));
  const failed =
    !acceptedSyncing && ["failed", "timeout", "undetermined", "cancelled"].includes(stage);

  return (
    <ol className="space-y-2 text-xs sm:grid sm:grid-cols-2 sm:gap-2 sm:space-y-0 lg:grid-cols-4">
      {flowStages.map((item, index) => {
        const complete = index < activeIndex || stage === "completed" || stage === "finalized";
        const active = item === displayStage || (busy && index === Math.max(activeIndex, 0));
        let itemClassName = "border-hairline bg-paper";
        if (failed && active) {
          itemClassName = "border-danger/50 bg-danger/10 text-danger";
        } else if (complete) {
          itemClassName = "border-success/40 bg-success/10 text-success";
        } else if (active) {
          itemClassName =
            item === "confirming"
              ? "border-amber-deep/50 bg-amber/25 text-ink"
              : "border-ink bg-ink text-paper";
        }
        return (
          <li
            key={item}
            className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-2 border px-3 py-3 text-center ${itemClassName}`}
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                failed && active
                  ? "bg-danger"
                  : complete
                    ? "bg-success"
                    : active
                      ? busy
                        ? item === "confirming"
                          ? "animate-pulse bg-amber-deep"
                          : "animate-pulse bg-paper"
                        : item === "confirming"
                          ? "bg-amber-deep"
                          : "bg-paper"
                      : "bg-muted-ink/40"
              }`}
              aria-hidden="true"
            />
            <span className="min-w-0 whitespace-normal break-words uppercase tracking-[0.14em]">
              {stageLabels[item]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function normalizeVisibleStage(stage: TransactionStage): TransactionStage {
  if (stage === "proposing" || stage === "committing" || stage === "revealing") return "consensus";
  if (stage === "finalized") return "completed";
  return stage;
}
