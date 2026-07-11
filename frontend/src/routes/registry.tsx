import { useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/hedgix/AppLayout";
import { registry } from "@/lib/hedgix-data";

export const Route = createFileRoute("/registry")({
  head: () => ({
    meta: [
      { title: "Registry — Hedgix" },
      {
        name: "description",
        content:
          "The Hedgix product registry: assets, event levels, triggers, premiums, and payouts.",
      },
    ],
  }),
  component: RegistryPage,
});

function RegistryPage() {
  const [rawOpen, setRawOpen] = useState(false);
  return (
    <AppLayout>
      <PageHeader
        eyebrow="Registry"
        title={
          <>
            The Hedgix <span className="italic">registry</span>, in one place.
          </>
        }
        lede="This page renders local mock registry data. Once the on-chain registry is available, the same component will read from it directly."
      />

      <section className="border-b border-hairline bg-paper">
        <div className="mx-auto max-w-[1400px] px-6 py-16 md:px-10 md:py-24">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm md:grid-cols-5">
              <Item k="Name">{registry.name}</Item>
              <Item k="Version">{registry.version}</Item>
              <Item k="Network">{registry.network}</Item>
              <Item k="App">{registry.app}</Item>
              <Item k="Status">{registry.status}</Item>
            </dl>
            <button
              onClick={() => setRawOpen(true)}
              className="border border-ink/30 px-4 py-2 text-xs uppercase tracking-widest hover:bg-ink/5"
            >
              View raw registry JSON
            </button>
          </div>

          <div className="mt-10 text-xs uppercase tracking-[0.2em] text-muted-ink">
            Supported durations
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {registry.durations.map((d) => (
              <span
                key={d}
                className="border border-hairline bg-stone px-3 py-1.5 text-sm tabular-nums"
              >
                {d} days
              </span>
            ))}
          </div>

          <ProductBlock
            title="Price Drop Protection"
            subtitle={`Assets: ${registry.products["Price Drop Protection"].assets.join(", ")}`}
            headers={["Level", "Trigger", "Premium", "Payout"]}
            rows={registry.products["Price Drop Protection"].levels.map((l) => [
              l.level,
              `${l.triggerPct}% drop`,
              l.premium,
              l.payout,
            ])}
          />

          <ProductBlock
            title="Depeg Protection"
            subtitle={`Asset: ${registry.products["Depeg Protection"].asset} · Settlement: ${registry.products["Depeg Protection"].settlementSymbol}`}
            headers={["Level", "Trigger threshold", "Premium", "Payout"]}
            rows={registry.products["Depeg Protection"].levels.map((l) => [
              l.level,
              String(l.threshold),
              l.premium,
              l.payout,
            ])}
          />
        </div>
      </section>

      {rawOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => setRawOpen(false)}
        >
          <div
            className="w-full max-w-3xl border border-hairline bg-paper"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-hairline p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-ink">
                Raw registry (mock)
              </div>
              <button
                onClick={() => setRawOpen(false)}
                className="border border-hairline px-3 py-1.5 text-xs"
              >
                Close
              </button>
            </header>
            <pre className="max-h-[70vh] overflow-auto p-6 font-mono text-xs leading-relaxed text-ink">
              {JSON.stringify(registry, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </AppLayout>
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

function ProductBlock({
  title,
  subtitle,
  headers,
  rows,
}: {
  title: string;
  subtitle: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="mt-12 border border-hairline">
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-hairline p-6">
        <h2 className="font-serif text-2xl text-ink md:text-3xl">{title}</h2>
        <span className="text-xs text-muted-ink">{subtitle}</span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-hairline text-[10px] uppercase tracking-[0.2em] text-muted-ink">
              {headers.map((h) => (
                <th key={h} className="px-6 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-hairline last:border-b-0">
                {r.map((c, j) => (
                  <td key={j} className="px-6 py-4 tabular-nums text-ink">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
