import { Link } from "@tanstack/react-router";
import { Sym } from "./Symbols";

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-amber">
      <div className="mx-auto max-w-[1400px] px-6 py-28 md:px-10 md:py-36">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <Sym.Triangle className="mb-8 h-6 w-6 text-ink/70" />
            <h2 className="font-serif text-4xl leading-[1] tracking-tight text-ink sm:text-5xl md:text-7xl">
              Protect the position <span className="italic">before</span> the market tests it.
            </h2>
          </div>
          <div className="lg:col-span-4 lg:pt-24">
            <p className="max-w-md text-base leading-relaxed text-ink/80 md:text-lg">
              Choose a defined protection product, verify the terms on-chain, and track every stage
              from purchase to settlement.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/protect"
                search={{ type: undefined, asset: undefined }}
                className="inline-flex items-center gap-2 bg-ink px-6 py-3.5 text-sm font-medium text-paper hover:bg-ink/90"
              >
                Get Protection <Sym.Arrow className="h-4 w-4" />
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 border border-ink/40 px-6 py-3.5 text-sm font-medium text-ink hover:bg-ink/5"
              >
                View Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
