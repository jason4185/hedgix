import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/hedgix/AppLayout";
import {
  DEPEG_ASSETS,
  DURATIONS,
  PRICE_DROP_ASSETS,
  depegAssetTerms,
  depegTerms,
  priceDropTerms,
  triggerDescriptionFromLevel,
} from "@/lib/hedgix-data";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Products — Hedgix" },
      {
        name: "description",
        content:
          "Price Drop Protection and Stablecoin Depeg Protection defined by registry terms and verified Binance data.",
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
        lede="Registry data is used before purchase. Stored contract policy data is used after purchase and is never replaced with newer registry values."
      />

      <ProductSection
        index="01"
        title="Price Drop Protection"
        body="Covers a defined downside move on major crypto assets, measured against the Locked reference price captured by the contract during purchase."
        assets={PRICE_DROP_ASSETS}
        terms={priceDropTerms.map((term) => ({
          name: term.name,
          trigger: triggerDescriptionFromLevel("price_drop_protection", term),
          premium: `${term.premium.amount} GEN`,
          payout: `${term.payout.amount} GEN`,
        }))}
        notes={[
          "Locked reference price: Binance live ticker fetched and stored during purchase.",
          "Trigger price: Locked reference price multiplied by the registry drop threshold.",
          "Settlement: closed Binance daily candle low checked sequentially.",
          `Durations: ${DURATIONS.join(", ")} days; coverage starts the next UTC day.`,
        ]}
      />

      <ProductSection
        index="02"
        title="Stablecoin Depeg Protection"
        body="Protect USDT or USDC against defined direct-USD depeg thresholds using Binance USDTUSD and USDCUSD daily market data."
        assets={DEPEG_ASSETS.map((asset) => {
          const market = depegAssetTerms.find((item) => item.asset === asset);
          return `${asset} / ${market?.binance_settlement_symbol}`;
        })}
        terms={depegTerms.map((term) => ({
          name: term.name,
          trigger: triggerDescriptionFromLevel("depeg_protection", term),
          premium: `${term.premium.amount} GEN`,
          payout: `${term.payout.amount} GEN`,
        }))}
        notes={[
          "Trigger metric: Binance daily low.",
          "Trigger operator: less than or equal to the stored USD threshold.",
          "The locked reference price confirms the stablecoin was above the selected threshold at purchase.",
          "The depeg trigger itself is the absolute USD threshold stored in the policy.",
          "A triggered policyholder claims the reserved payout after trigger confirmation.",
        ]}
        shaded
      />
    </AppLayout>
  );
}

function ProductSection({
  index,
  title,
  body,
  assets,
  terms,
  notes,
  shaded = false,
}: {
  index: string;
  title: string;
  body: string;
  assets: string[];
  terms: { name: string; trigger: string; premium: string; payout: string }[];
  notes: string[];
  shaded?: boolean;
}) {
  return (
    <section className={`border-b border-hairline ${shaded ? "bg-stone" : "bg-paper"}`}>
      <div className="mx-auto max-w-[1400px] px-6 py-20 md:px-10 md:py-28">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-ink">
              Product {index}
            </div>
            <h2 className="mt-3 font-serif text-3xl leading-tight text-ink md:text-5xl">{title}</h2>
            <p className="mt-6 text-muted-ink">{body}</p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs uppercase tracking-widest text-ink/70">
              {assets.map((asset) => (
                <span key={asset} className="border border-hairline bg-paper px-2.5 py-1">
                  {asset}
                </span>
              ))}
            </div>
            <Link
              to="/protect"
              search={{ type: undefined, asset: undefined }}
              className="mt-8 inline-flex items-center gap-2 bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-ink/90"
            >
              Get Protection
            </Link>
          </div>
          <div className="lg:col-span-8">
            <div className="grid gap-px bg-hairline md:grid-cols-3">
              {terms.map((term) => (
                <div key={term.name} className="bg-paper p-6">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-ink">
                    {term.name}
                  </div>
                  <div className="mt-4 min-h-16 font-serif text-2xl leading-tight text-ink">
                    {term.trigger}
                  </div>
                  <dl className="mt-6 space-y-2 text-sm">
                    <Row k="Premium">{term.premium}</Row>
                    <Row k="Payout">{term.payout}</Row>
                  </dl>
                </div>
              ))}
            </div>
            <div className="mt-8 grid gap-6 text-sm text-muted-ink md:grid-cols-2">
              {notes.map((note) => (
                <p key={note}>
                  {note.includes(":") ? (
                    <>
                      <strong className="text-ink">{note.split(":")[0]}</strong>
                      {`:${note.split(":").slice(1).join(":")}`}
                    </>
                  ) : (
                    note
                  )}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ k, children }: { k: string; children: string }) {
  return (
    <div className="flex justify-between border-t border-hairline pt-2">
      <dt className="text-muted-ink">{k}</dt>
      <dd className="tabular-nums">{children}</dd>
    </div>
  );
}
