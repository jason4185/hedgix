import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/hedgix/AppLayout";
import { BRADBURY_EXPLORER_URL } from "@/config/chains";
import { runtimeEnv } from "@/config/env";
import { REGISTRY_URL } from "@/lib/hedgix-data";

export const Route = createFileRoute("/transparency")({
  head: () => ({
    meta: [
      { title: "Transparency — Hedgix" },
      {
        name: "description",
        content:
          "The interface is not the source of truth. Registry, market data, and settlement are all independently verified on-chain.",
      },
      { property: "og:title", content: "Hedgix Transparency" },
      {
        property: "og:description",
        content: "How Hedgix verifies registry, market data, and settlement.",
      },
    ],
  }),
  component: TransparencyPage,
});

const sections = [
  {
    t: "Trust model",
    b: "The frontend is a display and interaction layer. RainbowKit connects an injected browser wallet; WalletConnect and QR pairing are intentionally not included.",
  },
  {
    t: "GenLayerJS transactions",
    b: "GenLayerJS submits Intelligent Contract reads and writes, then monitors GenLayer transaction status. A transaction hash alone is not treated as success.",
  },
  {
    t: "Registry verification",
    b: "The contract fetches the registry and verifies metadata, version, protected asset, protection type, event level, duration, premium, payout, Binance symbol, and trigger rule for every purchase.",
  },
  {
    t: "Market data verification",
    b: "Binance is the only market-data provider. The contract verifies ticker symbols during purchase and candle open time, close time, selected price field, and validator agreement during settlement.",
  },
  {
    t: "Settlement verification",
    b: "Each closed 1-day candle low is compared against the stored trigger. Policy transitions between ACTIVE, TRIGGERED, PAID, EXPIRED, and CANCELLED are stored on-chain.",
  },
  {
    t: "Pool accounting",
    b: "The pool tracks reserved liability for every active protection. Withdrawable balance is only what remains after reservations.",
  },
  {
    t: "User ownership",
    b: "Every policy is wallet-scoped. Only the owning wallet can claim payouts or cancel where allowed.",
  },
  {
    t: "MVP limitations",
    b: "This MVP still has trust assumptions: the versioned registry is hosted externally, Binance is centralized market data, the underwriting pool must remain funded, and settlement requires a transaction.",
  },
  {
    t: "Policy evidence",
    b: "Hedgix shows only verified records. Transaction hashes are omitted unless a specific purchase, settlement, trigger, or claim record has been confirmed.",
  },
];

const verifiedResources = [
  {
    k: "Deployed Hedgix contract",
    v: runtimeEnv.contractAddress ?? "Contract address unavailable",
    href: runtimeEnv.contractExplorerUrl ?? BRADBURY_EXPLORER_URL,
  },
  {
    k: "Official product registry",
    v: "Hedgix registry v1",
    href: REGISTRY_URL,
  },
  {
    k: "GitHub source code",
    v: "jason4185/hedgix",
    href: "https://github.com/jason4185/hedgix",
  },
  {
    k: "GenLayer Bradbury network",
    v: "Bradbury explorer",
    href: BRADBURY_EXPLORER_URL,
  },
];

function TransparencyPage() {
  return (
    <AppLayout>
      <PageHeader
        eyebrow="Transparency"
        title={
          <>
            The interface is <span className="italic">not</span> the source of truth.
          </>
        }
        lede="Every meaningful value in a Hedgix policy is fetched and verified by the contract itself. This page names each responsibility explicitly."
      />

      <section className="border-b border-hairline bg-paper">
        <div className="mx-auto max-w-[1400px] px-6 py-20 md:px-10 md:py-28">
          <div className="grid gap-px bg-hairline md:grid-cols-2">
            {sections.map((s) => (
              <div key={s.t} className="bg-paper p-6 md:p-8">
                <h2 className="font-serif text-2xl text-ink md:text-3xl">{s.t}</h2>
                <p className="mt-3 text-sm text-muted-ink md:text-base">{s.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-hairline bg-stone">
        <div className="mx-auto max-w-[1400px] px-6 py-20 md:px-10 md:py-28">
          <div className="mb-8 flex items-baseline justify-between">
            <h2 className="font-serif text-3xl text-ink md:text-4xl">Verified resources</h2>
          </div>
          <p className="mb-8 max-w-2xl text-sm leading-relaxed text-muted-ink">
            Review the deployed contract, official product registry, and source code used by Hedgix.
            Transaction hashes are shown only after specific records are verified.
          </p>
          <dl className="grid grid-cols-1 gap-px bg-hairline md:grid-cols-2 lg:grid-cols-3">
            {verifiedResources.map((p) => (
              <div key={p.k} className="bg-paper p-6">
                <dt className="text-[10px] uppercase tracking-[0.22em] text-muted-ink">{p.k}</dt>
                <dd className="mt-3 break-words font-mono text-sm text-ink">{p.v}</dd>
                <a
                  href={p.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex text-sm text-violet underline"
                >
                  Open resource
                </a>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </AppLayout>
  );
}
