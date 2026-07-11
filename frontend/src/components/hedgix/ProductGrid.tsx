import { Sym } from "./Symbols";
import type { ReactNode } from "react";

function VizPriceDrop() {
  return (
    <svg viewBox="0 0 400 220" className="h-full w-full">
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1="10"
          x2="390"
          y1={40 + i * 45}
          y2={40 + i * 45}
          stroke="currentColor"
          strokeOpacity="0.08"
        />
      ))}
      <path
        d="M10 60 L60 80 L110 65 L160 100 L210 130 L260 170 L310 160 L360 180 L390 190"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <line
        x1="10"
        x2="390"
        y1="160"
        y2="160"
        stroke="var(--danger)"
        strokeDasharray="3 3"
        strokeOpacity="0.7"
      />
      <circle cx="260" cy="170" r="4" fill="var(--danger)" />
      <text
        x="14"
        y="24"
        className="fill-current text-[9px] uppercase tracking-widest"
        opacity="0.6"
      >
        BTC · 7d
      </text>
    </svg>
  );
}
function VizDepeg() {
  return (
    <svg viewBox="0 0 400 220" className="h-full w-full">
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={i}
          x1="10"
          x2="390"
          y1={30 + i * 40}
          y2={30 + i * 40}
          stroke="currentColor"
          strokeOpacity="0.08"
        />
      ))}
      <line x1="10" x2="390" y1="110" y2="110" stroke="currentColor" strokeOpacity="0.35" />
      <line x1="10" x2="390" y1="150" y2="150" stroke="var(--violet)" strokeDasharray="3 3" />
      <path
        d="M10 112 L60 108 L110 114 L160 111 L210 116 L260 118 L310 130 L360 145 L390 138"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <text
        x="14"
        y="22"
        className="fill-current text-[9px] uppercase tracking-widest"
        opacity="0.6"
      >
        USDCUSDT · peg 1.00
      </text>
      <text x="315" y="146" className="fill-current text-[9px]" style={{ fill: "var(--violet)" }}>
        0.998
      </text>
    </svg>
  );
}
function VizSettlement() {
  return (
    <svg viewBox="0 0 400 220" className="h-full w-full">
      {Array.from({ length: 7 }).map((_, i) => {
        const x = 40 + i * 50;
        const isDown = i >= 5;
        const h = 40 + (i % 3) * 20;
        return (
          <g key={i}>
            <line
              x1={x}
              x2={x}
              y1={110 - h / 2}
              y2={110 + h / 2}
              stroke="currentColor"
              strokeWidth="1"
            />
            <rect
              x={x - 8}
              y={110 - h / 3}
              width="16"
              height={(h / 3) * 2}
              fill={isDown ? "var(--danger)" : "currentColor"}
              opacity={isDown ? 0.9 : 0.85}
            />
          </g>
        );
      })}
      <line x1="10" x2="390" y1="150" y2="150" stroke="var(--violet)" strokeDasharray="3 3" />
      <text
        x="14"
        y="22"
        className="fill-current text-[9px] uppercase tracking-widest"
        opacity="0.6"
      >
        Daily candles · verified
      </text>
    </svg>
  );
}
function VizRecords() {
  return (
    <svg viewBox="0 0 400 220" className="h-full w-full">
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect
            x={30 + i * 12}
            y={30 + i * 12}
            width="280"
            height="60"
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.15 + i * 0.15}
          />
        </g>
      ))}
      <rect x="66" y="66" width="280" height="60" fill="var(--paper)" stroke="currentColor" />
      <text
        x="80"
        y="88"
        className="fill-current text-[10px] font-medium"
        style={{ letterSpacing: "0.1em" }}
      >
        POLICY 0x7a..3f
      </text>
      <line x1="80" x2="330" y1="98" y2="98" stroke="currentColor" strokeOpacity="0.2" />
      <text x="80" y="115" className="fill-current text-[9px]" opacity="0.7">
        Status
      </text>
      <text x="290" y="115" className="fill-current text-[9px]" style={{ fill: "var(--success)" }}>
        Active
      </text>
    </svg>
  );
}

type Card = {
  label: string;
  title: string;
  body: string;
  viz: ReactNode;
  span: string;
  accent?: boolean;
};

const cards: Card[] = [
  {
    label: "Price Drop Protection",
    title: "Protection for defined market declines.",
    body: "Cover eligible BTC, ETH, SOL, and BNB positions against clearly defined price-drop events.",
    viz: <VizPriceDrop />,
    span: "lg:col-span-7",
  },
  {
    label: "Depeg Protection",
    title: "Coverage for stablecoin instability.",
    body: "Protect against defined USDC depeg thresholds using the verified USDCUSDT market pair.",
    viz: <VizDepeg />,
    span: "lg:col-span-5",
    accent: true,
  },
  {
    label: "Verified Settlement",
    title: "Closed market data determines the result.",
    body: "Settlement uses closed Binance daily candles verified through GenLayer consensus.",
    viz: <VizSettlement />,
    span: "lg:col-span-5",
  },
  {
    label: "Transparent Policy Records",
    title: "Every important term remains visible.",
    body: "Reference prices, trigger levels, dates, payout amounts, and policy status remain available to the policyholder.",
    viz: <VizRecords />,
    span: "lg:col-span-7",
  },
];

export function ProductGrid() {
  return (
    <section id="products" className="border-b border-hairline bg-paper">
      <div className="mx-auto max-w-[1400px] px-6 py-24 md:px-10 md:py-32">
        <div className="mb-14 flex items-end justify-between">
          <div>
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-ink">
              <Sym.Cross className="h-3 w-3" /> Products
            </div>
            <h2 className="max-w-2xl font-serif text-4xl leading-[1.02] tracking-tight text-ink md:text-5xl">
              Four <span className="italic">defined</span> protection primitives.
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-px bg-hairline lg:grid-cols-12">
          {cards.map((c) => (
            <article
              key={c.label}
              className={`group relative flex flex-col bg-paper p-8 transition-colors hover:bg-stone/60 md:p-10 ${c.span}`}
            >
              <div
                className={`absolute right-0 top-0 h-4 w-4 ${c.accent ? "bg-violet" : "bg-ink"}`}
              />
              <div className="mb-6 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-muted-ink">
                <Sym.Dot className={`h-1.5 w-1.5 ${c.accent ? "text-violet" : ""}`} /> {c.label}
              </div>
              <div
                className={`relative mb-8 aspect-[16/9] border border-hairline bg-stone/50 text-ink ${c.accent ? "bg-amber/40" : ""}`}
              >
                <div className="absolute inset-0 p-4">{c.viz}</div>
              </div>
              <h3 className="max-w-md font-serif text-2xl leading-tight tracking-tight text-ink transition-transform group-hover:-translate-y-0.5 md:text-3xl">
                {c.title}
              </h3>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-ink md:text-base">
                {c.body}
              </p>
              <a
                href="#"
                className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-violet"
              >
                Learn more <Sym.Arrow className="h-3.5 w-4" />
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
