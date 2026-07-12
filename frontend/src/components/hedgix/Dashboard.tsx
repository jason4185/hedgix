import { Link } from "@tanstack/react-router";
import { Sym } from "./Symbols";

const cards = [
  { k: "Total protections", v: "Your wallet" },
  { k: "Active", v: "In coverage" },
  { k: "Triggered", v: "Claimable" },
  { k: "Reserved liability", v: "pool-backed" },
];

export function Dashboard() {
  return (
    <section id="dashboard" className="border-b border-hairline bg-paper">
      <div className="mx-auto max-w-[1400px] px-6 py-24 md:px-10 md:py-32">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-ink">
              <Sym.Dot className="h-1.5 w-1.5 text-violet" /> Dashboard
            </div>
            <h2 className="font-serif text-4xl leading-[1.02] tracking-tight text-ink md:text-5xl">
              Your <span className="italic">protections</span>, scoped to your wallet.
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-muted-ink md:text-base">
              View and manage the protections associated with your connected wallet. Each card keeps
              the stored market, Locked reference price, coverage period, and next available action
              in one place.
            </p>
            <Link
              to="/dashboard"
              className="mt-8 inline-flex bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-ink/90"
            >
              Open dashboard
            </Link>
          </div>
          <div className="lg:col-span-7">
            <div className="grid grid-cols-1 gap-px border border-hairline bg-hairline md:grid-cols-2">
              {cards.map((card) => (
                <div key={card.k} className="bg-paper p-6 md:p-8">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-ink">
                    {card.k}
                  </div>
                  <div className="mt-4 font-serif text-3xl leading-none text-ink">{card.v}</div>
                </div>
              ))}
            </div>
            <div className="border-x border-b border-hairline bg-stone p-6 text-sm leading-relaxed text-muted-ink">
              The dashboard highlights active coverage, triggered protections, eligible payouts, and
              the next settlement status without exposing public wallet history.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
