import { useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/hedgix/AppLayout";
import { mockPolicies, type Policy, type PolicyStatus } from "@/lib/hedgix-data";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Hedgix" },
      { name: "description", content: "Your Hedgix protections, wallet-scoped." },
    ],
  }),
  component: DashboardPage,
});

const STATUSES: PolicyStatus[] = ["ACTIVE", "TRIGGERED", "PAID", "EXPIRED", "CANCELLED"];

function DashboardPage() {
  const [connected, setConnected] = useState(true);
  const [filter, setFilter] = useState<PolicyStatus | "ALL">("ALL");
  const [selected, setSelected] = useState<Policy | null>(null);

  const policies = connected ? mockPolicies : [];
  const filtered = filter === "ALL" ? policies : policies.filter((p) => p.status === filter);

  const summary = {
    total: policies.length,
    ACTIVE: policies.filter((p) => p.status === "ACTIVE").length,
    TRIGGERED: policies.filter((p) => p.status === "TRIGGERED").length,
    PAID: policies.filter((p) => p.status === "PAID").length,
    EXPIRED: policies.filter((p) => p.status === "EXPIRED").length,
    CANCELLED: policies.filter((p) => p.status === "CANCELLED").length,
  };

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Dashboard"
        title={
          <>
            Your <span className="italic">protections</span>, one wallet at a glance.
          </>
        }
        lede="Wallet-scoped view. This dashboard currently uses mock data and will be wired to get_my_dashboard_summary()."
      />

      <section className="border-b border-hairline bg-paper">
        <div className="mx-auto max-w-[1400px] px-6 py-10 md:px-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-muted-ink">
              <span className={`h-2 w-2 ${connected ? "bg-success" : "bg-danger"}`} />
              {connected ? "Wallet 0x7a…3f connected" : "Wallet not connected"}
            </div>
            <button
              onClick={() => setConnected((v) => !v)}
              className="border border-ink/30 px-4 py-2 text-xs font-medium text-ink hover:bg-ink/5"
            >
              {connected ? "Disconnect (mock)" : "Connect Wallet (mock)"}
            </button>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-px border border-hairline bg-hairline md:grid-cols-3 lg:grid-cols-6">
            <Summary k="Total protections" v={String(summary.total)} />
            <Summary k="Active" v={String(summary.ACTIVE)} tone="success" />
            <Summary k="Triggered" v={String(summary.TRIGGERED)} tone="danger" />
            <Summary k="Paid" v={String(summary.PAID)} />
            <Summary k="Expired" v={String(summary.EXPIRED)} />
            <Summary k="Cancelled" v={String(summary.CANCELLED)} />
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {(["ALL", ...STATUSES] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`border px-3 py-1.5 text-[10px] uppercase tracking-widest ${
                  filter === s
                    ? "border-ink bg-ink text-paper"
                    : "border-hairline text-muted-ink hover:border-ink/40"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="mt-8">
            {!connected ? (
              <EmptyState
                title="Connect your wallet"
                body="Connect a wallet to see the protections it owns."
              />
            ) : filtered.length === 0 ? (
              <EmptyState
                title="No protections in this view"
                body="Try a different filter, or buy your first protection."
                action={
                  <Link to="/protect" className="inline-flex bg-ink px-4 py-2 text-sm text-paper">
                    Get Protection
                  </Link>
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {filtered.map((p) => (
                  <PolicyCard key={p.id} p={p} onOpen={() => setSelected(p)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {selected && <PolicyDrawer p={selected} onClose={() => setSelected(null)} />}
    </AppLayout>
  );
}

function Summary({ k, v, tone }: { k: string; v: string; tone?: "success" | "danger" }) {
  return (
    <div className="bg-paper p-5 md:p-6">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-ink">{k}</div>
      <div
        className={`mt-3 font-serif text-4xl leading-none tracking-tight md:text-5xl ${tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-ink"}`}
      >
        {v}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: PolicyStatus }) {
  const map: Record<PolicyStatus, string> = {
    ACTIVE: "border-success/40 text-success bg-success/8",
    TRIGGERED: "border-danger/40 text-danger bg-danger/10",
    PAID: "border-ink/30 text-ink bg-ink/5",
    EXPIRED: "border-hairline text-muted-ink bg-stone",
    CANCELLED: "border-hairline text-muted-ink bg-stone",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ${map[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" /> {status}
    </span>
  );
}

function PolicyCard({ p, onOpen }: { p: Policy; onOpen: () => void }) {
  return (
    <article className="border border-hairline bg-paper">
      <header className="flex items-start justify-between border-b border-hairline p-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-ink">
            Policy #{p.id}
          </div>
          <h3 className="mt-2 font-serif text-3xl text-ink">{p.asset}</h3>
          <div className="mt-1 text-sm text-muted-ink">
            {p.type} · {p.level}
          </div>
        </div>
        <StatusPill status={p.status} />
      </header>
      <dl className="grid grid-cols-2 gap-x-6 p-6 text-sm">
        <Field k="Reference">{p.referencePrice}</Field>
        <Field k="Trigger">{p.triggerPrice}</Field>
        <Field k="Start">{p.coverageStart}</Field>
        <Field k="End">{p.coverageEnd}</Field>
        <Field k="Premium">{p.premium}</Field>
        <Field k="Payout">{p.payout}</Field>
      </dl>
      <div className="flex gap-2 border-t border-hairline p-4">
        <button
          onClick={onOpen}
          className="flex-1 border border-ink/30 px-3 py-2 text-xs font-medium text-ink hover:bg-ink/5"
        >
          Open details
        </button>
        <button
          className="flex-1 bg-ink px-3 py-2 text-xs font-medium text-paper hover:bg-ink/90 disabled:opacity-50"
          disabled={p.status !== "TRIGGERED"}
        >
          Claim payout
        </button>
        <button
          className="flex-1 border border-hairline px-3 py-2 text-xs font-medium text-muted-ink hover:bg-ink/5 disabled:opacity-50"
          disabled={p.status !== "ACTIVE"}
        >
          Cancel
        </button>
      </div>
    </article>
  );
}

function Field({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between border-b border-hairline py-2">
      <dt className="text-muted-ink">{k}</dt>
      <dd className="tabular-nums text-ink">{children}</dd>
    </div>
  );
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="border border-dashed border-hairline bg-paper p-12 text-center">
      <h3 className="font-serif text-2xl text-ink">{title}</h3>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted-ink">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

function PolicyDrawer({ p, onClose }: { p: Policy; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 p-4 md:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl border border-hairline bg-paper"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between border-b border-hairline p-6 md:p-8">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-ink">
              Policy #{p.id} · /policy/{p.id}
            </div>
            <h2 className="mt-2 font-serif text-4xl text-ink">{p.asset}</h2>
            <div className="mt-1 text-sm text-muted-ink">
              {p.type} · {p.level}
            </div>
          </div>
          <button
            onClick={onClose}
            className="border border-hairline px-3 py-1.5 text-xs text-muted-ink hover:bg-ink/5"
          >
            Close
          </button>
        </header>
        <dl className="grid grid-cols-1 gap-x-8 p-6 md:grid-cols-2 md:p-8">
          <Field k="Status">{p.status}</Field>
          <Field k="Settlement symbol">{p.settlementSymbol ?? p.asset}</Field>
          <Field k="Reference price">{p.referencePrice}</Field>
          <Field k="Trigger price">{p.triggerPrice}</Field>
          <Field k="Coverage start">{p.coverageStart}</Field>
          <Field k="Coverage end">{p.coverageEnd}</Field>
          <Field k="Expected settlement">{p.expectedSettlement}</Field>
          <Field k="Settlement readiness">{p.settlementReadiness}</Field>
          <Field k="Premium">{p.premium}</Field>
          <Field k="Potential payout">{p.payout}</Field>
        </dl>
      </div>
    </div>
  );
}
