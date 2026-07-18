import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { AppLayout, PageHeader } from "@/components/hedgix/AppLayout";
import { ContractErrorMessage, TechnicalDetails } from "@/components/hedgix/Feedback";
import { TransactionDialog } from "@/components/hedgix/TransactionDialog";
import { explorerTransactionUrl } from "@/config/chains";
import { runtimeEnv } from "@/config/env";
import { useHedgixWrite } from "@/hooks/useHedgixWrite";
import { useRegistry } from "@/hooks/useRegistry";
import { genAmountToWei } from "@/lib/genlayer/formatters";
import {
  expectedCoverageDates,
  formatUsdPrice,
  productTypeLabel,
  referencePriceNotice,
  triggerDescriptionFromLevel,
  weiToGen,
  type ContractPolicy,
  type Duration,
  type ProductType,
  type RegistryAsset,
  type RegistryLevel,
} from "@/lib/hedgix-data";

export const Route = createFileRoute("/protect")({
  validateSearch: (search: Record<string, unknown>) => ({
    type: typeof search.type === "string" ? search.type : undefined,
    asset: typeof search.asset === "string" ? search.asset : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Get Protection — Hedgix" },
      {
        name: "description",
        content:
          "Configure Hedgix protection using live registry terms. The contract stores the Locked reference price during purchase.",
      },
    ],
  }),
  component: ProtectPage,
});

