import { Sym } from "./Symbols";

function ProtectionVisual() {
  return (
    <svg viewBox="0 0 600 500" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="fade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.14" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* horizontal grid */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line
          key={i}
          x1="40"
          x2="560"
          y1={80 + i * 70}
          y2={80 + i * 70}
          stroke="currentColor"
          strokeOpacity="0.09"
        />
      ))}
      {/* trigger line */}
      <line
        x1="40"
        x2="560"
        y1="340"
        y2="340"
        stroke="currentColor"
        strokeDasharray="4 4"
        strokeOpacity="0.5"
      />
      <text
        x="46"
        y="335"
        className="fill-current text-[10px] uppercase tracking-widest"
        opacity="0.6"
      >
        Trigger
      </text>

      {/* shield boundary */}
      <path
        d="M 40 340 L 300 340 L 320 320 L 340 340 L 560 340"
        fill="none"
        stroke="var(--violet)"
        strokeWidth="2"
      />
      <path
        d="M 300 340 L 320 320 L 340 340 L 320 360 Z"
        fill="var(--violet)"
        fillOpacity="0.18"
        stroke="var(--violet)"
        strokeWidth="1.5"
      />

      {/* falling market line */}
      <path
        className="anim-draw"
        d="M 40 140 L 100 170 L 160 150 L 220 210 L 280 240 L 320 300 L 360 335 L 420 330 L 480 310 L 560 280"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M 40 140 L 100 170 L 160 150 L 220 210 L 280 240 L 320 300 L 360 335 L 420 330 L 480 310 L 560 280 L 560 460 L 40 460 Z"
        fill="url(#fade)"
      />

      {/* markers */}
      <circle cx="320" cy="300" r="4" fill="currentColor" />
      <circle cx="320" cy="320" r="6" fill="var(--violet)" />
      <text x="330" y="304" className="fill-current text-[10px]" opacity="0.7">
        Locked reference
      </text>
      <text
        x="330"
        y="316"
        className="fill-current text-[10px]"
        opacity="0.7"
        style={{ fill: "var(--violet)" }}
      >
        Protection engaged
      </text>
    </svg>
  );
}

export function SplitFeature() {
  return (
    <section className="border-b border-hairline">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 lg:grid-cols-2">
        <div className="relative border-r border-hairline bg-stone p-8 md:p-16 lg:min-h-[560px]">
          <div className="absolute left-6 top-6 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-ink/60">
            <Sym.Diamond className="h-3 w-3" />
            <span>Fig. 01 — Market intercept</span>
          </div>
          <div className="mt-10 h-full text-ink">
            <ProtectionVisual />
          </div>
        </div>
        <div className="flex flex-col justify-center p-8 md:p-16">
          <Sym.Diamond className="h-4 w-4 text-violet" />
          <h3 className="mt-6 font-serif text-3xl leading-[1.05] tracking-tight text-ink md:text-5xl">
            Protection without <span className="italic">hidden</span> trigger rules.
          </h3>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-ink md:text-lg">
            Every policy records its verified Locked reference price, trigger price, coverage
            period, premium, payout amount, settlement progress, and final status.
          </p>
          <a
            href="#transparency"
            className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-violet transition-transform hover:translate-x-1"
          >
            See how verification works <Sym.Arrow className="h-3.5 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
