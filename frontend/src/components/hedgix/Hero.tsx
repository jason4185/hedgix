import { Link } from "@tanstack/react-router";
import { Sym } from "./Symbols";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-amber">
      <div className="relative mx-auto max-w-[1400px] px-6 pb-24 pt-10 md:px-10 md:pb-32 md:pt-16">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-9">
            <div className="mb-8 flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-ink/70 anim-fade-up">
              <Sym.Diamond className="h-3 w-3" />
              <span>Hedgix Protocol · v1</span>
            </div>

            <h1 className="font-serif text-[3rem] leading-[0.98] tracking-[-0.02em] text-ink sm:text-[4.25rem] md:text-[5.5rem] lg:text-[6.75rem]">
              <span className="anim-fade-up inline-block" style={{ animationDelay: "0.05s" }}>
                Protection
              </span>{" "}
              <span
                className="anim-fade-up inline-flex items-center"
                style={{ animationDelay: "0.12s" }}
              >
                <Sym.Triangle className="mx-2 hidden h-6 w-6 text-ink/70 md:inline-block" />
                for
              </span>{" "}
              <span className="anim-fade-up inline-block italic" style={{ animationDelay: "0.2s" }}>
                markets
              </span>{" "}
              <span className="anim-fade-up inline-block" style={{ animationDelay: "0.28s" }}>
                that
              </span>{" "}
              <span
                className="anim-fade-up inline-flex items-center"
                style={{ animationDelay: "0.36s" }}
              >
                never
                <Sym.Cross className="mx-2 hidden h-5 w-5 text-ink/70 md:inline-block" />
              </span>{" "}
              <span className="anim-fade-up inline-block" style={{ animationDelay: "0.44s" }}>
                stand still.
              </span>
            </h1>
          </div>

          <div className="lg:col-span-5 lg:col-start-8">
            <p
              className="anim-fade-up max-w-md text-base leading-relaxed text-ink/80 md:text-lg"
              style={{ animationDelay: "0.55s" }}
            >
              Protect selected crypto assets against defined price drops and stablecoin depegs.
              Hedgix verifies market conditions through Binance data and settles every protection
              transparently on-chain.
            </p>
            <div
              className="anim-fade-up mt-8 flex flex-wrap items-center gap-3"
              style={{ animationDelay: "0.65s" }}
            >
              <Link
                to="/protect"
                search={{ type: undefined, asset: undefined }}
                className="group inline-flex items-center gap-3 bg-ink px-6 py-3.5 text-sm font-medium text-paper transition-colors hover:bg-ink/90"
              >
                Get Protection
                <Sym.Arrow className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/how-it-works"
                className="inline-flex items-center gap-2 border border-ink/40 px-6 py-3.5 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-ink/5"
              >
                Explore How It Works
              </Link>
            </div>
          </div>
        </div>

        <div
          className="anim-fade-up mt-20 border-t border-ink/20 pt-6"
          style={{ animationDelay: "0.8s" }}
        >
          <div className="grid grid-cols-2 gap-6 text-xs uppercase tracking-[0.18em] text-ink/70 md:grid-cols-4">
            {[
              "GenLayer-powered",
              "Binance market data",
              "On-chain policy records",
              "Transparent trigger rules",
            ].map((t, i) => (
              <div key={t} className="flex items-center gap-2">
                <Sym.Dot className="h-1.5 w-1.5" />
                <span>{t}</span>
                {i < 3 && <span className="ml-auto hidden h-3 w-px bg-ink/20 md:block" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
