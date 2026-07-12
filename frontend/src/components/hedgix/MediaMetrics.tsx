import { Sym } from "./Symbols";

export function MediaMetrics() {
  return (
    <section
      id="markets"
      className="relative overflow-hidden border-b border-hairline bg-ink text-paper"
    >
      <div className="relative mx-auto max-w-[1400px] px-6 py-24 md:px-10 md:py-32">
        <div className="mb-16 flex items-center justify-between">
          <a
            href="#how"
            className="inline-flex items-center gap-3 border border-paper/25 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-paper transition-colors hover:bg-paper/10"
          >
            <span className="h-1.5 w-1.5 bg-amber" />
            See how Hedgix works
          </a>
          <div className="hidden items-center gap-2 text-xs uppercase tracking-[0.22em] text-paper/50 md:flex">
            <Sym.Triangle className="h-3 w-3" /> Fig. 02 — Trigger scenario
          </div>
        </div>

        <div className="relative aspect-[16/8] w-full border border-paper/15 bg-ink">
          <svg viewBox="0 0 1200 600" className="h-full w-full">
            <defs>
              <linearGradient id="glow" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#f6c14a" stopOpacity="0.35" />
                <stop offset="1" stopColor="#f6c14a" stopOpacity="0" />
              </linearGradient>
            </defs>
            {Array.from({ length: 10 }).map((_, i) => (
              <line
                key={i}
                x1="0"
                x2="1200"
                y1={60 + i * 55}
                y2={60 + i * 55}
                stroke="#ffffff"
                strokeOpacity="0.06"
              />
            ))}
            {Array.from({ length: 14 }).map((_, i) => (
              <line
                key={i}
                x1={90 + i * 80}
                x2={90 + i * 80}
                y1="0"
                y2="600"
                stroke="#ffffff"
                strokeOpacity="0.05"
              />
            ))}
            {/* trigger */}
            <line
              x1="0"
              x2="1200"
              y1="420"
              y2="420"
              stroke="#e05a2b"
              strokeDasharray="6 6"
              strokeWidth="1.5"
            />
            <text x="14" y="414" className="fill-[#e05a2b] text-[11px] uppercase tracking-widest">
              Stored trigger
            </text>
            {/* reference */}
            <line
              x1="0"
              x2="1200"
              y1="230"
              y2="230"
              stroke="#ffffff"
              strokeOpacity="0.4"
              strokeDasharray="2 6"
            />
            <text x="14" y="224" className="fill-white/60 text-[11px] uppercase tracking-widest">
              Locked reference
            </text>
            {/* market line */}
            <path
              className="anim-draw"
              d="M 0 220 L 90 240 L 180 200 L 270 260 L 360 240 L 450 300 L 540 330 L 630 310 L 720 380 L 810 400 L 900 420 L 990 440 L 1080 430 L 1200 460"
              fill="none"
              stroke="#f6c14a"
              strokeWidth="2.5"
            />
            <path
              d="M 0 220 L 90 240 L 180 200 L 270 260 L 360 240 L 450 300 L 540 330 L 630 310 L 720 380 L 810 400 L 900 420 L 990 440 L 1080 430 L 1200 460 L 1200 600 L 0 600 Z"
              fill="url(#glow)"
            />
            {/* Boundary card */}
            <g transform="translate(830 80)">
              <rect width="330" height="120" fill="none" stroke="#ffffff" strokeOpacity="0.25" />
              <text x="16" y="28" className="fill-white/50 text-[10px] uppercase tracking-widest">
                Policy state
              </text>
              <text x="16" y="66" className="fill-[#e05a2b] font-serif text-[28px]">
                Triggered
              </text>
              <text x="16" y="96" className="fill-white/60 text-[11px]">
                Verified daily low crossed trigger.
              </text>
              <rect x="292" y="10" width="24" height="24" fill="#e05a2b" />
            </g>
            <g transform="translate(60 80)">
              <rect width="240" height="70" fill="none" stroke="#ffffff" strokeOpacity="0.25" />
              <text x="16" y="28" className="fill-white/50 text-[10px] uppercase tracking-widest">
                Status transition
              </text>
              <text x="16" y="54" className="fill-white font-serif text-[18px]">
                Active <tspan className="fill-white/40">→</tspan> Triggered
              </text>
            </g>
          </svg>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-px bg-paper/15 md:grid-cols-3">
          {[
            { k: "2", label: "protection products" },
            { k: "7 / 14 / 30", label: "day coverage" },
            { k: "100%", label: "on-chain policy records" },
          ].map((m) => (
            <div key={m.label} className="bg-ink p-8 md:p-10">
              <div className="font-serif text-5xl leading-none tracking-tight text-paper md:text-6xl">
                {m.k}
              </div>
              <div className="mt-4 text-xs uppercase tracking-[0.22em] text-paper/60">
                {m.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
