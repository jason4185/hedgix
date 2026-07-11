import { Sym } from "./Symbols";

const summary = [
  { k: "Total protections", v: "2" },
  { k: "Active", v: "2", tone: "success" as const },
  { k: "Triggered", v: "0", tone: "danger" as const },
  { k: "Paid", v: "0" },
  { k: "Expired", v: "0" },
  { k: "Cancelled", v: "0" },
];

type Policy = {
  asset: string;
  settlement?: string;
  type: string;
  level: string;
  status: "Active" | "Triggered" | "Paid";
  reference: string;
  trigger: string;
  duration: string;
  start: string;
  end: string;
  expected: string;
  readiness: string;
  premium: string;
  payout: string;
};

const policies: Policy[] = [
  {
    asset: "BTCUSDT",
    type: "Price Drop Protection",
    level: "Protected Drop",
    status: "Active",
    reference: "63,772.06",
    trigger: "62,496.6188",
    duration: "7 days",
    start: "2026-07-11",
    end: "2026-07-17",
    expected: "2026-07-11",
    readiness: "Waiting for daily candle to close",
    premium: "1 GEN",
    payout: "2 GEN",
  },
  {
    asset: "USDC",
    settlement: "USDCUSDT",
    type: "Depeg Protection",
    level: "Soft Depeg",
    status: "Active",
    reference: "1.00047",
    trigger: "0.998",
    duration: "7 days",
    start: "2026-07-11",
    end: "2026-07-17",
    expected: "2026-07-11",
    readiness: "Waiting for daily candle to close",
    premium: "1 GEN",
    payout: "2 GEN",
  },
];

function StatusPill({ status }: { status: Policy["status"] }) {
  const map = {
    Active: "border-success/40 text-success bg-success/8",
    Triggered: "border-danger/40 text-danger bg-danger/10",
    Paid: "border-ink/30 text-ink bg-ink/5",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ${map[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" /> {status}
    </span>
  );
}

function Row({ k, v, mono = true }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between border-b border-hairline py-2.5 text-sm">
      <span className="text-muted-ink">{k}</span>
      <span className={`text-ink ${mono ? "font-medium tabular-nums" : ""}`}>{v}</span>
    </div>
  );
}

function PolicyCard({ p, featured }: { p: Policy; featured?: boolean }) {
  return (
    <article
      className={`relative border border-hairline bg-paper ${featured ? "lg:col-span-7" : "lg:col-span-5"}`}
    >
      <div
        className={`absolute right-0 top-0 h-3 w-3 ${p.status === "Active" ? "bg-success" : "bg-danger"}`}
      />
      <header className="flex items-start justify-between border-b border-hairline p-6 md:p-8">
        <div>
          <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-muted-ink">
            Policy · Wallet-scoped
          </div>
          <div className="flex items-baseline gap-3">
            <h4 className="font-serif text-3xl leading-none tracking-tight text-ink md:text-4xl">
              {p.asset}
            </h4>
            {p.settlement && (
              <span className="text-xs uppercase tracking-widest text-muted-ink">
                via {p.settlement}
              </span>
            )}
          </div>
          <div className="mt-3 text-sm text-muted-ink">
            {p.type} <span className="mx-2 text-ink/30">·</span> {p.level}
          </div>
        </div>
        <StatusPill status={p.status} />
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="border-hairline p-6 md:border-r md:p-8">
          <div className="mb-4 text-[10px] uppercase tracking-[0.22em] text-muted-ink">Terms</div>
          <Row k="Reference price" v={p.reference} />
          <Row k="Trigger price" v={p.trigger} />
          <Row k="Coverage" v={p.duration} />
          <Row k="Start" v={p.start} />
          <Row k="End" v={p.end} />
        </div>
        <div className="p-6 md:p-8">
          <div className="mb-4 text-[10px] uppercase tracking-[0.22em] text-muted-ink">
            Settlement
          </div>
          <Row k="Expected settlement" v={p.expected} />
          <Row k="Readiness" v={p.readiness} mono={false} />
          <Row k="Premium" v={p.premium} />
          <Row k="Potential payout" v={p.payout} />
          <div className="mt-4 flex gap-2">
            <button className="flex-1 border border-ink/30 px-3 py-2 text-xs font-medium text-ink hover:bg-ink/5">
              View policy
            </button>
            <button className="flex-1 bg-ink px-3 py-2 text-xs font-medium text-paper hover:bg-ink/90">
              Claim
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function Dashboard() {
  return (
    <section id="dashboard" className="border-b border-hairline bg-paper">
      <div className="mx-auto max-w-[1400px] px-6 py-24 md:px-10 md:py-32">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-ink">
              <Sym.Dot className="h-1.5 w-1.5 text-violet" /> Dashboard preview{" "}
              <span className="ml-2 border border-hairline px-2 py-0.5 text-[10px] tracking-widest">
                EXAMPLE DATA
              </span>
            </div>
            <h2 className="font-serif text-4xl leading-[1.02] tracking-tight text-ink md:text-5xl">
              Your <span className="italic">protections</span>, one wallet at a glance.
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-ink">
            <span className="border border-hairline px-3 py-1.5">Wallet 0x7a…3f</span>
            <span className="border border-hairline bg-stone px-3 py-1.5">v1 registry</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px border border-hairline bg-hairline md:grid-cols-3 lg:grid-cols-6">
          {summary.map((s) => (
            <div key={s.k} className="bg-paper p-5 md:p-6">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-ink">{s.k}</div>
              <div
                className={`mt-3 font-serif text-4xl leading-none tracking-tight md:text-5xl ${s.tone === "success" ? "text-success" : s.tone === "danger" ? "text-danger" : "text-ink"}`}
              >
                {s.v}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <PolicyCard p={policies[0]} featured />
          <PolicyCard p={policies[1]} />
        </div>
      </div>
    </section>
  );
}