function ProtectPage() {
  const search = Route.useSearch();
  const registryQuery = useRegistry();
  const writer = useHedgixWrite();
  const appliedSearchRef = useRef(false);
  const initialSelection = getInitialSelection(search.type, search.asset);
  const [productType, setProductType] = useState<ProductType>(initialSelection.productType);
  const [asset, setAsset] = useState(initialSelection.asset);
  const [level, setLevel] = useState(initialSelection.level);
  const [duration, setDuration] = useState<Duration>(7);
  const [success, setSuccess] = useState<{
    hash: `0x${string}`;
    protectionId: string | null;
    policy: ContractPolicy | null;
  } | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const displayRegistry = registryQuery.data;
  const products = useMemo(() => displayRegistry?.protection_products ?? [], [displayRegistry]);
  const product = products.find((item) => item.protection_type === productType) ?? products[0];
  const assets = (product?.supported_assets ?? []) as RegistryAsset[];
  const levels = (product?.event_levels ?? []) as RegistryLevel[];
  const durations = useMemo(
    () => displayRegistry?.supported_durations.map((item) => item.duration_days as Duration) ?? [],
    [displayRegistry],
  );
  const selectedAsset =
    assets.find((item) => (item.asset ?? item.protected_asset) === asset) ?? assets[0] ?? null;
  const selectedLevel = levels.find((item) => item.name === level) ?? levels[0] ?? null;
  const settlementSymbol =
    selectedAsset?.binance_settlement_symbol ?? selectedAsset?.settlement_symbol ?? "";
  const coverage = useMemo(() => expectedCoverageDates(duration), [duration]);
  const premiumWei = useMemo(
    () => (selectedLevel ? genAmountToWei(selectedLevel.premium.amount) : 0n),
    [selectedLevel],
  );
  const reviewItems = [
    { label: "Protected asset", value: asset },
    { label: "Settlement market", value: settlementSymbol },
    { label: "Event level", value: level },
    { label: "Duration", value: `${duration} days` },
    {
      label: "Trigger",
      value: selectedLevel ? triggerDescriptionFromLevel(productType, selectedLevel) : "Not loaded",
    },
    { label: "Premium", value: weiToGen(String(premiumWei)) },
    { label: "Eligible payout", value: `${selectedLevel?.payout.amount ?? "--"} GEN` },
    { label: "Locked reference price", value: "Determined during purchase" },
  ];
  const purchaseAction = getPurchaseAction({
    registryLoading: registryQuery.isLoading || registryQuery.isFetching,
    registryLoaded: Boolean(displayRegistry),
    registryError: registryQuery.error,
    contractConfigured: runtimeEnv.contractConfigured,
    connected: writer.wallet.isConnected,
    wrongNetwork: writer.wallet.isWrongNetwork,
    pending: writer.purchase.isPending || writer.transaction.blocksResubmission,
    selectedAsset: Boolean(selectedAsset),
    selectedLevel: Boolean(selectedLevel),
    duration: Boolean(duration),
  });

  useEffect(() => {
    if (!product) return;
    const nextProduct =
      products.find((item) => item.protection_type === productType) ?? products[0];
    const nextAsset = nextProduct.supported_assets[0];
    const nextLevel = nextProduct.event_levels[0];
    if (!nextAsset || !nextLevel) return;
    if (
      !nextProduct.supported_assets.some((item) => (item.asset ?? item.protected_asset) === asset)
    ) {
      setAsset(String(nextAsset.asset ?? nextAsset.protected_asset));
    }
    if (!nextProduct.event_levels.some((item) => item.name === level)) {
      setLevel(String(nextLevel.name));
    }
    if (!durations.includes(duration)) {
      setDuration((durations[0] ?? 7) as Duration);
    }
  }, [asset, duration, durations, level, product, productType, products]);

  useEffect(() => {
    if (appliedSearchRef.current || products.length === 0) return;
    const requestedType = search.type as ProductType | undefined;
    const requestedAsset = search.asset;
    const matchingProduct = products.find((item) => item.protection_type === requestedType);
    if (!matchingProduct) {
      appliedSearchRef.current = true;
      return;
    }
    setProductType(matchingProduct.protection_type);
    const matchingAsset = matchingProduct.supported_assets.find(
      (item) => String(item.asset ?? item.protected_asset) === requestedAsset,
    );
    if (matchingAsset) {
      setAsset(String(matchingAsset.asset ?? matchingAsset.protected_asset));
    }
    const firstLevel = matchingProduct.event_levels[0];
    if (firstLevel) setLevel(String(firstLevel.name));
    appliedSearchRef.current = true;
  }, [products, search.asset, search.type]);

  function selectProduct(next: ProductType) {
    setProductType(next);
    setSuccess(null);
  }

  async function submitPurchase(event: FormEvent) {
    event.preventDefault();
    setSuccess(null);
    if (purchaseAction.kind === "submit") setReviewOpen(true);
  }

  function requestReview() {
    setSuccess(null);
    if (purchaseAction.kind === "submit") setReviewOpen(true);
  }

  async function confirmPurchase() {
    setReviewOpen(false);
    try {
      if (!selectedAsset || !selectedLevel) throw new Error("INVALID_REGISTRY_RESPONSE");
      const result = await writer.purchase.mutateAsync({
        protectedAsset: String(selectedAsset.asset ?? selectedAsset.protected_asset),
        protectionType: productType,
        eventLevel: String(selectedLevel.name),
        durationDays: duration,
        premiumWei,
      });
      if (result.stateConfirmed) {
        setSuccess({
          hash: result.hash,
          protectionId: result.protectionId,
          policy: result.policy,
        });
      }
    } catch {
      // The mutation state renders the mapped contract or wallet error.
    }
  }

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Get Protection"
        title={
          <>
            Configure your <span className="italic">protection</span>.
          </>
        }
        lede="Choose protection terms from the official registry. Your selected terms are independently verified when you purchase protection."
      />

      <section className="bg-paper">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-6 py-20 md:px-10 md:py-28 lg:grid-cols-12">
          <form className="lg:col-span-7" onSubmit={submitPurchase}>
            <StatusNotice />
            <RegistryTermsNotice query={registryQuery} />
            <Field label="1. Choose protection category">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(["price_drop_protection", "depeg_protection"] as ProductType[]).map((type) => (
                  <ToggleButton
                    key={type}
                    active={productType === type}
                    onClick={() => selectProduct(type)}
                  >
                    {productTypeLabel(type)}
                  </ToggleButton>
                ))}
              </div>
            </Field>
            <Field label="2. Choose protected asset or market">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
                {assets.map((item) => {
                  const value = String(item.asset ?? item.protected_asset);
                  return (
                    <ToggleButton
                      key={value}
                      active={asset === value}
                      onClick={() => setAsset(value)}
                    >
                      {value}
                    </ToggleButton>
                  );
                })}
              </div>
            </Field>
            <Field label="3. Choose event level">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                {levels.map((item) => (
                  <ToggleButton
                    key={item.name}
                    active={level === item.name}
                    onClick={() => setLevel(item.name)}
                  >
                    {item.name}
                  </ToggleButton>
                ))}
              </div>
            </Field>
            <Field label="4. Choose coverage duration">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {durations.map((days) => (
                  <ToggleButton
                    key={days}
                    active={duration === days}
                    onClick={() => setDuration(days)}
                  >
                    {days} days
                  </ToggleButton>
                ))}
              </div>
            </Field>
            <div className="mt-8 border border-hairline bg-stone p-5">
              <h3 className="text-xs uppercase tracking-[0.22em] text-ink">
                Locked reference price
              </h3>
              <p className="mt-2 text-sm font-medium text-ink">Determined during purchase</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-ink">{referencePriceNotice}</p>
            </div>
            {writer.purchase.error && !writer.transaction.open && (
              <ContractErrorMessage error={writer.purchase.error} className="mt-6" />
            )}
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <div className="mt-10">
                  <button
                    type="button"
                    className="w-full bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    disabled={purchaseAction.disabled}
                    onClick={() => {
                      if (purchaseAction.kind === "connect") openConnectModal?.();
                      else if (purchaseAction.kind === "switch")
                        void writer.wallet.switchToBradbury();
                      else if (purchaseAction.kind === "retry") void registryQuery.refetch();
                      else if (purchaseAction.kind === "submit") requestReview();
                    }}
                  >
                    {purchaseAction.label}
                  </button>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-ink">
                    {purchaseAction.message}
                  </p>
                </div>
              )}
            </ConnectButton.Custom>
            <p className="mt-3 text-xs leading-relaxed text-muted-ink">
              Your wallet will be asked to pay the premium and applicable network fees.
            </p>
          </form>

          <aside className="lg:col-span-5">
            <div className="border border-hairline bg-paper lg:sticky lg:top-8">
              <div className="border-b border-hairline p-6 md:p-8">
                <div className="text-[10px] uppercase tracking-[0.22em] text-muted-ink">
                  5. Review terms
                </div>
                <h3 className="mt-3 font-serif text-3xl text-ink">{asset}</h3>
                <p className="mt-1 text-sm text-muted-ink">
                  {productTypeLabel(productType)} · {level}
                </p>
              </div>
              <dl className="p-6 md:p-8">
                <Row k="Binance settlement market">{settlementSymbol}</Row>
                <Row k="Trigger threshold">
                  {selectedLevel && productType === "depeg_protection"
                    ? formatUsdPrice(selectedLevel.trigger_rule.threshold)
                    : selectedLevel
                      ? `${selectedLevel.trigger_rule.threshold_percent}% drop`
                      : "Not loaded"}
                </Row>
                <Row k="Trigger rule">
                  {selectedLevel
                    ? triggerDescriptionFromLevel(productType, selectedLevel)
                    : "Official terms are loading"}
                </Row>
                <Row k="Premium">{weiToGen(String(premiumWei))}</Row>
                <Row k="Payout">{selectedLevel?.payout.amount ?? "--"} GEN</Row>
                <Row k="Coverage duration">{duration} days</Row>
                <Row k="Expected coverage start">{coverage.start}</Row>
                <Row k="Expected coverage end">{coverage.end}</Row>
                <Row k="Registry version">
                  {displayRegistry?.metadata.registry_version ?? "Loading"}
                </Row>
                <Row k="Market-data source">Binance</Row>
              </dl>
              <div className="border-t border-hairline p-6 text-xs leading-relaxed text-muted-ink md:p-8">
                Your selected terms are independently verified when you purchase protection.
              </div>
            </div>
            {success && <Receipt result={success} />}
          </aside>
        </div>
      </section>
      <TransactionDialog
        open={reviewOpen || writer.transaction.open}
        actionTitle={reviewOpen ? "Review protection" : writer.transaction.action}
        actionDescription={
          reviewOpen
            ? "Confirm these terms before opening your wallet. Your protection is confirmed only after GenLayer validators successfully complete the transaction."
            : undefined
        }
        reviewItems={reviewOpen ? reviewItems : []}
        confirmLabel="Confirm purchase"
        progress={reviewOpen ? { stage: "review" } : writer.transaction.progress}
        error={reviewOpen ? null : writer.transaction.error}
        onConfirm={() => void confirmPurchase()}
        onOpenChange={(open) => {
          if (reviewOpen) setReviewOpen(open);
          else writer.transaction.setOpen(open);
        }}
        onContinueChecking={writer.transaction.continueCheckingStatus}
      />
    </AppLayout>
  );
}

