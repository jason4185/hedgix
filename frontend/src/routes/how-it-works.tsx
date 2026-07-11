import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/hedgix/AppLayout";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works — Hedgix" },
      {
        name: "description",
        content:
          "The full lifecycle of a Hedgix policy — from wallet connect to settlement and claim.",
      },
      { property: "og:title", content: "How Hedgix works" },
      {
        property: "og:description",
        content: "Verified terms, verified market data, deterministic settlement.",
      },
    ],
  }),
  component: HowItWorksPage,
});

const steps = [
  {
    n: "01",
    t: "Connect wallet",
    b: "Your wallet address is the sole owner of any protection you purchase.",
  },
  {
    n: "02",
    t: "Choose protection",
    b: "Select product, asset, event level, and coverage duration from the registry.",
  },
  {
    n: "03",
    t: "Registry fetch",
    b: "The contract fetches the official Hedgix registry — not the frontend.",
  },
  {
    n: "04",
    t: "Verify terms",
    b: "Protected asset, protection type, level, duration, premium, payout, Binance symbol, and trigger rule are re-verified on-chain.",
  },
  {
    n: "05",
    t: "Fetch market data",
    b: "The contract fetches Binance reference data via GenLayer's verified fetch.",
  },
  {
    n: "06",
    t: "Store reference & trigger",
    b: "The exact reference price and computed trigger price are written to the policy record.",
  },
  {
    n: "07",
    t: "Coverage starts (next UTC day)",
    b: "Coverage begins on the following UTC day so it always maps to fully closed daily candles.",
  },
  {
    n: "08",
    t: "Daily settlement",
    b: "After each closed candle, the contract fetches the verified daily low and compares it to the stored trigger.",
  },
  {
    n: "09",
    t: "Policy state",
    b: "Status transitions between ACTIVE, TRIGGERED, PAID, EXPIRED, and CANCELLED — all on-chain.",
  },
  {
    n: "10",
    t: "Claim payout",
    b: "If the policy is TRIGGERED, the wallet owner claims the payout from the pool.",
  },
];

function HowItWorksPage() {
  return (
    <AppLayout>
      <PageHeader
        eyebrow="How it works"
        title={
          <>
            Every step is <span className="italic">verified</span> and recorded.
          </>
        }
        lede="Hedgix separates the interface from the source of truth. The frontend helps you choose. The contract does the checking."
      />

      <section className="border-b border-hairline bg-paper">
        <div className="mx-auto max-w-[1400px] px-6 py-20 md:px-10 md:py-28">
          <ol className="grid grid-cols-1 gap-px bg-hairline md:grid-cols-2">
            {steps.map((s) => (
              <li key={s.n} className="bg-paper p-6 md:p-8">
                <div className="flex items-start justify-between">
                  <div className="font-serif text-5xl leading-none text-ink">{s.n}</div>
                </div>
                <h3 className="mt-8 font-serif text-2xl text-ink">{s.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-ink">{s.b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-hairline bg-stone">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-6 py-20 md:grid-cols-2 md:px-10 md:py-28">
          {[
            {
              t: "Why coverage starts the next UTC day",
              b: "Settlement is aligned to fully closed daily candles. Starting the next UTC day guarantees the first candle observed is complete and verifiable.",
            },
            {
              t: "Why settlement waits for a closed candle",
              b: "Only closed candles have a final daily low. Using intra-day values would introduce ambiguity into a rule-based product.",
            },
            {
              t: "Why frontend values are not trusted",
              b: "The contract re-fetches product terms from the registry and market data from Binance itself. What you enter is only the request.",
            },
            {
              t: "How GenLayer validators verify data",
              b: "GenLayer validators run the fetch and reach consensus on the observed result — so nondeterministic inputs like a price call become verifiable, deterministic on-chain values.",
            },
            {
              t: "Reserved liability",
              b: "For every active protection, the pool reserves the maximum payout. Withdrawable balance is what remains after all reservations.",
            },
          ].map((c) => (
            <div key={c.t} className="border border-hairline bg-paper p-6 md:p-8">
              <h3 className="font-serif text-2xl text-ink">{c.t}</h3>
              <p className="mt-3 text-sm text-muted-ink">{c.b}</p>
            </div>
          ))}
        </div>
      </section>
    </AppLayout>
  );
}
