import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/hedgix/AppLayout";
import { priceDropTerms, depegTerms, PRICE_DROP_ASSETS } from "@/lib/hedgix-data";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Products — Hedgix" },
      {
        name: "description",
        content:
          "Price Drop Protection and Depeg Protection defined by verified market data and transparent trigger rules.",
      },
      { property: "og:title", content: "Hedgix Products" },
      {
        property: "og:description",
        content: "Defined protection for crypto positions and stablecoins.",
      },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  return (
    <AppLayout>
      <PageHeader
        eyebrow="Products"
        title={
          <>
            Two products. <span className="italic">Defined</span> terms.
          </>
        }
        lede="Every product below is fully specified by the on-chain registry. The contract verifies the terms independently of this interface."
      />

      <section className="border-b border-hairline bg-paper">
        <div className="mx-auto max-w-[1400px] px-6 py-20 md:px-10 md:py-28">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-ink">
                Product 01
              </div>
              <h2 className="mt-3 font-serif text-3xl leading-tight text-ink md:text-5xl">
                Price Drop Protection
              </h2>
              <p className="mt-6 text-muted-ink">
                Covers a defined downside move on major crypto assets, measured against a verified
                reference price at policy start.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 text-xs uppercase tracking-widest text-ink/70">
                {PRICE_DROP_ASSETS.map((a) => (
                  <span key={a} className="border border-hairline px-2.5 py-1">
                    {a}
                  </span>
                ))}
              </div>
              <Link
                to="/protect"
                className="mt-8 inline-flex items-center gap-2 bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-ink/90"
              >
                Get Protection →
              </Link>
            </div>
            <div className="lg:col-span-8">
              <div className="grid gap-px bg-hairline md:grid-cols-3">
                {priceDropTerms.map((t) => (
                  <div key={t.level} className="bg-paper p-6">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-ink">
                      {t.level}
                    </div>
                    <div className="mt-4 font-serif text-3xl text-ink">{t.triggerPct}%</div>
                    <div className="text-xs text-muted-ink">trigger drop</div>
                    <dl className="mt-6 space-y-2 text-sm">
                      <div className="flex justify-between border-t border-hairline pt-2">
                        <dt className="text-muted-ink">Premium</dt>
                        <dd className="tabular-nums">{t.premium}</dd>
                      </div>
                      <div className="flex justify-between border-t border-hairline pt-2">
                        <dt className="text-muted-ink">Payout</dt>
                        <dd className="tabular-nums">{t.payout}</dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
              <div className="mt-8 grid gap-6 text-sm text-muted-ink md:grid-cols-2">
                <p>
                  <strong className="text-ink">Reference price</strong> — verified from Binance at
                  the moment coverage starts and stored on-chain in the policy record.
                </p>
                <p>
                  <strong className="text-ink">Trigger price</strong> — computed as reference × (1 −
                  trigger %). The contract stores the exact value.
                </p>
                <p>
                  <strong className="text-ink">Daily settlement</strong> — after each closed daily
                  candle, the contract compares the verified daily low against the stored trigger.
                </p>
                <p>
                  <strong className="text-ink">Durations</strong> — 7, 14, or 30 days of coverage
                  starting the next UTC day.
                </p>
                <p>
                  <strong className="text-ink">Suitable for</strong> — holders wanting a defined,
                  transparent hedge on core crypto positions without discretionary payoff logic.
                </p>
                <p>
                  <strong className="text-ink">Example</strong> — 1 GEN premium, up to 4 GEN payout
                  depending on selected event level.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-hairline bg-stone">
        <div className="mx-auto max-w-[1400px] px-6 py-20 md:px-10 md:py-28">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-ink">
                Product 02
              </div>
              <h2 className="mt-3 font-serif text-3xl leading-tight text-ink md:text-5xl">
                Depeg Protection
              </h2>
              <p className="mt-6 text-muted-ink">
                Covers a stablecoin trading meaningfully below its peg. USDC is measured through
                USDCUSDT, using the verified daily low.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 text-xs uppercase tracking-widest text-ink/70">
                <span className="border border-hairline bg-paper px-2.5 py-1">USDC</span>
                <span className="border border-hairline bg-paper px-2.5 py-1">via USDCUSDT</span>
              </div>
              <Link
                to="/protect"
                className="mt-8 inline-flex items-center gap-2 bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-ink/90"
              >
                Get Protection →
              </Link>
            </div>
            <div className="lg:col-span-8">
              <div className="grid gap-px bg-hairline md:grid-cols-3">
                {depegTerms.map((t) => (
                  <div key={t.level} className="bg-paper p-6">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-ink">
                      {t.level}
                    </div>
                    <div className="mt-4 font-serif text-3xl text-ink">{t.threshold}</div>
                    <div className="text-xs text-muted-ink">trigger threshold</div>
                    <dl className="mt-6 space-y-2 text-sm">
                      <div className="flex justify-between border-t border-hairline pt-2">
                        <dt className="text-muted-ink">Premium</dt>
                        <dd className="tabular-nums">{t.premium}</dd>
                      </div>
                      <div className="flex justify-between border-t border-hairline pt-2">
                        <dt className="text-muted-ink">Payout</dt>
                        <dd className="tabular-nums">{t.payout}</dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
              <div className="mt-8 grid gap-6 text-sm text-muted-ink md:grid-cols-2">
                <p>
                  <strong className="text-ink">Depeg event</strong> — USDC's market price on
                  USDCUSDT trades at or below the level threshold on a closed daily candle.
                </p>
                <p>
                  <strong className="text-ink">Why USDCUSDT</strong> — the contract uses a single
                  verifiable market symbol on a supported venue, avoiding aggregated or interpretive
                  feeds.
                </p>
                <p>
                  <strong className="text-ink">Settlement</strong> — daily low is fetched and
                  verified after each candle closes; the policy triggers if the low breaches the
                  threshold.
                </p>
                <p>
                  <strong className="text-ink">Durations</strong> — 7, 14, or 30 days.
                </p>
                <p>
                  <strong className="text-ink">Suitable for</strong> — users holding meaningful USDC
                  balances who want defined coverage on peg-break scenarios.
                </p>
                <p>
                  <strong className="text-ink">Example</strong> — Soft Depeg: 1 GEN premium, 2 GEN
                  payout if USDCUSDT ≤ 0.998.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </AppLayout>
  );
}