type PurchaseAction = {
  kind: "connect" | "switch" | "retry" | "submit" | "disabled";
  label: string;
  message: string;
  disabled: boolean;
};

function getInitialSelection(
  requestedType: string | undefined,
  requestedAsset: string | undefined,
): { productType: ProductType; asset: string; level: string } {
  const productType =
    requestedType === "depeg_protection" || requestedType === "price_drop_protection"
      ? requestedType
      : "price_drop_protection";
  return {
    productType,
    asset: typeof requestedAsset === "string" ? requestedAsset : "",
    level: "",
  };
}

function getPurchaseAction({
  registryLoading,
  registryLoaded,
  registryError,
  contractConfigured,
  connected,
  wrongNetwork,
  pending,
  selectedAsset,
  selectedLevel,
  duration,
}: {
  registryLoading: boolean;
  registryLoaded: boolean;
  registryError: unknown;
  contractConfigured: boolean;
  connected: boolean;
  wrongNetwork: boolean;
  pending: boolean;
  selectedAsset: boolean;
  selectedLevel: boolean;
  duration: boolean;
}): PurchaseAction {
  if (!contractConfigured) {
    return {
      kind: "disabled",
      label: "Contract unavailable",
      message: "Hedgix could not connect to the deployed contract.",
      disabled: true,
    };
  }
  if (!connected) {
    return {
      kind: "connect",
      label: "Connect wallet to continue",
      message: "Connect a supported wallet to review and purchase this protection.",
      disabled: false,
    };
  }
  if (wrongNetwork) {
    return {
      kind: "switch",
      label: "Switch to GenLayer Bradbury",
      message: "Hedgix requires GenLayer Bradbury to submit contract transactions.",
      disabled: false,
    };
  }
  if (registryLoading && !registryLoaded) {
    return {
      kind: "disabled",
      label: "Loading official terms",
      message: "Hedgix is retrieving and validating the official product terms.",
      disabled: true,
    };
  }
  if (registryError && !registryLoaded) {
    return {
      kind: "retry",
      label: "Retry official terms",
      message:
        "Hedgix could not verify official product terms. Existing protections remain accessible, but new purchases are temporarily unavailable.",
      disabled: false,
    };
  }
  if (!registryLoaded) {
    return {
      kind: "disabled",
      label: "Protection terms unavailable",
      message:
        "The official product terms could not be loaded. Existing protections remain accessible, but new purchases are temporarily unavailable.",
      disabled: true,
    };
  }
  if (!selectedAsset || !selectedLevel || !duration) {
    const missing = !selectedAsset
      ? "protected asset"
      : !selectedLevel
        ? "event level"
        : "coverage duration";
    return {
      kind: "disabled",
      label: "Complete protection details",
      message: `Select a supported ${missing} before reviewing this protection.`,
      disabled: true,
    };
  }
  if (pending) {
    return {
      kind: "disabled",
      label: "Checking latest state...",
      message:
        "The current transaction is accepted or still being checked. Do not submit it again.",
      disabled: true,
    };
  }
  return {
    kind: "submit",
    label: "Review protection",
    message: "Review the official product terms before opening your wallet.",
    disabled: false,
  };
}

