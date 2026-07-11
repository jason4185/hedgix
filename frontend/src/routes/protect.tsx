import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/hedgix/AppLayout";
import {
  DURATIONS,
  PRICE_DROP_ASSETS,
  depegTerms,
  priceDropTerms,
  type Duration,
} from "@/lib/hedgix-data";

export const Route = createFileRoute("/protect")({
  head: () => ({
    meta: [
      { title: "Get Protection — Hedgix" },
      {
        name: "description",
        content:
          "Configure a Hedgix protection: choose product, asset, event level, and duration. Terms are verified on-chain.",
      },
    ],
  }),
  component: ProtectPage,
});

type Product = "Price Drop Protection" | "Depeg Protection";

function ProtectPage() {
  const [product, setProduct] = useState<Product>("Price Drop Protection");
  const [asset, setAsset] = useState<string>("BTCUSDT");
  const [level, setLevel] = useState<string>("Protected Drop");
  const [duration, setDuration] = useState<Duration>(7);

  const isDepeg = product === "Depeg Protection";
  const levels = isDepeg ? depegTerms : priceDropTerms;

  const currentLevel = useMemo(
    () => levels.find((l) => l.level === level) ?? levels[0],
    [levels, level],
  );

  const settlementSymbol = isDepeg ? "USDCUSDT" : asset;

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Get Protection"
        title={
          <>
            Configure your <span className="italic">protection</span>.
          </>
        }
        lede="This is a mock configuration screen. No transaction will be sent. All values shown come from the local registry."
      />

      <section className="bg-paper">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-6 py-20 md:px-10 md:py-28 lg:grid-cols-12">
          <form
            className="lg:col-span-7"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <Field label="Protection type">
              <div className="grid grid-cols-2 gap-2">
                {(["Price Drop Protection", "Depeg Protection"] as Product[]).map((p) => (
                  <ToggleButton
                    key={p}
                    active={product === p}
                    onClick={() => {
                      setProduct(p);
                      if (p === "Depeg Protection") {
                        setAsset("USDC");
                        setLevel("Soft Depeg");
                      } else {
                        setAsset("BTCUSDT");
                        setLevel("Protected Drop");
                      }
                    }}
                  >
                    {p}
                  </ToggleButton>
                ))}
              </div>
            </Field>

            <Field label="Asset">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {isDepeg ? (
                  <ToggleButton active onClick={() => setAsset("USDC")}>
                    USDC
                  </ToggleButton>
                ) : (
                  PRICE_DROP_ASSETS.map((a) => (
                    <ToggleButton key={a} active={asset === a} onClick={() => setAsset(a)}>
                      {a}
                    </ToggleButton>
                  ))
                )}
              </div>
            </Field>

            <Field label="Event level">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                {levels.map((l) => (
                  <ToggleButton
                    key={l.level}
                    active={level === l.level}
                    onClick={() => setLevel(l.level)}
                  >
                    {l.level}
                  </ToggleButton>
                ))}
              </div>
            </Field>

            <Field label="Coverage duration">
              <div className="grid grid-cols-3 gap-2">
                {DURATIONS.map((d) => (
                  <ToggleButton key={d} active={duration === d} onClick={() => setDuration(d)}>
                    {d} days
                  </ToggleButton>
                ))}
              </div>
            </Field>

            <div className="mt-10 flex flex-wrap gap-3">
              <button
                type="button"
                className="border border-ink/30 px-5 py-3 text-sm font-medium text-ink hover:bg-ink/5"
              >
                Connect Wallet
              </button>
              <button
                type="submit"
                className="bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-ink/90"
                disabled
              >
                Purchase Protection (mock)
              </button>
            </div>
            <p className="mt-3 text-xs text-muted-ink">
              This flow is not yet connected to the GenLayer contract. Purchase is disabled in the
              MVP frontend.
            </p>
          </form>

          <aside className="lg:col-span-5">
            <div className="border border-hairline bg-paper">
              <div className="border-b border-hairline p-6 md:p-8">
                <div className="text-[10px] uppercase tracking-[0.22em] text-muted-ink">
                  Purchase summary
                </div>
                <h3 className="mt-3 font-serif text-3xl text-ink">{asset}</h3>
                <p className="mt-1 text-sm text-muted-ink">
                  {product} · {level}
                </p>
              </div>
              <dl className="p-6 md:p-8">
                <Row k="Trigger">
                  {"triggerPct" in currentLevel
                    ? `${currentLevel.triggerPct}% below reference`
                    : `≤ ${currentLevel.threshold} on USDCUSDT`}
                </Row>
                <Row k="Duration">{duration} days</Row>
                <Row k="Settlement symbol">{settlementSymbol}</Row>
                <Row k="Coverage timing">Starts next UTC day</Row>
                <Row k="Premium">{currentLevel.premium}</Row>
                <Row k="Potential payout">{currentLevel.payout}</Row>
                <Row k="Registry version">v1</Row>
              </dl>
              <div className="border-t border-hairline p-6 text-xs leading-relaxed text-muted-ink md:p-8">
                Product terms are verified on-chain against the Hedgix registry. Reference and
                trigger prices are fetched from Binance and stored in the policy record at purchase.
              </div>
            </div>
          </aside>
        </div>
      </section>
    </AppLayout>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-8 first:mt-0">
      <div className="mb-3 text-[10px] uppercase tracking-[0.22em] text-muted-ink">{label}</div>
      {children}
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border px-4 py-3 text-sm transition-colors ${
        active
          ? "border-ink bg-ink text-paper"
          : "border-hairline text-ink hover:border-ink/60 hover:bg-ink/5"
      }`}
    >
      {children}
    </button>
  );
}

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between border-b border-hairline py-3 text-sm last:border-b-0">
      <span className="text-muted-ink">{k}</span>
      <span className="tabular-nums text-ink">{children}</span>
    </div>
  );
}
