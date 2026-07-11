import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/hedgix/AppLayout";
import { priceDropTerms, depegTerms, DURATIONS, PRICE_DROP_ASSETS } from "@/lib/hedgix-data";

export const Route = createFileRoute("/markets")({
  head: () => ({
    meta: [
      { title: "Markets — Hedgix" },
      {
        name: "description",
        content: "Supported markets, event levels, triggers, premiums, and payouts.",
      },
      { property: "og:title", content: "Hedgix Markets" },
      {
        property: "og:description",
        content: "Every supported market and product term at a glance.",
      },
    ],
  }),
  component: MarketsPage,
});

type Row = {
  asset: string;
  settlement: string;
  product: "Price Drop Protection" | "Depeg Protection";
};

const rows: Row[] = [
  ...PRICE_DROP_ASSETS.map((a) => ({
    asset: a,
    settlement: a,
    product: "Price Drop Protection" as const,
  })),
  { asset: "USDC", settlement: "USDCUSDT", product: "Depeg Protection" },
];

function MarketsPage() {
  return (
    <AppLayout>
      <PageHeader
        eyebrow="Markets"
        title={
          <>
            Supported <span className="italic">markets</span> and product terms.
          </>
        }
        lede="Product terms below. Not live market data. These values come from the local mock registry and mirror what the on-chain registry will publish."
      />

      <section className="border-b border-hairline bg-paper">
        <div className="mx-auto max-w-[1400px] px-6 py-16 md:px-10 md:py-24">
          <div className="mb-6 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-ink">
              Registry v1 · Product terms
            </span>
            <Link
              to="/registry"
              className="text-xs uppercase tracking-widest text-violet hover:underline"
            >
              Open registry →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6">
            {rows.map((r) => {
              const isDepeg = r.product === "Depeg Protection";
              const levels = isDepeg ? depegTerms : priceDropTerms;
              return (
                <article key={r.asset} className="border border-hairline bg-paper">
                  <header className="flex flex-wrap items-baseline justify-between gap-4 border-b border-hairline p-6 md:p-8">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.22em] text-muted-ink">
                        {r.product}
                      </div>
                      <h2 className="mt-2 font-serif text-3xl text-ink md:text-4xl">{r.asset}</h2>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs md:grid-cols-3">
                      <div>
                        <dt className="text-muted-ink uppercase tracking-widest">
                          Settlement symbol
                        </dt>
                        <dd className="mt-1 tabular-nums text-ink">{r.settlement}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-ink uppercase tracking-widest">Durations</dt>
                        <dd className="mt-1 tabular-nums text-ink">{DURATIONS.join(" / ")} days</dd>
                      </div>
                      <div>
                        <dt className="text-muted-ink uppercase tracking-widest">Registry</dt>
                        <dd className="mt-1 text-ink">v1</dd>
                      </div>
                    </dl>
                  </header>
                  <div className="grid grid-cols-1 md:grid-cols-3">
                    {levels.map((l) => (
                      <div
                        key={l.level}
                        className="border-hairline p-6 md:border-r last:md:border-r-0"
                      >
                        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-ink">
                          {l.level}
                        </div>
                        <div className="mt-3 font-serif text-2xl text-ink">
                          {"triggerPct" in l ? `${l.triggerPct}% drop` : `≤ ${l.threshold}`}
                        </div>
                        <div className="mt-3 text-xs text-muted-ink">
                          {"triggerPct" in l
                            ? "Triggers when the verified daily low is at or below reference × (1 − trigger %)."
                            : "Triggers when the verified daily low is at or below the threshold."}
                        </div>
                        <dl className="mt-4 space-y-1.5 text-sm">
                          <div className="flex justify-between border-t border-hairline pt-2">
                            <dt className="text-muted-ink">Premium</dt>
                            <dd className="tabular-nums">{l.premium}</dd>
                          </div>
                          <div className="flex justify-between border-t border-hairline pt-2">
                            <dt className="text-muted-ink">Payout</dt>
                            <dd className="tabular-nums">{l.payout}</dd>
                          </div>
                        </dl>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </AppLayout>
  );
}
