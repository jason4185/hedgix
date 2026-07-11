import { Sym } from "./Symbols";

const points = [
  "Product terms come from the official Hedgix registry.",
  "The contract independently verifies selected terms.",
  "Binance data is fetched during purchase and settlement.",
  "GenLayer validators verify nondeterministic results.",
  "Policies are wallet-scoped in the application dashboard.",
  "Policy state is stored on-chain.",
  "Settlement compares verified daily lows against stored trigger conditions.",
  "Frontend values are used only for display and interaction.",
];

export function TransparencySection() {
  return (
    <section id="transparency" className="border-b border-hairline bg-paper">
      <div className="mx-auto max-w-[1400px] px-6 py-24 md:px-10 md:py-32">
        <div className="grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-ink">
              <Sym.Diamond className="h-3 w-3 text-violet" /> Transparency
            </div>
            <h2 className="font-serif text-4xl leading-[1] tracking-tight text-ink md:text-6xl">
              The interface is <span className="italic">not</span> the source of truth.
            </h2>
            <p className="mt-8 max-w-md text-base leading-relaxed text-muted-ink md:text-lg">
              What you see is convenience. What the contract verifies is authority. Every rule below
              applies to every policy, without exception.
            </p>
          </div>

          <ol className="lg:col-span-7">
            {points.map((p, i) => (
              <li
                key={p}
                className="grid grid-cols-[auto_1fr_auto] items-baseline gap-6 border-t border-hairline py-6 last:border-b"
              >
                <span className="font-serif text-lg text-muted-ink tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="font-serif text-xl leading-snug text-ink md:text-2xl">{p}</p>
                <Sym.Dot className={`h-1.5 w-1.5 ${i % 3 === 0 ? "text-violet" : "text-ink/30"}`} />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
