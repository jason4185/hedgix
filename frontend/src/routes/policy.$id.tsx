import { useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { AppLayout, PageHeader } from "@/components/hedgix/AppLayout";
import { ContractErrorMessage, LoadingState } from "@/components/hedgix/Feedback";
import { TransactionDialog } from "@/components/hedgix/TransactionDialog";
import { runtimeEnv } from "@/config/env";
import { useHedgixWrite } from "@/hooks/useHedgixWrite";
import { usePolicy, usePolicySettlement } from "@/hooks/useHedgixReads";
import {
  canCancel,
  canClaim,
  formatUsdPrice,
  formatUtcDate,
  formatUtcDateTime,
  policyDisplayName,
  productTypeLabel,
  readableSource,
  shortAddress,
  statusBadgeClass,
  statusLabel,
  triggerConditionLine,
  weiToGen,
  type ContractPolicy,
  type SettlementReadiness,
} from "@/lib/hedgix-data";
import { mapHedgixError } from "@/lib/genlayer/errors";

export const Route = createFileRoute("/policy/$id")({
  head: () => ({
    meta: [
      { title: "Policy Details — Hedgix" },
      {
        name: "description",
        content:
          "Stored Hedgix policy details, Locked reference price, settlement state, and actions.",
      },
    ],
  }),
  component: PolicyPage,
});

function PolicyPage() {
  const { id } = Route.useParams();
  const writer = useHedgixWrite();
  const policy = usePolicy(id, writer.wallet.address);
  const settlement = usePolicySettlement(id, writer.wallet.address);
  const loadedPolicy = policy.data;

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Protection details"
        title={
          loadedPolicy ? (
            <>{policyDisplayName(loadedPolicy)}</>
          ) : (
            <>
              Protection <span className="italic">details</span>.
            </>
          )
        }
        lede={
          loadedPolicy
            ? `${loadedPolicy.binance_settlement_symbol} · ${statusLabel(loadedPolicy.status)} · Protection reference ${id}`
            : "Review the stored coverage, trigger condition, settlement state, and available actions."
        }
      />
      <section className="border-b border-hairline bg-paper">
        <div className="mx-auto max-w-[1400px] px-6 py-16 md:px-10 md:py-24">
          {!runtimeEnv.contractConfigured ? (
            <Notice title="Contract address missing" body={runtimeEnv.contractError} />
          ) : !writer.wallet.isConnected ? (
            <Notice
              title="Connect your wallet"
              body="Connect a compatible browser wallet to view this protection and submit available actions."
              action={<ConnectButton />}
            />
          ) : policy.isLoading ? (
            <LoadingState
              title="Loading policy"
              body="Reading the stored policy from the Hedgix contract."
            />
          ) : policy.error ? (
            <ContractErrorMessage error={policy.error} />
          ) : policy.data ? (
            <PolicySections
              policy={policy.data}
              readiness={settlement.readiness.data ?? null}
              expectedDate={settlement.expectedDate.data ?? ""}
            />
          ) : (
            <Notice
              title="Policy not found"
              body="The contract did not return a policy for this ID."
            />
          )}
        </div>
      </section>
    </AppLayout>
  );
}

