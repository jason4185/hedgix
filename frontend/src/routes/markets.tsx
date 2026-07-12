import { useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/hedgix/AppLayout";
import { ContractErrorMessage } from "@/components/hedgix/Feedback";
import { useMyDashboard } from "@/hooks/useMyDashboard";
import { useRegistry } from "@/hooks/useRegistry";
import { useWalletState } from "@/hooks/useWalletState";
import { registry, triggerDescriptionFromLevel, type ProductType } from "@/lib/hedgix-data";

export const Route = createFileRoute("/markets")({
  head: () => ({
    meta: [
      { title: "Markets — Hedgix" },
      {
        name: "description",
        content: "Supported Hedgix markets, event levels, triggers, premiums, and payouts.",
      },
    ],
  }),
  component: MarketsPage,
});

function MarketsPage() {
  const [filter, setFilter] = useState<ProductType | "all">("all");
  const wallet = useWalletState();
  const dashboard = useMyDashboard(wallet.address);
  const registryQuery = useRegistry();
  const activeRegistry = registryQuery.data ?? registry;
  const durations = activeRegistry.supported_durations.map((item) => item.duration_days);
  const marketRows = activeRegistry.protection_products.flatMap((product) =>
    product.supported_assets.map((asset) => {
      const protectedAsset = String(asset.asset ?? asset.protected_asset);
      const settlement = asset.binance_settlement_symbol;
      const isDepeg = product.protection_type === "depeg_protection";
      return {
        asset: protectedAsset,
        settlement,
        base: isDepeg ? protectedAsset : protectedAsset.replace("USDT", ""),
        quote: asset.quote_currency ?? (isDepeg ? "USD" : "USDT"),
        product: product.display_name,
        type: product.protection_type as ProductType,
        levels: product.event_levels,
      };
    }),
  );
  const visibleMarkets = marketRows.filter((market) => filter === "all" || market.type === filter);
  const activeCounts = new Map<string, number>();
  for (const policy of dashboard.data?.protections ?? []) {
    if (policy.status !== "ACTIVE") continue;
    const key = policy.binance_settlement_symbol ?? policy.protected_asset;
    activeCounts.set(key, (activeCounts.get(key) ?? 0) + 1);
  }

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Markets"
        title={
          <>
            Supported <span className="italic">markets</span> and product terms.
          </>
        }
        lede="Monitor supported Hedgix markets, available trigger levels, and the daily-settlement rules used by the contract."
      />

      <section className="border-b border-hairline bg-paper">
        <div className="mx-auto max-w-[1400px] px-6 py-16 md:px-10 md:py-24">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-ink">
              Registry {activeRegistry.metadata.registry_version} · Binance daily candle settlement
            </span>
            <Link
              to="/registry"
              className="text-xs uppercase tracking-widest text-violet hover:underline"
            >
              Open registry
            </Link>
          </div>
          {registryQuery.error && !registryQuery.data ? (
            <ContractErrorMessage error={registryQuery.error} className="mb-8" />
          ) : null}
          <div className="mb-8 flex flex-wrap gap-2" aria-label="Market filters">
            <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
              All markets
            </FilterButton>
            <FilterButton
              active={filter === "price_drop_protection"}
              onClick={() => setFilter("price_drop_protection")}
            >
              Price Drop Protection
            </FilterButton>
            <FilterButton
              active={filter === "depeg_protection"}
              onClick={() => setFilter("depeg_protection")}
            >
              Stablecoin Depeg Protection
            </FilterButton>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {visibleMarkets.map((market) => {
              const isDepeg = market.type === "depeg_protection";
              return (
                <article
                  key={`${market.product}-${market.asset}`}
                  className="border border-hairline bg-paper transition-colors hover:border-ink/40 focus-within:border-ink"
                >
                  <header className="flex flex-wrap items-start justify-between gap-4 border-b border-hairline p-6 md:p-8">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.22em] text-muted-ink">
                        {market.product}
                      </div>
                      <h2 className="mt-2 font-serif text-3xl text-ink md:text-4xl">
                        {market.settlement}
                      </h2>
                      {isDepeg && (
                        <p className="mt-2 text-sm text-muted-ink">
                          This market measures the stablecoin directly against USD.
                        </p>
                      )}
                    </div>
                    <div className="flex w-full flex-col gap-4 md:w-auto md:items-end">
                      <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs md:grid-cols-4">
                        <Item k="Base">{market.base}</Item>
                        <Item k="Quote">{market.quote}</Item>
                        <Item k="Metric">Daily low</Item>
                        <Item k="Durations">{durations.join(" / ")} days</Item>
                      </dl>
                      <Link
                        to="/protect"
                        search={{ type: market.type, asset: market.asset }}
                        className="inline-flex w-full items-center justify-center border border-ink/30 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink md:w-auto"
                        aria-label={`Get ${market.base} ${isDepeg ? "depeg " : ""}protection`}
                      >
                        {isDepeg
                          ? `Get ${market.base} depeg protection`
                          : `Get ${market.base} protection`}
                      </Link>
                    </div>
                  </header>
                  <div className="grid grid-cols-1 gap-px border-b border-hairline bg-hairline md:grid-cols-3">
                    <MarketStat k="Monitoring mode" v="Closed daily candles" />
                    <MarketStat
                      k="Wallet active protections"
                      v={String(activeCounts.get(market.settlement) ?? 0)}
                    />
                    <MarketStat k="Live price preview" v="Not shown before purchase" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3">
                    {market.levels.map((level) => (
                      <div
                        key={level.name}
                        className="border-hairline p-6 md:border-r last:md:border-r-0"
                      >
                        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-ink">
                          {level.name}
                        </div>
                        <div className="mt-3 font-serif text-2xl text-ink">
                          {triggerDescriptionFromLevel(
                            isDepeg ? "depeg_protection" : "price_drop_protection",
                            level,
                          )}
                        </div>
                        <dl className="mt-4 space-y-1.5 text-sm">
                          <Row k="Premium">
                            {level.premium.amount} {level.premium.token}
                          </Row>
                          <Row k="Payout">
                            {level.payout.amount} {level.payout.token}
                          </Row>
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

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
        active ? "border-ink bg-ink text-paper" : "border-hairline text-ink hover:border-ink/40"
      }`}
    >
      {children}
    </button>
  );
}

function Item({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-muted-ink uppercase tracking-widest">{k}</dt>
      <dd className="mt-1 tabular-nums text-ink">{children}</dd>
    </div>
  );
}

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex justify-between border-t border-hairline pt-2">
      <dt className="text-muted-ink">{k}</dt>
      <dd className="tabular-nums">{children}</dd>
    </div>
  );
}

function MarketStat({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-stone p-4 text-sm md:p-5">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-ink">{k}</div>
      <div className="mt-2 text-ink">{v}</div>
    </div>
  );
}
