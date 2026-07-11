import { Sym } from "./Symbols";

export function EditorialIntro() {
  return (
    <section className="border-b border-hairline bg-paper">
      <div className="mx-auto max-w-[1400px] px-6 py-24 md:px-10 md:py-32">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="mb-6 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-ink">
              <Sym.Dot className="h-1.5 w-1.5 text-violet" />
              <span>The Protocol</span>
            </div>
            <h2 className="font-serif text-4xl leading-[1.02] tracking-tight text-ink md:text-6xl">
              Market <span className="italic">protection</span> powered by verified data and
              intelligent contracts.
            </h2>
          </div>
          <div className="lg:col-span-4 lg:col-start-9">
            <p className="text-base leading-relaxed text-muted-ink md:text-lg">
              The interface helps users choose coverage, but the contract independently verifies
              official product terms, market prices, trigger conditions, settlement data, and policy
              state.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