function PolicySections({
  policy,
  readiness,
  expectedDate,
}: {
  policy: ContractPolicy;
  readiness: SettlementReadiness | null;
  expectedDate: string;
}) {
  const writer = useHedgixWrite();
  const [cancelReviewOpen, setCancelReviewOpen] = useState(false);
  const mappedError =
    writer.claim.error || writer.cancel.error || writer.settle.error
      ? mapHedgixError(writer.claim.error ?? writer.cancel.error ?? writer.settle.error)
      : null;

  async function cancel() {
    setCancelReviewOpen(false);
    await writer.cancel.mutateAsync(policy.protection_id).catch(() => undefined);
  }

  async function claim() {
    await writer.claim.mutateAsync(policy.protection_id).catch(() => undefined);
  }

  async function settle() {
    if (!readiness?.ready || !readiness.expected_settlement_date) return;
    await writer.settle
      .mutateAsync({
        protectionId: policy.protection_id,
        settlementDate: readiness.expected_settlement_date,
      })
      .catch(() => undefined);
  }

  const triggerBody =
    policy.protection_type === "depeg_protection"
      ? "This protection triggers if the verified Binance USD market reaches or falls below the stored threshold during the coverage period."
      : "This protection triggers if a closed Binance daily candle reaches or falls below this price during the coverage period.";
  const settlementState = getSettlementState(policy, readiness, expectedDate);
  const canSettle = policy.status === "ACTIVE" && Boolean(readiness?.ready);

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <Section title="Policy overview">
          <Grid>
            <Field k="Product">{productTypeLabel(policy.protection_type)}</Field>
            <Field k="Protected market">{policy.binance_settlement_symbol}</Field>
            <Field k="Event level">{policy.event_level}</Field>
            <Field k="Status">
              <Status status={policy.status} />
            </Field>
            <Field k="Coverage period">
              {formatUtcDate(policy.coverage_start_date)} to{" "}
              {formatUtcDate(policy.coverage_end_date)}
            </Field>
            <Field k="Locked reference price">
              {formatUsdPrice(policy.reference_price_display)}
            </Field>
            <Field k="Trigger condition">{triggerConditionLine(policy)}</Field>
            <Field k="Premium">{weiToGen(policy.premium_paid)}</Field>
            <Field k="Eligible payout">{weiToGen(policy.payout_amount)}</Field>
          </Grid>
        </Section>

        <Section title="Locked reference price">
          <Grid>
            <Field k="Locked reference price">
              {formatUsdPrice(policy.reference_price_display)}
            </Field>
            <Field k="Recorded">{formatUtcDateTime(policy.reference_price_datetime)}</Field>
            <Field k="Source">{readableSource(policy.reference_price_source)}</Field>
          </Grid>
          <p className="mt-4 text-sm leading-relaxed text-muted-ink">
            The Binance price fetched and permanently stored by the contract when this protection
            was purchased.
          </p>
        </Section>

        <Section title="Trigger condition">
          <div className="font-serif text-3xl text-ink">{triggerConditionLine(policy)}</div>
          <p className="mt-4 text-sm leading-relaxed text-muted-ink">{triggerBody}</p>
        </Section>

        <Section title="Coverage timeline">
          <Grid>
            <Field k="Purchase date">{formatUtcDate(policy.purchase_date)}</Field>
            <Field k="Duration">{policy.duration_days} days</Field>
            <Field k="Coverage start">{formatUtcDate(policy.coverage_start_date)}</Field>
            <Field k="Coverage end">{formatUtcDate(policy.coverage_end_date)}</Field>
            <Field k="Last settled">{dateOrNone(policy.last_settled_date)}</Field>
            <Field k="Expected next settlement">
              {dateOrNone(expectedDate || readiness?.expected_settlement_date)}
            </Field>
            {policy.triggered_date && (
              <Field k="Triggered date">{formatUtcDate(policy.triggered_date)}</Field>
            )}
            {policy.paid_date && <Field k="Paid date">{formatUtcDate(policy.paid_date)}</Field>}
            {policy.cancelled_date && (
              <Field k="Cancelled date">{formatUtcDate(policy.cancelled_date)}</Field>
            )}
          </Grid>
        </Section>
      </div>

      <aside className="space-y-6 lg:col-span-4">
        <div className="space-y-6 lg:sticky lg:top-8">
          <Section title="Settlement status">
            <h3 className="font-serif text-2xl text-ink">{settlementState.heading}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-ink">{settlementState.body}</p>
            <Grid>
              <Field k="Next settlement">{dateOrNone(settlementState.nextDate)}</Field>
              <Field k="Last settled">{dateOrNone(policy.last_settled_date)}</Field>
              {policy.last_daily_low_display ? (
                <Field k="Latest daily low">{formatUsdPrice(policy.last_daily_low_display)}</Field>
              ) : (
                <Field k="Latest daily low">No settlement recorded yet</Field>
              )}
            </Grid>
          </Section>

          <Section title="Financial terms">
            <Grid>
              <Field k="Premium">{weiToGen(policy.premium_paid)}</Field>
              <Field k="Payout">{weiToGen(policy.payout_amount)}</Field>
              <Field k="Reserved payout">{weiToGen(policy.reserved_payout)}</Field>
            </Grid>
          </Section>

          <Section title="Available actions">
            {policy.status === "ACTIVE" && (
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-muted-ink">
                  A payout becomes claimable after the trigger condition is verified and the
                  protection status changes to Triggered.
                </p>
                {canSettle && (
                  <button
                    className="w-full bg-ink px-3 py-2 text-sm text-paper disabled:opacity-50"
                    disabled={
                      writer.settle.isPending ||
                      writer.wallet.isWrongNetwork ||
                      writer.transaction.blocksResubmission
                    }
                    onClick={() => void settle()}
                  >
                    Settle next eligible day
                  </button>
                )}
                {writer.wallet.isWrongNetwork && canSettle && (
                  <p className="text-xs text-muted-ink">
                    Switch to GenLayer Bradbury to submit settlement.
                  </p>
                )}
                <button
                  className="w-full border border-hairline px-3 py-2 text-sm disabled:opacity-50"
                  disabled={
                    writer.cancel.isPending ||
                    writer.wallet.isWrongNetwork ||
                    writer.transaction.blocksResubmission
                  }
                  onClick={() => setCancelReviewOpen(true)}
                >
                  Cancel protection
                </button>
              </div>
            )}
            {canClaim(policy) && (
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-muted-ink">
                  This protection has met its trigger condition. Claim the reserved payout to your
                  connected wallet.
                </p>
                <button
                  className="w-full bg-ink px-3 py-2 text-sm text-paper disabled:opacity-50"
                  disabled={
                    writer.claim.isPending ||
                    writer.wallet.isWrongNetwork ||
                    writer.transaction.blocksResubmission
                  }
                  onClick={() => void claim()}
                >
                  Claim payout
                </button>
              </div>
            )}
            {policy.status === "PAID" && (
              <p className="text-sm text-muted-ink">
                Payout completed{policy.paid_date ? ` on ${formatUtcDate(policy.paid_date)}` : ""}.
              </p>
            )}
            {policy.status === "EXPIRED" && (
              <p className="text-sm text-muted-ink">
                Coverage completed without a verified trigger.
              </p>
            )}
            {policy.status === "CANCELLED" && (
              <p className="text-sm text-muted-ink">
                Protection cancelled {dateOrNone(policy.cancelled_date)}.
              </p>
            )}
            {mappedError && <ContractErrorMessage mapped={mappedError} className="mt-3" />}
          </Section>

          <Section title="Advanced details">
            <details className="text-sm">
              <summary className="cursor-pointer text-ink">Show technical references</summary>
              <Grid>
                <Field k="Contract address">
                  <span className="break-all">
                    {runtimeEnv.contractAddress ?? "Not configured"}
                  </span>
                </Field>
                <Field k="Protection reference">{policy.protection_id}</Field>
                <Field k="Connected wallet">{shortAddress(policy.owner)}</Field>
                <Field k="Stored market">{policy.binance_settlement_symbol}</Field>
                <Field k="Reference source">{readableSource(policy.reference_price_source)}</Field>
              </Grid>
            </details>
          </Section>
        </div>
      </aside>
      <TransactionDialog
        open={cancelReviewOpen || writer.transaction.open}
        actionTitle={cancelReviewOpen ? "Cancel protection" : writer.transaction.action}
        actionDescription={
          cancelReviewOpen
            ? "This protection will no longer be active. Premiums are not refunded, and the reserved payout is released back to the underwriting pool."
            : undefined
        }
        reviewItems={
          cancelReviewOpen
            ? [
                { label: "Protection ID", value: policy.protection_id },
                { label: "Protected asset", value: policy.protected_asset },
                { label: "Status", value: policy.status },
                { label: "Premium refund", value: "No refund" },
              ]
            : []
        }
        confirmLabel="Cancel protection"
        progress={cancelReviewOpen ? { stage: "review" } : writer.transaction.progress}
        error={cancelReviewOpen ? null : writer.transaction.error}
        onConfirm={() => void cancel()}
        onOpenChange={(open) => {
          if (cancelReviewOpen) setCancelReviewOpen(open);
          else writer.transaction.setOpen(open);
        }}
        onContinueChecking={writer.transaction.continueCheckingStatus}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6 border border-hairline bg-paper p-6">
      <h2 className="font-serif text-2xl text-ink">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <dl className="grid gap-x-6 text-sm md:grid-cols-2">{children}</dl>;
}

