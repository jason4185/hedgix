import { Sym } from "./Symbols";

const steps = [
  {
    n: "01",
    t: "Choose protection",
    b: "Select the asset, protection type, event level, and coverage duration.",
  },
  {
    n: "02",
    t: "Verify terms",
    b: "The contract fetches and verifies the official Hedgix registry.",
  },
  {
    n: "03",
    t: "Set reference and trigger",
    b: "The contract fetches the Binance live ticker during purchase, stores the Locked reference price, and records the trigger.",
  },
  {
    n: "04",
    t: "Settle and claim",
    b: "Closed Binance daily candles determine whether the policy triggers. The policyholder claims the reserved payout after confirmation.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="border-b border-hairline bg-stone">
      <div className="mx-auto max-w-[1400px] px-6 py-24 md:px-10 md:py-32">
        <div className="mb-16 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-ink">
              <Sym.Triangle className="h-3 w-3 text-violet" /> How it works
            </div>
            <h2 className="font-serif text-4xl leading-[1.02] tracking-tight text-ink md:text-6xl">
              Four <span className="italic">steps</span>. Every one on record.
            </h2>
          </div>
        </div>

        <ol className="grid grid-cols-1 border-t border-ink/20 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li
              key={s.n}
              className={`relative border-b border-ink/20 p-6 md:p-8 ${i > 0 ? "md:border-l md:border-ink/20" : ""} ${i > 1 ? "lg:border-l lg:border-t-0" : ""}`}
            >
              <div className="flex items-start justify-between">
                <div className="font-serif text-6xl font-medium leading-none tracking-tight text-ink md:text-7xl">
                  {s.n}
                </div>
                <Sym.Dot
                  className={`mt-4 h-1.5 w-1.5 ${i === 0 ? "text-violet" : "text-ink/30"}`}
                />
              </div>
              <h3 className="mt-10 font-serif text-2xl leading-tight text-ink">{s.t}</h3>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-ink">{s.b}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