function RegistryTermsNotice({ query }: { query: ReturnType<typeof useRegistry> }) {
  if (query.isLoading || query.isFetching) {
    return (
      <div className="mb-6 border border-hairline bg-stone p-5 text-sm">
        <div className="font-medium text-ink">Loading official protection terms</div>
        <p className="mt-2 leading-relaxed text-muted-ink">
          Hedgix is retrieving the official registry before enabling purchases.
        </p>
      </div>
    );
  }
  if (query.data) {
    return (
      <div className="mb-6 border border-success/30 bg-success/8 p-5 text-sm">
        <div className="font-medium text-ink">Official terms verified</div>
        <p className="mt-2 leading-relaxed text-muted-ink">
          Registry {query.data.metadata.registry_version} is loaded and validated for purchase
          review.
        </p>
      </div>
    );
  }
  if (query.error) {
    return (
      <div className="mb-6 border border-danger/30 bg-danger/10 p-5 text-sm" role="alert">
        <div className="font-medium text-ink">Unable to verify protection terms</div>
        <p className="mt-2 leading-relaxed text-muted-ink">
          Hedgix could not load the official product terms. Existing protections remain accessible,
          but new purchases are temporarily unavailable.
        </p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="mt-4 border border-ink/30 px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5"
        >
          Retry loading terms
        </button>
        <TechnicalDetails>
          {query.error instanceof Error ? query.error.message : String(query.error)}
        </TechnicalDetails>
      </div>
    );
  }
  return null;
}