function Field({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline py-2">
      <dt className="text-muted-ink">{k}</dt>
      <dd className="max-w-[60%] break-words text-right tabular-nums text-ink">{children}</dd>
    </div>
  );
}

function Status({ status }: { status: string }) {
  return (
    <span
      className={`border px-2 py-1 text-[10px] uppercase tracking-widest ${statusBadgeClass(status)}`}
    >
      {status}
    </span>
  );
}

function Notice({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="border border-hairline bg-stone p-8">
      <h2 className="font-serif text-3xl text-ink">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-ink">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
      <Link
        to="/dashboard"
        className="mt-6 inline-flex border border-ink/30 px-4 py-2 text-sm text-ink hover:bg-ink/5"
      >
        Back to dashboard
      </Link>
    </div>
  );
}

function dateOrNone(value: string | undefined): string {
  return value ? formatUtcDate(value) : "No settlement recorded yet";
}

function getSettlementState(
  policy: ContractPolicy,
  readiness: SettlementReadiness | null,
  expectedDate: string,
): { heading: string; body: string; nextDate: string } {
  const nextDate = expectedDate || readiness?.expected_settlement_date || "";
  if (policy.status === "TRIGGERED" || policy.status === "PAID") {
    return {
      heading: "Trigger confirmed",
      body:
        policy.status === "PAID"
          ? "The verified daily low reached the stored trigger, and the payout has been completed."
          : "The verified daily low reached the stored trigger. The payout is now available to claim.",
      nextDate,
    };
  }
  if (policy.status === "EXPIRED") {
    return {
      heading: "Coverage completed",
      body: "No qualifying trigger was confirmed during the full coverage period.",
      nextDate,
    };
  }
  if (policy.status === "CANCELLED") {
    return {
      heading: "Protection cancelled",
      body: "This protection is no longer active.",
      nextDate,
    };
  }
  if (readiness?.ready) {
    return {
      heading: "Ready for settlement",
      body: "The next required Binance daily candle has closed and can now be submitted for settlement.",
      nextDate,
    };
  }
  if (policy.last_settled_date) {
    return {
      heading: "Settlement completed",
      body: `This protection has been settled through ${formatUtcDate(policy.last_settled_date)} and remains active.`,
      nextDate,
    };
  }
  return {
    heading: "Waiting for the next daily candle",
    body: nextDate
      ? `The ${formatUtcDate(nextDate)} UTC daily candle is not ready for settlement yet.`
      : "No settlement recorded yet.",
    nextDate,
  };
}
