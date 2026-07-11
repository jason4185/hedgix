import { Sym } from "./Symbols";

const items = [
  { k: "Pool balance", v: "7 GEN" },
  { k: "Reserved liability", v: "4 GEN" },
  { k: "Available to withdraw", v: "3 GEN" },
  { k: "Total premiums collected", v: "2 GEN" },
  { k: "Total payouts paid", v: "0 GEN" },
  { k: "Active protections", v: "2" },
  { k: "Registry version", v: "v1" },
  { k: "Contract status", v: "Active", tone: "success" as const },
];

export function PoolPreview() {
  return (
    <section className="border-b border-hairline bg-stone">
      <div className="mx-auto max-w-[1400px] px-6 py-24 md:px-10 md:py-32">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-ink">
              <Sym.Cross className="h-3 w-3 text-violet" /> Protocol pool{" "}
              <span className="ml-2 border border-hairline bg-paper px-2 py-0.5 text-[10px] tracking-widest">
                EXAMPLE CONTRACT DATA
              </span>
            </div>
            <h2 className="max-w-2xl font-serif text-4xl leading-[1.02] tracking-tight text-ink md:text-5xl">
              A <span className="italic">solvent</span> pool, transparently accounted.
            </h2>
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
