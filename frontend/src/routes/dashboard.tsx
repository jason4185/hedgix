import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { AppLayout, PageHeader } from "@/components/hedgix/AppLayout";
import { ContractErrorMessage, EmptyState, LoadingState } from "@/components/hedgix/Feedback";
import { TransactionDialog } from "@/components/hedgix/TransactionDialog";
import { runtimeEnv } from "@/config/env";
import { useHedgixWrite } from "@/hooks/useHedgixWrite";
import { usePolicy } from "@/hooks/useHedgixReads";
import { useMyDashboard } from "@/hooks/useMyDashboard";
import {
  canCancel,
  canClaim,
  formatUsdPrice,
  formatUtcDate,
  policyDisplayName,
  settlementReadinessText,
  shortAddress,
  statusBadgeClass,
  triggerConditionLine,
  weiToGen,
  type ContractPolicy,
  type ProtectionStatus,
} from "@/lib/hedgix-data";
import { mapHedgixError } from "@/lib/genlayer/errors";
import type { DashboardProtectionRow } from "@/lib/genlayer/types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Hedgix" },
      { name: "description", content: "Your Hedgix protections, wallet-scoped." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const writer = useHedgixWrite();
  const dashboard = useMyDashboard(writer.wallet.address);
  const summary = dashboard.data;

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Dashboard"
        title={
          <>
            Your <span className="italic">protections</span>, one wallet at a glance.
          </>
        }
        lede="View and manage the protections associated with your connected wallet."
      />

      <section className="border-b border-hairline bg-paper">
        <div className="mx-auto max-w-[1400px] px-6 py-10 md:px-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-muted-ink">
              <span
                className={`h-2 w-2 ${writer.wallet.isConnected ? "bg-success" : "bg-danger"}`}
              />
              {writer.wallet.isConnected
                ? `Connected wallet ${shortAddress(writer.wallet.address)}`
                : "Wallet not connected"}
            </div>
            <Link
              to="/protect"
              search={{ type: undefined, asset: undefined }}
              className="border border-ink/30 px-4 py-2 text-xs font-medium text-ink hover:bg-ink/5"
            >
              Get protection
            </Link>
          </div>

          {!runtimeEnv.contractConfigured && <ConfigError />}
          {!writer.wallet.isConnected && (
            <EmptyState
              title="Connect your wallet"
              body="Connect a compatible browser wallet to view your protections and submit contract actions."
              action={<ConnectButton />}
            />
          )}
          {writer.wallet.isWrongNetwork && (
            <EmptyState
              title="Wrong network"
              body="Switch to GenLayer Bradbury before reading wallet-scoped policies or submitting transactions."
              action={
                <button
                  className="bg-ink px-4 py-2 text-sm text-paper"
                  onClick={() => void writer.wallet.switchToBradbury()}
                >
                  Switch to GenLayer Bradbury
                </button>
              }
            />
          )}

          {writer.wallet.isConnected &&
            !writer.wallet.isWrongNetwork &&
            runtimeEnv.contractConfigured && (
              <>
                <div className="mt-8 grid grid-cols-2 gap-px border border-hairline bg-hairline md:grid-cols-3 lg:grid-cols-6">
                  <Summary k="Total protections" v={summary?.protection_count ?? "--"} />
                  <Summary k="Active" v={summary?.active_count ?? "--"} tone="success" />
                  <Summary k="Triggered" v={summary?.triggered_count ?? "--"} tone="danger" />
                  <Summary k="Paid" v={summary?.paid_count ?? "--"} />
                  <Summary k="Expired" v={summary?.expired_count ?? "--"} />
                  <Summary k="Cancelled" v={summary?.cancelled_count ?? "--"} />
                </div>
                <div className="mt-8">
                  {dashboard.isLoading ? (
                    <LoadingState
                      title="Loading protections"
                      body="Loading the protections associated with your connected wallet."
                    />
                  ) : dashboard.error ? (
                    <ContractErrorMessage error={dashboard.error} />
                  ) : !summary || summary.protections.length === 0 ? (
                    <EmptyState
                      title="No protections yet"
                      body="Your connected wallet does not currently hold any Hedgix protections."
                      action={
                        <Link
                          to="/protect"
                          search={{ type: undefined, asset: undefined }}
                          className="inline-flex bg-ink px-4 py-2 text-sm text-paper"
                        >
                          Explore protection options
                        </Link>
                      }
                    />
                  ) : (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      {summary.protections.map((policy) => (
                        <PolicyCard key={policy.protection_id} policy={policy} writer={writer} />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
        </div>
      </section>
      <TransactionDialog
        open={writer.transaction.open}
        actionTitle={writer.transaction.action}
        progress={writer.transaction.progress}
        error={writer.transaction.error}
        onOpenChange={writer.transaction.setOpen}
        onContinueChecking={writer.transaction.continueCheckingStatus}
      />
    </AppLayout>
  );
}

function PolicyCard({
  policy,
  writer,
}: {
  policy: DashboardProtectionRow;
  writer: ReturnType<typeof useHedgixWrite>;
}) {
  const detail = usePolicy(policy.protection_id, writer.wallet.address);
  const fullPolicy = detail.data;
  const market = fullPolicy?.binance_settlement_symbol ?? policy.binance_settlement_symbol ?? "";
  const statusPolicy = { status: policy.status } as Pick<ContractPolicy, "status">;
  const mappedCancel = writer.cancel.error ? mapHedgixError(writer.cancel.error) : null;
  const mappedClaim = writer.claim.error ? mapHedgixError(writer.claim.error) : null;
  const activity = protectionActivityLabel(policy);
  const cancellationPending =
    writer.cancel.isPending && String(writer.cancel.variables ?? "") === policy.protection_id;
  const claimPending =
    writer.claim.isPending && String(writer.claim.variables ?? "") === policy.protection_id;

  return (
    <article className="border border-hairline bg-paper transition-colors hover:border-ink/30">
      <header className="flex items-start justify-between border-b border-hairline p-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-ink">
            <span>{activity}</span>
            <span className="h-1 w-1 bg-current" />
            <span>Reference {policy.protection_id}</span>
          </div>
          <h3 className="mt-2 font-serif text-3xl text-ink">{policyDisplayName(policy)}</h3>
          <div className="mt-1 text-sm text-muted-ink">{market}</div>
        </div>
        <StatusPill status={policy.status} />
      </header>
      <div className="grid gap-4 p-6 md:grid-cols-[1.1fr_0.9fr]">
        <div className="border border-hairline bg-stone p-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-ink">
            Monitoring status
          </div>
          <div className="mt-3 font-serif text-2xl text-ink">{activity}</div>
          <p className="mt-2 text-sm leading-relaxed text-muted-ink">
            {settlementStatusLine(policy)}
          </p>
          {triggerDistanceText(policy) && (
            <p className="mt-3 border-t border-hairline pt-3 text-sm text-ink">
              {triggerDistanceText(policy)}
            </p>
          )}
        </div>
        <dl className="text-sm">
          <Field k="Locked reference price">{formatUsdPrice(policy.reference_price_display)}</Field>
          <Field k="Trigger condition">
            {fullPolicy
              ? triggerConditionLine(fullPolicy)
              : formatUsdPrice(policy.trigger_price_display)}
          </Field>
          <Field k="Eligible payout">{weiToGen(policy.payout_amount)}</Field>
          <Field k="Reserved payout">{weiToGen(policy.reserved_payout)}</Field>
          <Field k="Coverage">
            {formatUtcDate(policy.coverage_start_date)} to {formatUtcDate(policy.coverage_end_date)}
          </Field>
          <Field k="Next settlement">{formatUtcDate(policy.expected_settlement_date)}</Field>
        </dl>
      </div>
      <Timeline policy={policy} />
      <div className="flex flex-wrap gap-2 border-t border-hairline p-4">
        <Link
          to="/policy/$id"
          params={{ id: policy.protection_id }}
          className="flex-1 border border-ink/30 px-3 py-2 text-center text-xs font-medium text-ink hover:bg-ink/5"
        >
          View details
        </Link>
        {canClaim(statusPolicy) && (
          <button
            onClick={() =>
              void writer.claim.mutateAsync(policy.protection_id).catch(() => undefined)
            }
            className="flex-1 bg-ink px-3 py-2 text-xs font-medium text-paper disabled:opacity-50"
            disabled={claimPending || writer.wallet.isWrongNetwork}
          >
            {claimPending ? "Claim in progress" : "Claim payout"}
          </button>
        )}
        {canCancel(statusPolicy) && (
          <button
            onClick={() =>
              void writer.cancel.mutateAsync(policy.protection_id).catch(() => undefined)
            }
            className="flex-1 border border-hairline px-3 py-2 text-xs font-medium text-muted-ink hover:bg-ink/5 disabled:opacity-50"
            disabled={cancellationPending || writer.wallet.isWrongNetwork}
          >
            {cancellationPending ? "Cancellation in progress" : "Cancel protection"}
          </button>
        )}
        <span className="basis-full text-xs text-muted-ink">
          {settlementReadinessText({
            ready: policy.settlement_ready,
            reason: policy.settlement_ready ? "" : "Waiting for the daily candle to close",
            expected_settlement_date: policy.expected_settlement_date,
          })}
        </span>
        {(mappedCancel || mappedClaim) && (
          <ContractErrorMessage mapped={mappedCancel ?? mappedClaim} className="basis-full" />
        )}
      </div>
    </article>
  );
}

function protectionActivityLabel(policy: DashboardProtectionRow): string {
  if (policy.status === "TRIGGERED") return "Payout available";
  if (policy.status === "PAID") return "Paid";
  if (policy.status === "EXPIRED") return "Coverage expired";
  if (policy.status === "CANCELLED") return "Cancelled";
  if (policy.settlement_ready) return "Settlement ready";
  if (policy.last_settled_date) return "Latest daily settlement completed";
  return "Monitoring market";
}

function settlementStatusLine(policy: DashboardProtectionRow): string {
  if (policy.status === "TRIGGERED") {
    return "The trigger condition has been verified. The reserved payout is available to claim.";
  }
  if (policy.status === "PAID") return "The reserved payout has been claimed.";
  if (policy.status === "EXPIRED") return "Coverage completed without a verified trigger.";
  if (policy.status === "CANCELLED") return "This protection is no longer active.";
  if (policy.settlement_ready) {
    return `The ${formatUtcDate(policy.expected_settlement_date)} candle is ready for settlement.`;
  }
  return policy.last_settled_date
    ? `Settled through ${formatUtcDate(policy.last_settled_date)}. Waiting for the next closed daily candle.`
    : "Waiting for the first closed daily candle in the coverage period.";
}

function triggerDistanceText(policy: DashboardProtectionRow): string | null {
  if (!policy.last_daily_low_display || !policy.trigger_price_display) return null;
  const low = decimalToScaled(policy.last_daily_low_display);
  const trigger = decimalToScaled(policy.trigger_price_display);
  if (low === null || trigger === null || trigger === 0n) return null;
  if (low <= trigger) {
    return `Latest daily low ${formatUsdPrice(policy.last_daily_low_display)} is at or below the trigger.`;
  }
  const bps = ((low - trigger) * 10_000n) / trigger;
  const whole = bps / 100n;
  const fraction = bps % 100n;
  const percent = `${whole}.${fraction.toString().padStart(2, "0")}%`;
  return `Latest daily low ${formatUsdPrice(policy.last_daily_low_display)} is ${percent} above the stored trigger.`;
}

function decimalToScaled(value: string): bigint | null {
  if (!/^\d+(\.\d+)?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 100_000_000n + BigInt(fraction.padEnd(8, "0").slice(0, 8));
}

function Timeline({ policy }: { policy: DashboardProtectionRow }) {
  const events = [
    { label: "Purchased", value: policy.purchase_date },
    { label: "Latest settlement", value: policy.last_settled_date },
    { label: "Triggered", value: policy.triggered_date },
    { label: "Paid", value: policy.paid_date },
    { label: "Cancelled", value: policy.cancelled_date },
    { label: "Coverage ends", value: policy.coverage_end_date },
  ].filter((event) => event.value);

  return (
    <div className="border-t border-hairline px-6 py-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-ink">
        Protection timeline
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {events.map((event) => (
          <span
            key={`${event.label}-${event.value}`}
            className="border border-hairline px-2 py-1 text-xs text-muted-ink"
          >
            <span className="text-ink">{event.label}</span> {formatUtcDate(event.value)}
          </span>
        ))}
      </div>
    </div>
  );
}

function Summary({ k, v, tone }: { k: string; v: string; tone?: "success" | "danger" }) {
  return (
    <div className="bg-paper p-5 md:p-6">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-ink">{k}</div>
      <div
        className={`mt-3 font-serif text-4xl leading-none tracking-tight md:text-5xl ${
          tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-ink"
        }`}
      >
        {v}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: ProtectionStatus | string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ${statusBadgeClass(status)}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" /> {status}
    </span>
  );
}

function Field({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline py-2">
      <dt className="text-muted-ink">{k}</dt>
      <dd className="text-right tabular-nums text-ink">{children}</dd>
    </div>
  );
}

function ConfigError() {
  return (
    <div className="mt-8 border border-danger/30 bg-danger/10 p-5 text-sm text-danger">
      {runtimeEnv.contractError}
    </div>
  );
}
