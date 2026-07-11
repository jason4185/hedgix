import { useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/hedgix/AppLayout";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Hedgix" },
      {
        name: "description",
        content: "Owner-only administrative controls for the Hedgix pool and registry.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const stats = [
  { k: "Pool balance", v: "7 GEN" },
  { k: "Reserved liability", v: "4 GEN" },
  { k: "Available to withdraw", v: "3 GEN" },
  { k: "Total premiums collected", v: "2 GEN" },
  { k: "Total payouts paid", v: "0 GEN" },
  { k: "Active protections", v: "2" },
  { k: "Registry version", v: "v1" },
  { k: "Contract status", v: "Active" },
];

function AdminPage() {
  const [isOwner] = useState(true); // mock: pretend the connected wallet is owner
  const [paused, setPaused] = useState(false);

  if (!isOwner) {
    return (
      <AppLayout>
        <PageHeader
          eyebrow="Admin"
          title="Owner only"
          lede="This page is only visible to the contract owner."
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Admin · Owner only"
        title={
          <>
            Pool <span className="italic">administration</span>.
          </>
        }
        lede="This is a mock owner-only console. No control on this page performs a real blockchain action."
      />

      <section className="border-b border-hairline bg-paper">
        <div className="mx-auto max-w-[1400px] px-6 py-16 md:px-10 md:py-20">
          <div className="grid grid-cols-2 gap-px border border-hairline bg-hairline md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.k} className="bg-paper p-5 md:p-6">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-ink">{s.k}</div>
                <div className="mt-3 font-serif text-3xl leading-none tracking-tight text-ink md:text-4xl">
                  {s.v}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <Card title="Pool funds">
              <label className="block text-xs uppercase tracking-widest text-muted-ink">
                Add funds (GEN)
              </label>
              <input
                type="number"
                defaultValue="1"
                className="mt-2 w-full border border-hairline bg-paper px-3 py-2 text-sm"
              />
              <button
                className="mt-3 w-full bg-ink px-3 py-2 text-sm text-paper hover:bg-ink/90"
                type="button"
              >
                Add pool funds (mock)
              </button>

              <label className="mt-6 block text-xs uppercase tracking-widest text-muted-ink">
                Withdraw (max 3 GEN)
              </label>
              <input
                type="number"
                defaultValue="1"
                className="mt-2 w-full border border-hairline bg-paper px-3 py-2 text-sm"
              />
              <button
                className="mt-3 w-full border border-ink/30 px-3 py-2 text-sm hover:bg-ink/5"
                type="button"
              >
                Withdraw available (mock)
              </button>
            </Card>

            <Card title="Operator & owner">
              <label className="block text-xs uppercase tracking-widest text-muted-ink">
                Settlement operator
              </label>
              <input
                defaultValue="0x…settlement-operator"
                className="mt-2 w-full border border-hairline bg-paper px-3 py-2 font-mono text-sm"
              />
              <button
                className="mt-3 w-full border border-ink/30 px-3 py-2 text-sm hover:bg-ink/5"
                type="button"
              >
                Set settlement operator (mock)
              </button>

              <label className="mt-6 block text-xs uppercase tracking-widest text-muted-ink">
                Owner address
              </label>
              <input
                defaultValue="0x…owner-placeholder"
                readOnly
                className="mt-2 w-full border border-hairline bg-stone px-3 py-2 font-mono text-sm text-muted-ink"
              />
            </Card>

            <Card title="Contract state">
              <div className="text-sm text-muted-ink">
                Current:{" "}
                <span className={paused ? "text-danger" : "text-success"}>
                  {paused ? "Paused" : "Active"}
                </span>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setPaused(true)}
                  disabled={paused}
                  className="flex-1 border border-ink/30 px-3 py-2 text-sm hover:bg-ink/5 disabled:opacity-50"
                >
                  Pause (mock)
                </button>
                <button
                  onClick={() => setPaused(false)}
                  disabled={!paused}
                  className="flex-1 bg-ink px-3 py-2 text-sm text-paper hover:bg-ink/90 disabled:opacity-50"
                >
                  Unpause (mock)
                </button>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </AppLayout>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border border-hairline bg-paper p-6">
      <h2 className="mb-4 font-serif text-2xl text-ink">{title}</h2>
      {children}
    </div>
  );
}
