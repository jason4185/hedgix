import { useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/hedgix/AppLayout";
import { useRegistry } from "@/hooks/useRegistry";
import {
  registry,
  triggerDescriptionFromLevel,
  type ProductType,
  type RegistryProduct,
} from "@/lib/hedgix-data";
import { runtimeEnv } from "@/config/env";

export const Route = createFileRoute("/registry")({
  head: () => ({
    meta: [
      { title: "Registry — Hedgix" },
      {
        name: "description",
        content:
          "The Hedgix product registry: assets, Binance settlement symbols, triggers, premiums, and payouts.",
      },
    ],
  }),
  component: RegistryPage,
});

function RegistryPage() {
  const [rawOpen, setRawOpen] = useState(false);
  const liveRegistry = useRegistry();
  const activeRegistry = liveRegistry.data ?? registry;

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Registry"
        title={
          <>
            The Hedgix <span className="italic">registry</span>, in one place.
          </>
        }
        lede="The registry defines product terms. The contract independently fetches and validates those terms during purchase. Existing policy records are not rewritten when the registry changes."
      />

      <section className="border-b border-hairline bg-paper">
        <div className="mx-auto max-w-[1400px] px-6 py-16 md:px-10 md:py-24">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm md:grid-cols-5">
              <Item k="Name">{activeRegistry.metadata.registry_name}</Item>
              <Item k="Version">{activeRegistry.metadata.registry_version}</Item>
              <Item k="Network">{activeRegistry.metadata.network}</Item>
              <Item k="App">{activeRegistry.metadata.app_name}</Item>
              <Item k="Status">{activeRegistry.metadata.status}</Item>
            </dl>
            <button
              onClick={() => setRawOpen(true)}
              className="border border-ink/30 px-4 py-2 text-xs uppercase tracking-widest hover:bg-ink/5"
            >
              View raw registry JSON
            </button>
          </div>

          <div className="mt-6 border border-hairline bg-stone p-4 text-xs leading-relaxed text-muted-ink">
            Source: <span className="font-mono text-ink">{runtimeEnv.registryUrl}</span>
            {liveRegistry.error
              ? ` · Live registry validation unavailable in this browser session: ${String(liveRegistry.error)}`
              : ""}
          </div>

          <div className="mt-10 text-xs uppercase tracking-[0.2em] text-muted-ink">
            Supported durations
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {activeRegistry.supported_durations.map((duration) => (
              <span
                key={duration.duration_days}
                className="border border-hairline bg-stone px-3 py-1.5 text-sm tabular-nums"
              >
                {duration.duration_days} days
              </span>
            ))}
          </div>

          {activeRegistry.protection_products.map((product) => (
            <ProductBlock key={product.protection_type} product={product} />
          ))}
        </div>
      </section>

      {rawOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => setRawOpen(false)}
        >
          <div
            className="w-full max-w-3xl border border-hairline bg-paper"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-hairline p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-ink">
                Raw registry
              </div>
              <button
                onClick={() => setRawOpen(false)}
                className="border border-hairline px-3 py-1.5 text-xs"
              >
                Close
              </button>
            </header>
            <pre className="max-h-[70vh] overflow-auto p-6 font-mono text-xs leading-relaxed text-ink">
              {JSON.stringify(activeRegistry, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function ProductBlock({ product }: { product: RegistryProduct }) {
  const type = product.protection_type as ProductType;
  const isDepeg = type === "depeg_protection";

  return (
    <div className="mt-12 border border-hairline">
      <header className="border-b border-hairline p-6">
        <h2 className="font-serif text-2xl text-ink md:text-3xl">{product.display_name}</h2>
        <p className="mt-2 text-sm text-muted-ink">
          {isDepeg
            ? "USDT is measured directly against USD using USDTUSD. USDC is measured directly against USD using USDCUSD. Settlement uses the daily low of the configured USD market."
            : "Price-drop products use the same Binance symbol for protected asset and settlement market."}
        </p>
      </header>
      <div className="grid gap-px bg-hairline md:grid-cols-2">
        {product.supported_assets.map((asset) => (
          <div key={asset.asset} className="bg-paper p-6">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-ink">
              Supported asset
            </div>
            <div className="mt-2 font-serif text-3xl text-ink">{asset.asset}</div>
            <dl className="mt-4 space-y-2 text-sm">
              <Row k="Display">{asset.display_name ?? asset.asset}</Row>
              <Row k="Binance symbol">{asset.binance_settlement_symbol}</Row>
              <Row k="Quote">{asset.quote_currency ?? "USDT"}</Row>
            </dl>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-y border-hairline text-[10px] uppercase tracking-[0.2em] text-muted-ink">
              <th className="px-6 py-3 font-medium">Level</th>
              <th className="px-6 py-3 font-medium">Trigger</th>
              <th className="px-6 py-3 font-medium">Premium</th>
              <th className="px-6 py-3 font-medium">Payout</th>
            </tr>
          </thead>
          <tbody>
            {product.event_levels.map((level) => (
              <tr key={level.name} className="border-b border-hairline last:border-b-0">
                <td className="px-6 py-4 text-ink">{level.name}</td>
                <td className="px-6 py-4 tabular-nums text-ink">
                  {triggerDescriptionFromLevel(type, level)}
                </td>
                <td className="px-6 py-4 tabular-nums text-ink">
                  {level.premium.amount} {level.premium.token}
                </td>
                <td className="px-6 py-4 tabular-nums text-ink">
                  {level.payout.amount} {level.payout.token}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Item({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.22em] text-muted-ink">{k}</dt>
      <dd className="mt-1 text-ink">{children}</dd>
    </div>
  );
}

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-hairline py-2 last:border-b-0">
      <dt className="text-muted-ink">{k}</dt>
      <dd className="text-right tabular-nums text-ink">{children}</dd>
    </div>
  );
}
