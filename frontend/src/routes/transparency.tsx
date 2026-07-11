import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/hedgix/AppLayout";

export const Route = createFileRoute("/transparency")({
  head: () => ({
    meta: [
      { title: "Transparency — Hedgix" },
      {
        name: "description",
        content:
          "The interface is not the source of truth. Registry, market data, and settlement are all independently verified on-chain.",
      },
      { property: "og:title", content: "Hedgix Transparency" },
      {
        property: "og:description",
        content: "How Hedgix verifies registry, market data, and settlement.",
      },
    ],
  }),
  component: TransparencyPage,
});

const sections = [
  {
    t: "Trust model",
    b: "The frontend is a display and interaction layer. Product terms come from the official Hedgix registry, not this interface.",
  },
  {
    t: "Registry verification",
    b: "The contract fetches the registry and verifies the protected asset, protection type, event level, duration, premium, payout, Binance symbol, and trigger rule for every purchase.",
  },
  {
    t: "Market data verification",
    b: "Binance data is fetched during purchase and settlement. GenLayer validators verify the nondeterministic fetch and store the deterministic result.",
  },
  {
    t: "Settlement verification",
    b: "Each closed daily candle is compared against the stored trigger. Policy transitions between ACTIVE, TRIGGERED, PAID, EXPIRED, and CANCELLED are stored on-chain.",
  },
  {
    t: "Pool accounting",
    b: "The pool tracks reserved liability for every active protection. Withdrawable balance is only what remains after reservations.",
  },
  {
    t: "User ownership",
    b: "Every policy is wallet-scoped. Only the owning wallet can claim payouts or cancel where allowed.",
  },
  {
    t: "MVP limitations",
    b: "This MVP still has trust assumptions: a single market data source, a small set of validators, and manually curated registry updates.",
  },
  {
    t: "Future improvements",
    b: "Multiple redundant data sources, expanded validator sets, and permissionless registry proposals are on the roadmap.",
  },
];

const placeholders = [
  { k: "Contract address", v: "0x…coming soon" },
  { k: "Registry URL", v: "hedgix://registry/v1 (coming soon)" },
  { k: "Source code", v: "GitHub — coming soon" },
  { k: "Explorer evidence", v: "GenLayer Explorer — coming soon" },
  { k: "Transaction proof", v: "Per-policy proofs — coming soon" },
  { k: "Audit information", v: "External audit — coming soon" },
];

function TransparencyPage() {
  return (
    <AppLayout>
      <PageHeader
        eyebrow="Transparency"
        title={
          <>
            The interface is <span className="italic">not</span> the source of truth.
          </>
        }
        lede="Every meaningful value in a Hedgix policy is fetched and verified by the contract itself. This page names each responsibility explicitly."
      />

      <section className="border-b border-hairline bg-paper">
        <div className="mx-auto max-w-[1400px] px-6 py-20 md:px-10 md:py-28">
          <div className="grid gap-px bg-hairline md:grid-cols-2">
            {sections.map((s) => (
              <div key={s.t} className="bg-paper p-6 md:p-8">
                <h2 className="font-serif text-2xl text-ink md:text-3xl">{s.t}</h2>
                <p className="mt-3 text-sm text-muted-ink md:text-base">{s.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-hairline bg-stone">
        <div className="mx-auto max-w-[1400px] px-6 py-20 md:px-10 md:py-28">
          <div className="mb-8 flex items-baseline justify-between">
            <h2 className="font-serif text-3xl text-ink md:text-4xl">On-chain references</h2>
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-ink">
              Placeholders — no invented values
            </span>
          </div>
          <dl className="grid grid-cols-1 gap-px bg-hairline md:grid-cols-2 lg:grid-cols-3">
            {placeholders.map((p) => (
              <div key={p.k} className="bg-paper p-6">
                <dt className="text-[10px] uppercase tracking-[0.22em] text-muted-ink">{p.k}</dt>
                <dd className="mt-3 font-mono text-sm text-ink">{p.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </AppLayout>
  );
}
