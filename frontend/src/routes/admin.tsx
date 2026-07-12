import { useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { isAddress, type Address } from "viem";
import { AppLayout, PageHeader } from "@/components/hedgix/AppLayout";
import { ContractErrorMessage } from "@/components/hedgix/Feedback";
import { TransactionDialog } from "@/components/hedgix/TransactionDialog";
import { runtimeEnv } from "@/config/env";
import { useAdminReads, usePolicySettlement } from "@/hooks/useHedgixReads";
import { useHedgixWrite } from "@/hooks/useHedgixWrite";
import { decimalGenToWei, weiToGenText, wholeGenToContractArg } from "@/lib/genlayer/formatters";
import { isOwner, isSettlementOperator } from "@/lib/genlayer/roles";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Hedgix" },
      {
        name: "description",
        content: "Owner, pool, and settlement-operator controls for the Hedgix contract.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const writer = useHedgixWrite();
  const admin = useAdminReads(writer.wallet.address);
  const [poolAmount, setPoolAmount] = useState("1");
  const [withdrawAmount, setWithdrawAmount] = useState("1");
  const [operator, setOperator] = useState("");
  const owner = admin.owner.data;
  const settlementOperator = admin.operator.data;
  const canUseOwnerControls = isOwner(writer.wallet.address, owner);
  const canUseSettlementControls =
    canUseOwnerControls || isSettlementOperator(writer.wallet.address, settlementOperator);
  const error =
    writer.addFunds.error ||
    writer.withdraw.error ||
    writer.setOperator.error ||
    writer.pause.error ||
    writer.unpause.error ||
    writer.settle.error;

  async function addFunds() {
    await writer.addFunds.mutateAsync(decimalGenToWei(poolAmount)).catch(() => undefined);
  }

  async function withdrawFunds() {
    await writer.withdraw.mutateAsync(wholeGenToContractArg(withdrawAmount)).catch(() => undefined);
  }

  async function changeOperator() {
    if (!isAddress(operator)) return;
    await writer.setOperator.mutateAsync(operator).catch(() => undefined);
  }

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Admin"
        title={
          <>
            Pool and <span className="italic">settlement</span> operations.
          </>
        }
        lede="Owner controls and settlement-operator actions are separated from policyholder actions. The contract remains the authority for permissions."
      />
      <section className="border-b border-hairline bg-paper">
        <div className="mx-auto max-w-[1400px] px-6 py-16 md:px-10 md:py-20">
          {!runtimeEnv.contractConfigured && (
            <div className="mb-8 border border-danger/30 bg-danger/10 p-5 text-sm text-danger">
              {runtimeEnv.contractError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-px border border-hairline bg-hairline md:grid-cols-4">
            <Stat k="Pool balance" v={weiToGenText(admin.pool.data?.pool_balance)} />
            <Stat k="Reserved liability" v={weiToGenText(admin.pool.data?.reserved_liability)} />
            <Stat
              k="Withdrawable balance"
              v={weiToGenText(admin.pool.data?.available_to_withdraw)}
            />
            <Stat k="Total premiums" v={weiToGenText(admin.pool.data?.total_premiums_collected)} />
            <Stat k="Total payouts" v={weiToGenText(admin.pool.data?.total_payouts_paid)} />
            <Stat k="Active protections" v={admin.summary.data?.active_protection_count ?? "--"} />
            <Stat k="Owner" v={owner ?? "not loaded"} />
            <Stat k="Paused" v={String(admin.paused.data ?? "--")} />
          </div>
          {error ? <ContractErrorMessage error={error} className="mt-8" /> : null}
          <div className="mt-8 border border-hairline bg-stone p-5 text-sm leading-relaxed text-muted-ink">
            Connected wallet: {writer.wallet.address ?? "not connected"}. Owner controls require the
            contract owner. Settlement controls require owner or settlement operator.
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <Card title="Owner pool actions">
              <Label>Add pool funds (GEN)</Label>
              <input
                value={poolAmount}
                onChange={(event) => setPoolAmount(event.target.value)}
                type="number"
                min="0"
                step="0.000000000000000001"
                className="mt-2 w-full border border-hairline bg-paper px-3 py-2 text-sm"
              />
              <button
                className="mt-3 w-full bg-ink px-3 py-2 text-sm text-paper disabled:opacity-50"
                type="button"
                disabled={
                  !canUseOwnerControls || writer.wallet.isWrongNetwork || writer.addFunds.isPending
                }
                onClick={() => void addFunds()}
              >
                Add pool funds
              </button>
              <Label className="mt-6">Withdraw available funds (whole GEN)</Label>
              <input
                value={withdrawAmount}
                onChange={(event) => setWithdrawAmount(event.target.value)}
                type="number"
                min="1"
                step="1"
                className="mt-2 w-full border border-hairline bg-paper px-3 py-2 text-sm"
              />
              <button
                className="mt-3 w-full border border-ink/30 px-3 py-2 text-sm disabled:opacity-50"
                type="button"
                disabled={
                  !canUseOwnerControls || writer.wallet.isWrongNetwork || writer.withdraw.isPending
                }
                onClick={() => void withdrawFunds()}
              >
                Withdraw available funds
              </button>
              <p className="mt-3 text-xs leading-relaxed text-muted-ink">
                Withdrawals are whole GEN contract arguments and are limited to pool balance minus
                reserved liability.
              </p>
            </Card>

            <Card title="Owner contract controls">
              <Label>Settlement operator</Label>
              <input
                value={operator}
                onChange={(event) => setOperator(event.target.value)}
                placeholder={settlementOperator ?? "0x..."}
                className="mt-2 w-full border border-hairline bg-paper px-3 py-2 font-mono text-sm"
              />
              <button
                className="mt-3 w-full border border-ink/30 px-3 py-2 text-sm disabled:opacity-50"
                type="button"
                disabled={
                  !canUseOwnerControls || !isAddress(operator) || writer.setOperator.isPending
                }
                onClick={() => void changeOperator()}
              >
                Set settlement operator
              </button>
              <div className="mt-6 grid grid-cols-2 gap-2">
                <button
                  className="border border-ink/30 px-3 py-2 text-sm disabled:opacity-50"
                  type="button"
                  disabled={!canUseOwnerControls || writer.pause.isPending}
                  onClick={() => void writer.pause.mutateAsync().catch(() => undefined)}
                >
                  Pause contract
                </button>
                <button
                  className="bg-ink px-3 py-2 text-sm text-paper disabled:opacity-50"
                  type="button"
                  disabled={!canUseOwnerControls || writer.unpause.isPending}
                  onClick={() => void writer.unpause.mutateAsync().catch(() => undefined)}
                >
                  Resume contract
                </button>
              </div>
            </Card>

            <Card title="Settlement operator actions">
              <p className="text-sm leading-relaxed text-muted-ink">
                Operators load active policy IDs, call readiness, then settle only the exact
                expected settlement date returned by the contract.
              </p>
              <div className="mt-5 space-y-3">
                {(admin.active.data?.ids ?? []).map((id) => (
                  <ActivePolicyRow
                    key={id}
                    id={id}
                    allowed={canUseSettlementControls}
                    account={writer.wallet.address}
                    settling={writer.settle.isPending}
                    onSettle={(protectionId, settlementDate) =>
                      writer.settle
                        .mutateAsync({ protectionId, settlementDate })
                        .catch(() => undefined)
                    }
                  />
                ))}
                {admin.active.data?.ids.length === 0 && (
                  <p className="text-sm text-muted-ink">No active policies in this page.</p>
                )}
              </div>
            </Card>

            <Card title="Role status">
              <Row k="Current owner">{owner ?? "not loaded"}</Row>
              <Row k="Settlement operator">{settlementOperator ?? "not loaded"}</Row>
              <Row k="Connected wallet">{writer.wallet.address ?? "not connected"}</Row>
              <Row k="Owner access">{canUseOwnerControls ? "yes" : "no"}</Row>
              <Row k="Settlement access">{canUseSettlementControls ? "yes" : "no"}</Row>
            </Card>
          </div>
        </div>
      </section>
      <TransactionDialog
        open={writer.transaction.open}
        actionTitle={writer.transaction.action}
        progress={writer.transaction.progress}
        error={writer.transaction.error}
        onOpenChange={writer.transaction.setOpen}
        onContinueChecking={writer.transaction.continueCheckingStatus}
      />
    </AppLayout>
  );
}

function ActivePolicyRow({
  id,
  allowed,
  account,
  settling,
  onSettle,
}: {
  id: string;
  allowed: boolean;
  account?: Address;
  settling: boolean;
  onSettle: (protectionId: string, settlementDate: string) => void;
}) {
  const settlement = usePolicySettlement(id, account);
  const ready = settlement.readiness.data;
  const expectedDate = ready?.expected_settlement_date ?? settlement.expectedDate.data ?? "";

  async function settle() {
    if (!ready?.ready || !expectedDate) return;
    onSettle(id, expectedDate);
  }

  return (
    <div className="border border-hairline p-4 text-sm">
      <Row k={`Protection reference ${id}`}>{expectedDate || "no expected date"}</Row>
      <Row k="Readiness">{ready?.ready ? "ready" : (ready?.reason ?? "loading")}</Row>
      <button
        className="mt-3 w-full border border-ink/30 px-3 py-2 text-sm disabled:opacity-50"
        type="button"
        disabled={!allowed || !ready?.ready || settling}
        onClick={() => void settle()}
      >
        Settle exact expected date
      </button>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-paper p-5 md:p-6">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-ink">{k}</div>
      <div className="mt-3 break-words font-serif text-2xl leading-none tracking-tight text-ink md:text-3xl">
        {v}
      </div>
    </div>
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

function Label({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <label className={`block text-xs uppercase tracking-widest text-muted-ink ${className}`}>
      {children}
    </label>
  );
}

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-hairline py-2 last:border-b-0">
      <span className="text-muted-ink">{k}</span>
      <span className="max-w-[60%] break-words text-right font-mono text-xs text-ink">
        {children}
      </span>
    </div>
  );
}
