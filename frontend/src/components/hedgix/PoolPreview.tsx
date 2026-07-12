import { Sym } from "./Symbols";
import { useAdminReads } from "@/hooks/useHedgixReads";
import { formatUtcDate, registry } from "@/lib/hedgix-data";
import { weiToGenText } from "@/lib/genlayer/formatters";

function nextDailySettlementWindow(): string {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return `${formatUtcDate(next.toISOString().slice(0, 10))} UTC`;
}

function genOrUnavailable(value: string | undefined): string {
  return value === undefined ? "Unavailable" : weiToGenText(value);
}

export function PoolPreview() {
  const reads = useAdminReads();
  const marketCount = registry.protection_products.reduce(
    (count, product) => count + product.supported_assets.length,
    0,
  );
  const items = [
    {
      k: "Active protections",
      v: reads.summary.data?.active_protection_count ?? "Unavailable",
      tone: "success" as const,
    },
    { k: "Markets monitored", v: String(marketCount) },
    {
      k: "Next settlement window",
      v: nextDailySettlementWindow(),
    },
    {
      k: "Contract status",
      v: reads.paused.data === undefined ? "Unavailable" : reads.paused.data ? "Paused" : "Active",
      tone: reads.paused.data ? undefined : ("success" as const),
    },
    { k: "Pool balance", v: genOrUnavailable(reads.pool.data?.pool_balance) },
    { k: "Reserved liability", v: genOrUnavailable(reads.pool.data?.reserved_liability) },
    {
      k: "Available capacity",
      v: genOrUnavailable(reads.pool.data?.available_to_withdraw),
    },
    { k: "Registry version", v: reads.registryVersion.data ?? "v1" },
  ];

  return (
    <section className="border-b border-hairline bg-stone" aria-labelledby="protocol-activity">
      <div className="mx-auto max-w-[1400px] px-6 py-24 md:px-10 md:py-32">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-ink">
              <Sym.Cross className="h-3 w-3 text-violet" /> Protocol activity
            </div>
            <h2
              id="protocol-activity"
              className="max-w-2xl font-serif text-4xl leading-[1.02] tracking-tight text-ink md:text-5xl"
            >
              Coverage, settlement and pool state in one live view.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-ink md:text-base">
              Hedgix reads the deployed Bradbury contract for pool accounting and active-protection
              counts. Daily settlement windows are shown in UTC because the contract settles closed
              Binance daily candles.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px border border-hairline bg-hairline md:grid-cols-4">
          {items.map((it) => (
            <div key={it.k} className="bg-paper p-6 md:p-8">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-ink">{it.k}</div>
              <div
                className={`mt-4 font-serif text-3xl leading-none tracking-tight md:text-4xl ${it.tone === "success" ? "text-success" : "text-ink"}`}
              >
                {it.v}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