function StatusNotice() {
  if (!runtimeEnv.contractConfigured) {
    return (
      <ContractErrorMessage
        mapped={{
          code: "CONTRACT_ADDRESS_NOT_CONFIGURED",
          title: "Contract address is missing",
          description: runtimeEnv.contractError,
          action: "Set VITE_HEDGIX_CONTRACT_ADDRESS and restart the app.",
          severity: "error",
          retryable: false,
          message: runtimeEnv.contractError,
          raw: runtimeEnv.contractError,
        }}
      />
    );
  }
  return null;
}

function Receipt({
  result,
}: {
  result: { hash: `0x${string}`; protectionId: string | null; policy: ContractPolicy | null };
}) {
  const policy = result.policy;
  return (
    <div className="mt-6 border border-success/30 bg-success/8 p-6 text-sm">
      <h3 className="font-serif text-2xl text-ink">Protection created</h3>
      <p className="mt-2 text-muted-ink">
        Your protection is active. The contract verified the product terms, fetched and stored the
        Locked reference price, and reserved the configured payout.
      </p>
      <dl className="mt-4 space-y-2">
        <Row k="Transaction hash">{result.hash}</Row>
        <Row k="GenLayer status">Accepted successful execution</Row>
        <Row k="Explorer">
          <a
            className="underline"
            href={explorerTransactionUrl(result.hash)}
            target="_blank"
            rel="noreferrer"
          >
            View transaction
          </a>
        </Row>
        <Row k="Protection ID">
          {result.protectionId ? (
            <Link to="/policy/$id" params={{ id: result.protectionId }} className="underline">
              {result.protectionId}
            </Link>
          ) : (
            "Refreshing dashboard"
          )}
        </Row>
        {policy && (
          <>
            <Row k="Status">{policy.status}</Row>
            <Row k="Protection reference">{policy.protection_id}</Row>
            <Row k="Protected asset">{policy.protected_asset}</Row>
            <Row k="Binance symbol">{policy.binance_settlement_symbol}</Row>
            <Row k="Locked reference price">{formatUsdPrice(policy.reference_price_display)}</Row>
            <Row k="Recorded">{policy.reference_price_datetime}</Row>
            <Row k="Source">Binance live ticker</Row>
            <Row k="Trigger price">{formatUsdPrice(policy.trigger_price_display)}</Row>
            <Row k="Coverage">
              {policy.coverage_start_date} to {policy.coverage_end_date}
            </Row>
            <Row k="Premium paid">{weiToGen(policy.premium_paid)}</Row>
            <Row k="Payout">{weiToGen(policy.payout_amount)}</Row>
            <Row k="Reserved payout">{weiToGen(policy.reserved_payout)}</Row>
          </>
        )}
      </dl>
      {!result.protectionId && (
        <p className="mt-4 text-xs text-muted-ink">
          The receipt did not expose a single new policy ID. Open the dashboard to refresh your
          wallet-scoped protections without guessing an ID.
        </p>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-8">
      <label className="mb-3 block text-xs uppercase tracking-[0.2em] text-muted-ink">
        {label}
      </label>
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
      className={`border px-3 py-3 text-sm transition-colors ${
        active ? "border-ink bg-ink text-paper" : "border-hairline text-ink hover:border-ink/50"
      }`}
    >
      {children}
    </button>
  );
}

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-5 border-b border-hairline py-3 last:border-b-0">
      <dt className="text-sm text-muted-ink">{k}</dt>
      <dd className="max-w-[55%] break-words text-right text-sm font-medium tabular-nums text-ink">
        {children}
      </dd>
    </div>
  );
}
