import { describe, expect, it } from "bun:test";
import { BRADBURY_CHAIN_ID, BRADBURY_RPC_URL } from "../src/config/chains";
import { WALLETCONNECT_PROJECT_ID, walletConnectorPolicy } from "../src/config/wagmi";
import { runtimeEnv } from "../src/config/env";
import { decimalGenToWei, weiToGenText } from "../src/lib/genlayer/formatters";
import { mapHedgixError } from "../src/lib/genlayer/errors";
import { parseContractJson, parsePolicy, validateRegistry } from "../src/lib/genlayer/parsing";
import {
  assertAcceptedExecution,
  findNewProtectionId,
  progressFromStatus,
  retryStateConfirmation,
} from "../src/lib/genlayer/transactions";
import { extractTransactionHash } from "../src/lib/genlayer/writes";
import {
  exampleLegacyUsdcUsdtPolicy,
  exampleUsdtUsdPolicy,
  registry,
} from "../src/lib/hedgix-data";

async function source(path: string) {
  return Bun.file(new URL(path, import.meta.url)).text();
}

describe("Bradbury wallet and GenLayer integration", () => {
  it("configures the Bradbury chain and RPC exactly", () => {
    expect(BRADBURY_CHAIN_ID).toBe(4221);
    expect(BRADBURY_RPC_URL).toBe("https://rpc-bradbury.genlayer.com");
    expect(runtimeEnv.network).toBe("testnetBradbury");
  });

  it("documents the deployed Hedgix Bradbury contract address", async () => {
    const envExample = await source("../.env.example");
    expect(envExample).toContain(
      "VITE_HEDGIX_CONTRACT_ADDRESS=0x5cA80eB0744574aD2214291e89aA547168c28084",
    );
  });

  it("uses injected wallets only and does not configure WalletConnect", async () => {
    expect(walletConnectorPolicy.walletConnectEnabled).toBe(false);
    expect(walletConnectorPolicy.connectorKinds).toEqual(["injected"]);
    expect(WALLETCONNECT_PROJECT_ID).toBeUndefined();
    const wagmiSource = await source("../src/config/wagmi.ts");
    expect(wagmiSource).toContain("injected(");
    expect(wagmiSource).not.toContain("walletConnect(");
    expect(wagmiSource).not.toContain("projectId:");
  });

  it("wraps the app with the custom Wagmi and RainbowKit providers", async () => {
    const providerSource = await source("../src/providers/Web3Provider.tsx");
    expect(providerSource).toContain("WagmiProvider");
    expect(providerSource).toContain("RainbowKitProvider");
    expect(providerSource).toContain('modalSize="compact"');
  });

  it("uses GenLayerJS for Intelligent Contract reads, writes, and status receipts", async () => {
    const readsSource = await source("../src/lib/genlayer/reads.ts");
    const writesSource = await source("../src/lib/genlayer/writes.ts");
    const transactionSource = await source("../src/lib/genlayer/transactions.ts");
    const clientSource = await source("../src/lib/genlayer/client.ts");
    const writesSourceText = await source("../src/lib/genlayer/writes.ts");
    expect(readsSource).toContain("readContract");
    expect(writesSource).toContain("writeContract");
    expect(transactionSource).toContain("getTransaction");
    expect(clientSource).toContain("createHedgixWriteClient");
    expect(writesSourceText).not.toContain("connectBradburyWallet");
    expect(writesSourceText).not.toContain('client.connect("testnetBradbury")');
  });

  it("does not treat a transaction hash or accepted execution error as success", () => {
    expect(() => assertAcceptedExecution({ txExecutionResultName: "FINISHED_WITH_ERROR" })).toThrow(
      "FINISHED_WITH_ERROR",
    );
    expect(
      assertAcceptedExecution({ txExecutionResultName: "FINISHED_WITH_RETURN" })
        .txExecutionResultName,
    ).toBe("FINISHED_WITH_RETURN");
    expect(assertAcceptedExecution({ txExecutionResult: 1 }).txExecutionResult).toBe(1);
  });

  it("extracts GenLayer transaction hashes from supported SDK return shapes", () => {
    const hash = `0x${"a".repeat(64)}` as const;
    expect(extractTransactionHash(hash)).toBe(hash);
    expect(extractTransactionHash({ hash })).toBe(hash);
    expect(extractTransactionHash({ transactionHash: hash })).toBe(hash);
    expect(extractTransactionHash({ txId: hash })).toBe(hash);
    expect(() => extractTransactionHash({ ok: true })).toThrow("TRANSACTION_HASH_MISSING");
  });

  it("passes payable values as bigint wei and keeps withdraw arguments in whole GEN", () => {
    expect(decimalGenToWei("1")).toBe(1_000_000_000_000_000_000n);
    expect(weiToGenText(1_000_000_000_000_000_000n)).toBe("1 GEN");
  });

  it("recovers a new protection ID by receipt or safe before/after set difference only", () => {
    expect(findNewProtectionId(["1", "2"], ["1", "2", "3"])).toBe("3");
    expect(findNewProtectionId(["1"], ["1"])).toBeNull();
    expect(findNewProtectionId(["1"], ["1", "2", "3"])).toBeNull();
  });

  it("maps accepted GenLayer statuses without marking consensus as failed", () => {
    const hash = `0x${"b".repeat(64)}`;
    expect(progressFromStatus(hash, "PROPOSING").stage).toBe("consensus");
    expect(progressFromStatus(hash, "COMMITTING").stage).toBe("consensus");
    expect(progressFromStatus(hash, "REVEALING").stage).toBe("consensus");
    expect(progressFromStatus(hash, "ACCEPTED").stage).toBe("accepted");
    expect(progressFromStatus(hash, "READY_TO_FINALIZE").stage).toBe("accepted");
    expect(progressFromStatus(hash, "FINALIZED").stage).toBe("accepted");
    expect(progressFromStatus(hash, "CANCELED").stage).toBe("cancelled");
  });

  it("keeps accepted transactions syncing until delayed state confirmation appears", async () => {
    const reads = [{ status: "missing" }, { status: "ACTIVE", owner: "0xabc" }];
    const result = await retryStateConfirmation({
      backoffMs: [0, 0],
      read: async () => reads.shift() ?? { status: "missing" },
      isConfirmed: (value) => value.status === "ACTIVE" && value.owner === "0xabc",
    });
    expect(result.outcome).toBe("confirmed");
    expect(result.attempts).toBe(2);
  });

  it("returns an accepted-syncing warning result when state confirmation retries exhaust", async () => {
    const result = await retryStateConfirmation({
      backoffMs: [0, 0],
      read: async () => {
        throw new Error("RPC temporarily stale");
      },
      isConfirmed: () => false,
    });
    expect(result.outcome).toBe("pending");
    if (result.outcome === "pending") {
      expect(result.technicalDetails).toContain("STATE_CONFIRMATION_FAILED");
      expect(result.technicalDetails).toContain("RPC temporarily stale");
    }
  });

  it("parses contract JSON strings and escaped JSON strings safely", () => {
    const encoded = JSON.stringify(JSON.stringify(exampleUsdtUsdPolicy));
    expect(parsePolicy(JSON.stringify(exampleUsdtUsdPolicy)).ok).toBe(true);
    expect(parsePolicy(encoded).ok).toBe(true);
    expect(
      parseContractJson("not json", {
        safeParse: () => ({ success: false, error: { message: "bad" } }),
      } as never).ok,
    ).toBe(false);
  });

  it("validates the registry and maps depeg products to direct USD symbols", () => {
    const parsed = validateRegistry(registry);
    expect(parsed.ok).toBe(true);
    const depeg = registry.protection_products.find(
      (product) => product.protection_type === "depeg_protection",
    );
    expect(depeg?.supported_assets.map((asset) => asset.binance_settlement_symbol)).toEqual([
      "USDTUSD",
      "USDCUSD",
    ]);
  });

  it("preserves old stored symbols while new policy content can show USDTUSD", () => {
    expect(exampleLegacyUsdcUsdtPolicy.binance_settlement_symbol).toBe("USDCUSDT");
    expect(exampleUsdtUsdPolicy.binance_settlement_symbol).toBe("USDTUSD");
  });

  it("blocks writes when disconnected or on the wrong network in route source", async () => {
    const protectSource = await source("../src/routes/protect.tsx");
    expect(protectSource).toContain("connected: writer.wallet.isConnected");
    expect(protectSource).toContain("wrongNetwork: writer.wallet.isWrongNetwork");
  });

  it("keeps purchase disabled when the live registry is unavailable", async () => {
    const protectSource = await source("../src/routes/protect.tsx");
    expect(protectSource).toContain("registryLoaded: Boolean(displayRegistry)");
    expect(protectSource).toContain("Retry official terms");
    expect(protectSource).not.toContain("displayRegistry = registryQuery.data ??");
    expect(protectSource).not.toContain("fallbackRegistry");
  });

  it("loads the official registry through the same-origin registry endpoint", async () => {
    const hookSource = await source("../src/hooks/useRegistry.ts");
    const serverSource = await source("../src/server.ts");
    expect(hookSource).toContain('REGISTRY_PROXY_PATH = "/api/registry"');
    expect(hookSource).toContain("AbortController");
    expect(hookSource).toContain("validateRegistry");
    expect(serverSource).toContain('url.pathname === "/api/registry"');
    expect(serverSource).toContain("DEFAULT_REGISTRY_URL");
  });

  it("explains every protection review button state and opens the review dialog", async () => {
    const protectSource = await source("../src/routes/protect.tsx");
    expect(protectSource).toContain("Connect wallet to continue");
    expect(protectSource).toContain("Switch to GenLayer Bradbury");
    expect(protectSource).toContain("Protection terms unavailable");
    expect(protectSource).toContain("Contract unavailable");
    expect(protectSource).toContain("Complete protection details");
    expect(protectSource).toContain("openConnectModal");
    expect(protectSource).toContain("setReviewOpen(true)");
  });

  it("supports safe market preselection through protect query parameters", async () => {
    const protectSource = await source("../src/routes/protect.tsx");
    const marketsSource = await source("../src/routes/markets.tsx");
    expect(protectSource).toContain("validateSearch");
    expect(protectSource).toContain("matchingProduct");
    expect(marketsSource).toContain("search={{ type: market.type, asset: market.asset }}");
    expect(marketsSource).toContain("Get ${market.base} depeg protection");
  });

  it("keeps normal policy views free of scaled values and raw implementation labels", async () => {
    const policySource = await source("../src/routes/policy.$id.tsx");
    expect(policySource).toContain("Advanced details");
    expect(policySource).toContain("Show technical references");
    expect(policySource).toContain("policyDisplayName");
    expect(policySource).not.toContain("Scaled value");
    expect(policySource).not.toContain("Trigger scaled");
    expect(policySource).not.toContain("Last low scaled");
    expect(policySource).not.toContain('Field k="Metric"');
    expect(policySource).not.toContain("JSON.stringify(policy");
    expect(policySource).not.toContain("Policyholder");
  });

  it("removes transparency placeholders and shows verified resource links", async () => {
    const transparencySource = await source("../src/routes/transparency.tsx");
    expect(transparencySource).toContain("Verified resources");
    expect(transparencySource).toContain("Deployed Hedgix contract");
    expect(transparencySource).toContain("Official product registry");
    expect(transparencySource).not.toContain("To be documented");
    expect(transparencySource).not.toContain("Placeholders");
    expect(transparencySource).not.toContain("invented values");
  });

  it("uses expected_settlement_date instead of arbitrary settlement-date input", async () => {
    const policySource = await source("../src/routes/policy.$id.tsx");
    const adminSource = await source("../src/routes/admin.tsx");
    expect(policySource).toContain("readiness.expected_settlement_date");
    expect(adminSource).toContain("expected_settlement_date");
    expect(policySource).not.toContain('type="date"');
  });

  it("keeps raw contract errors accessible through the mapper", () => {
    const mapped = mapHedgixError("VMError: DAILY_CANDLE_NOT_CLOSED");
    expect(mapped.code).toBe("DAILY_CANDLE_NOT_CLOSED");
    expect(mapped.title).toBe("Settlement is not ready yet");
    expect(mapped.action).toContain("Settlement will become available");
    expect(mapped.raw).toContain("DAILY_CANDLE_NOT_CLOSED");
  });

  it("renders a shared transaction flow with review, signature, consensus, and unresolved states", async () => {
    const dialogSource = await source("../src/components/hedgix/TransactionDialog.tsx");
    expect(dialogSource).toContain("Confirm in your wallet");
    expect(dialogSource).toContain("Transaction submitted");
    expect(dialogSource).toContain("Waiting for GenLayer consensus");
    expect(dialogSource).toContain("Confirming state");
    expect(dialogSource).toContain("Contract state confirmed");
    expect(dialogSource).toContain("Transaction accepted");
    expect(dialogSource).toContain("Accepted on-chain");
    expect(dialogSource).toContain("Latest state not available yet");
    expect(dialogSource).toContain("Retry state check");
    expect(dialogSource).toContain("Current status");
    expect(dialogSource).toContain("Last checked");
    expect(dialogSource).toContain("aria-live");
  });

  it("confirms expected on-chain state after accepted writes", async () => {
    const hookSource = await source("../src/hooks/useHedgixWrite.ts");
    expect(hookSource).toContain("confirmAcceptedState");
    expect(hookSource).toContain("retryStateConfirmation");
    expect(hookSource).toContain("completeState");
    expect(hookSource).toContain("continueCheckingStatus");
    expect(hookSource).toContain('value.status === "CANCELLED"');
    expect(hookSource).toContain('value.status === "PAID"');
    expect(hookSource).toContain("value.last_settled_date === settlementDate");
    expect(hookSource).toContain('outcome: "accepted_syncing"');
    expect(hookSource).toContain("blocksResubmission");
  });

  it("keeps the transaction stepper readable and non-red after accepted syncing", async () => {
    const dialogSource = await source("../src/components/hedgix/TransactionDialog.tsx");
    expect(dialogSource).toContain('"preparing"');
    expect(dialogSource).toContain('"awaiting_signature"');
    expect(dialogSource).toContain('"submitted"');
    expect(dialogSource).toContain('"consensus"');
    expect(dialogSource).toContain('"accepted"');
    expect(dialogSource).toContain('"confirming"');
    expect(dialogSource).toContain('"completed"');
    expect(dialogSource).toContain("lg:grid-cols-4");
    expect(dialogSource).toContain("min-w-0");
    expect(dialogSource).toContain("whitespace-normal");
    expect(dialogSource).toContain("break-words");
    expect(dialogSource).toContain("!acceptedSyncing");
    expect(dialogSource).toContain('item === "confirming"');
  });

  it("removes decorative triangle and plus/cross symbols from the hero headline", async () => {
    const heroSource = await source("../src/components/hedgix/Hero.tsx");
    expect(heroSource).toContain("Protection");
    expect(heroSource).toContain("for");
    expect(heroSource).toContain("markets");
    expect(heroSource).toContain("never");
    expect(heroSource).toContain("stand still.");
    expect(heroSource).toContain("Sym.Diamond");
    expect(heroSource).not.toContain("Sym.Triangle");
    expect(heroSource).not.toContain("Sym.Cross");
  });

  it("does not rely on browser confirm for policy cancellation", async () => {
    const policySource = await source("../src/routes/policy.$id.tsx");
    expect(policySource).toContain("Cancel protection");
    expect(policySource).not.toContain("window.confirm");
  });

  it("keeps accessible focus and reduced-motion handling in the global styles", async () => {
    const styles = await source("../src/styles.css");
    expect(styles).toContain(":focus-visible");
    expect(styles).toContain("prefers-reduced-motion");
  });

  it("does not introduce a public global policy-history route", async () => {
    const routes = await source("../src/routeTree.gen.ts");
    expect(routes).not.toContain("global-policy");
    expect(routes).not.toContain("policy-history");
  });
});
