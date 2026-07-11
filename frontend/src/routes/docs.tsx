import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/hedgix/AppLayout";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Documentation — Hedgix" },
      {
        name: "description",
        content:
          "Hedgix documentation: products, coverage timing, settlement, claims, risks, and FAQ.",
      },
    ],
  }),
  component: DocsPage,
});

const sections: { id: string; t: string; body: ReactNode }[] = [
  {
    id: "overview",
    t: "Overview",
    body: (
      <p>
        Hedgix is a crypto market protection protocol built on GenLayer. It offers defined coverage
        products against price drops and stablecoin depeg events, with verified market data and
        transparent on-chain settlement.
      </p>
    ),
  },
  {
    id: "products",
    t: "Products",
    body: (
      <p>
        Two products are available: <strong>Price Drop Protection</strong> for BTCUSDT, ETHUSDT,
        SOLUSDT, and BNBUSDT; and <strong>Depeg Protection</strong> for USDC, measured through
        USDCUSDT.
      </p>
    ),
  },
  {
    id: "supported-markets",
    t: "Supported markets",
    body: (
      <p>
        See the{" "}
        <a className="text-violet underline" href="/markets">
          Markets
        </a>{" "}
        page for a full breakdown per asset, level, and duration.
      </p>
    ),
  },
  {
    id: "purchase-guide",
    t: "Purchase guide",
    body: (
      <p>
        Connect a wallet, choose a product, pick asset / event level / duration, review the summary,
        and submit. The contract verifies terms and fetches reference market data.
      </p>
    ),
  },
  {
    id: "coverage-timing",
    t: "Coverage timing",
    body: (
      <p>
        Coverage starts on the next UTC day and lasts 7, 14, or 30 days. Aligning to UTC days
        ensures every observed candle is fully closed.
      </p>
    ),
  },
  {
    id: "reference-price",
    t: "Reference price",
    body: (
      <p>
        The reference price is fetched from Binance at policy start and stored on-chain. It is the
        anchor against which triggers are evaluated.
      </p>
    ),
  },
  {
    id: "trigger-calculation",
    t: "Trigger calculation",
    body: (
      <p>
        For price drops,{" "}
        <code className="rounded bg-stone px-1.5 py-0.5 font-mono text-xs">
          trigger = reference × (1 − pct)
        </code>
        . For depeg, the threshold is a fixed absolute value like 0.998.
      </p>
    ),
  },
  {
    id: "settlement",
    t: "Settlement process",
    body: (
      <p>
        After each closed daily candle, the contract fetches the daily low and compares it against
        the stored trigger. If breached, the policy transitions to TRIGGERED.
      </p>
    ),
  },
  {
    id: "claim-process",
    t: "Claim process",
    body: (
      <p>
        The wallet owner of a TRIGGERED policy can claim the payout from the pool. Once claimed,
        status becomes PAID.
      </p>
    ),
  },
  {
    id: "cancellation",
    t: "Cancellation",
    body: (
      <p>
        ACTIVE policies may be cancellable under conditions defined by the registry. Cancelled
        policies transition to CANCELLED and release their reservation.
      </p>
    ),
  },
  {
    id: "statuses",
    t: "Policy statuses",
    body: <p>ACTIVE, TRIGGERED, PAID, EXPIRED, CANCELLED. All transitions are stored on-chain.</p>,
  },
  {
    id: "pool",
    t: "Pool accounting",
    body: (
      <p>
        The pool holds premiums, reserves maximum payouts against active policies, and lets the
        operator withdraw only what is not reserved.
      </p>
    ),
  },
  {
    id: "registry",
    t: "Registry",
    body: (
      <p>
        The registry lists every supported product term. The contract fetches and verifies it
        independently of the frontend.
      </p>
    ),
  },
  {
    id: "genlayer",
    t: "GenLayer validation",
    body: (
      <p>
        GenLayer validators reach consensus on nondeterministic fetches (registry, Binance data),
        producing deterministic on-chain values.
      </p>
    ),
  },
  {
    id: "wallet",
    t: "Wallet ownership",
    body: <p>Policies are wallet-scoped. Only the owning wallet can claim or cancel.</p>,
  },
  {
    id: "errors",
    t: "Error states",
    body: (
      <p>
        Common errors include insufficient premium, unsupported term, mismatched registry version,
        and settlement not yet ready.
      </p>
    ),
  },
  {
    id: "risks",
    t: "Risks and limitations",
    body: (
      <p>
        MVP uses a single market data source and a small validator set. See the{" "}
        <a className="text-violet underline" href="/transparency">
          Transparency
        </a>{" "}
        page for trust assumptions.
      </p>
    ),
  },
  {
    id: "faq",
    t: "Frequently asked questions",
    body: (
      <ul className="mt-2 space-y-3 text-muted-ink">
        <li>
          <strong className="text-ink">Is this a stop-loss?</strong> No. It is a defined-payout
          protection product settled from a reserved pool.
        </li>
        <li>
          <strong className="text-ink">Does the frontend influence outcome?</strong> No. Only
          registry + Binance data + the contract determine settlement.
        </li>
        <li>
          <strong className="text-ink">Can I be liquidated?</strong> No. There is no leverage and no
          collateral requirement.
        </li>
      </ul>
    ),
  },
];

function DocsPage() {
  return (
    <AppLayout>
      <PageHeader
        eyebrow="Documentation"
        title={
          <>
            Hedgix, <span className="italic">documented</span>.
          </>
        }
        lede="Everything you need to understand what Hedgix does — and, just as importantly, what it doesn't."
      />

      <section className="border-b border-hairline bg-paper">
        <div className="mx-auto grid max-w-[1400px] gap-12 px-6 py-16 md:px-10 md:py-24 lg:grid-cols-12">
          <nav className="lg:col-span-3">
            <div className="sticky top-6 space-y-1 text-sm">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="block border-l-2 border-transparent py-1 pl-3 text-muted-ink hover:border-ink hover:text-ink"
                >
                  {s.t}
                </a>
              ))}
            </div>
          </nav>
          <article className="lg:col-span-9">
            {sections.map((s) => (
              <section
                key={s.id}
                id={s.id}
                className="scroll-mt-24 border-b border-hairline py-10 first:pt-0"
              >
                <h2 className="font-serif text-3xl text-ink md:text-4xl">{s.t}</h2>
                <div className="mt-4 text-base leading-relaxed text-muted-ink">{s.body}</div>
              </section>
            ))}
          </article>
        </div>
      </section>
    </AppLayout>
  );
}
