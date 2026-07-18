import { describe, expect, it } from "bun:test";
import { BRADBURY_CHAIN_ID } from "../src/config/chains";
import { runtimeEnv } from "../src/config/env";
import { HEDGIX_METHODS } from "../src/config/contract";
import type { Address } from "viem";
import { genAmountToWei, decimalGenToWei } from "../src/lib/genlayer/formatters";
import { mapHedgixError } from "../src/lib/genlayer/errors";
import type { Eip1193Provider, WriteContext } from "../src/lib/genlayer/types";
import {
  cancelProtection,
  claimPayout,
  parseProviderChainId,
  prepareHedgixWriteClient,
  purchaseProtection,
  type HedgixWriteClient,
  type HedgixWriteClientFactory,
} from "../src/lib/genlayer/writes";

const WALLET_A = "0x00000000000000000000000000000000000000aa";
const WALLET_B = "0x00000000000000000000000000000000000000bb";
const CURRENT_PRODUCTION_CONTRACT = "0xFc7A79324f8624DeFb10e9771Af45A5444ea708D" as Address;
const TX_HASH = `0x${"1".repeat(64)}` as const;

async function source(path: string) {
  return Bun.file(new URL(path, import.meta.url)).text();
}

function provider({
  accounts,
  chainId = `0x${BRADBURY_CHAIN_ID.toString(16)}`,
}: {
  accounts: string[];
  chainId?: string | number;
}): Eip1193Provider {
  return {
    async request({ method }) {
      if (method === "eth_accounts") return accounts;
      if (method === "eth_chainId") return chainId;
      throw new Error(`unexpected method ${method}`);
    },
  };
}

function context(
  address: string | undefined,
  activeProvider: Eip1193Provider | null,
): WriteContext {
  return {
    address: address as WriteContext["address"],
    chainId: BRADBURY_CHAIN_ID,
    activeConnector: activeProvider
      ? {
          name: "Test connector",
          getProvider: async () => activeProvider,
        }
      : null,
  };
}

function recordingFactory(records: Array<{ account: string; provider: Eip1193Provider }>) {
  const client = {
    writeContract: async () => TX_HASH,
  } as unknown as HedgixWriteClient;
  return ((input) => {
    records.push(input);
    return client;
  }) as HedgixWriteClientFactory;
}

describe("Hedgix active-connector wallet writes", () => {
  it("keeps signed writes free of window.ethereum and uses activeConnector.getProvider()", async () => {
    const writesSource = await source("../src/lib/genlayer/writes.ts");
    const hookSource = await source("../src/hooks/useHedgixWrite.ts");
    const walletSource = await source("../src/hooks/useWalletState.ts");

    expect(writesSource).not.toContain("window.ethereum");
    expect(hookSource).not.toContain("window.ethereum");
    expect(walletSource).not.toContain("window.ethereum");
    expect(writesSource).toContain("activeConnector.getProvider()");
    expect(writesSource).not.toContain("context.provider");
  });

  it("retrieves the provider for each write preparation and does not cache stale providers", async () => {
    const providerA = provider({ accounts: [WALLET_A] });
    const providerB = provider({ accounts: [WALLET_B] });
    let callsA = 0;
    let callsB = 0;
    const records: Array<{ account: string; provider: Eip1193Provider }> = [];
    const factory = recordingFactory(records);

    await prepareHedgixWriteClient(
      {
        address: WALLET_A,
        chainId: BRADBURY_CHAIN_ID,
        activeConnector: {
          getProvider: async () => {
            callsA += 1;
            return providerA;
          },
        },
      },
      factory,
    );
    await prepareHedgixWriteClient(
      {
        address: WALLET_B,
        chainId: BRADBURY_CHAIN_ID,
        activeConnector: {
          getProvider: async () => {
            callsB += 1;
            return providerB;
          },
        },
      },
      factory,
    );

    expect(callsA).toBe(1);
    expect(callsB).toBe(1);
    expect(records[0].provider).toBe(providerA);
    expect(records[1].provider).toBe(providerB);
    expect(records[1].account).toBe(WALLET_B);
  });

  it("rejects missing connector, missing provider, account mismatch, and wrong network before submission", async () => {
    const records: Array<{ account: string; provider: Eip1193Provider }> = [];
    const factory = recordingFactory(records);

    await expect(prepareHedgixWriteClient(context(WALLET_A, null), factory)).rejects.toThrow(
      "ACTIVE_CONNECTOR_UNAVAILABLE",
    );
    await expect(
      prepareHedgixWriteClient(
        {
          address: WALLET_A,
          chainId: BRADBURY_CHAIN_ID,
          activeConnector: { getProvider: async () => ({}) },
        },
        factory,
      ),
    ).rejects.toThrow("WALLET_PROVIDER_UNAVAILABLE");
    await expect(
      prepareHedgixWriteClient(context(WALLET_A, provider({ accounts: [WALLET_B] })), factory),
    ).rejects.toThrow("WALLET_ACCOUNT_MISMATCH");
    await expect(
      prepareHedgixWriteClient(
        context(WALLET_A, provider({ accounts: [WALLET_A], chainId: "0x1" })),
        factory,
      ),
    ).rejects.toThrow("WRONG_NETWORK");

    expect(records).toHaveLength(0);
  });

  it("parses Bradbury chain ids from provider responses exactly", () => {
    expect(parseProviderChainId("0x107d")).toBe(BRADBURY_CHAIN_ID);
    expect(parseProviderChainId("4221")).toBe(BRADBURY_CHAIN_ID);
    expect(parseProviderChainId(4221)).toBe(BRADBURY_CHAIN_ID);
    expect(() => parseProviderChainId("not-a-chain")).toThrow("WALLET_PROVIDER_CHAIN_UNAVAILABLE");
  });

  it("submits purchase, claim, and cancel through the centralized write service", async () => {
    const originalAddress = runtimeEnv.contractAddress;
    const originalConfigured = runtimeEnv.contractConfigured;
    if (!runtimeEnv.contractAddress) {
      runtimeEnv.contractAddress = CURRENT_PRODUCTION_CONTRACT;
      runtimeEnv.contractConfigured = true;
    }
    const activeProvider = provider({ accounts: [WALLET_A] });
    const writes: Array<{ functionName: string; args: unknown[]; value: bigint; address: string }> =
      [];
    const client = {
      writeContract: async (input: {
        functionName: string;
        args: unknown[];
        value: bigint;
        address: string;
      }) => {
        writes.push(input);
        return TX_HASH;
      },
    } as unknown as HedgixWriteClient;
    const options = {
      createWriteClient: (() => client) as HedgixWriteClientFactory,
      confirmTransaction: async () => ({ txExecutionResultName: "FINISHED_WITH_RETURN" }),
    };
    const writeContext = context(WALLET_A, activeProvider);

    try {
      await purchaseProtection(
        writeContext,
        {
          protectedAsset: "BTCUSDT",
          protectionType: "price_drop_protection",
          eventLevel: "Protected Drop",
          durationDays: 7,
          premiumWei: 1_000_000_000_000_000_000n,
        },
        undefined,
        options,
      );
      await claimPayout(writeContext, "12", undefined, options);
      await cancelProtection(writeContext, "13", undefined, options);

      expect(writes.map((write) => write.functionName)).toEqual([
        HEDGIX_METHODS.purchaseProtection,
        HEDGIX_METHODS.claimPayout,
        HEDGIX_METHODS.cancelProtection,
      ]);
      expect(writes[0].args).toEqual(["BTCUSDT", "price_drop_protection", "Protected Drop", 7n]);
      expect(writes[0].value).toBe(1_000_000_000_000_000_000n);
      expect(writes[0].address).toBe(runtimeEnv.contractAddress);
      expect(writes[1].args).toEqual([12n]);
      expect(writes[2].args).toEqual([13n]);
    } finally {
      runtimeEnv.contractAddress = originalAddress;
      runtimeEnv.contractConfigured = originalConfigured;
    }
  });

  it("uses exact bigint GEN conversion and rejects invalid amounts", () => {
    expect(decimalGenToWei("1")).toBe(1_000_000_000_000_000_000n);
    expect(decimalGenToWei("2")).toBe(2_000_000_000_000_000_000n);
    expect(decimalGenToWei("0.000000000000000001")).toBe(1n);
    expect(genAmountToWei(1)).toBe(1_000_000_000_000_000_000n);
    expect(() => decimalGenToWei("0")).toThrow("INVALID_AMOUNT");
    expect(() => decimalGenToWei("-1")).toThrow("INVALID_AMOUNT");
    expect(() => decimalGenToWei("abc")).toThrow("INVALID_AMOUNT");
    expect(() => decimalGenToWei("1.0000000000000000001")).toThrow();
    expect(() => genAmountToWei(1.5)).toThrow("INVALID_AMOUNT");
    expect(() => genAmountToWei(Number.MAX_SAFE_INTEGER + 1)).toThrow("INVALID_AMOUNT");
  });

  it("disables duplicate UI submissions and signed mutation retries in source", async () => {
    const protectSource = await source("../src/routes/protect.tsx");
    const dashboardSource = await source("../src/routes/dashboard.tsx");
    const adminSource = await source("../src/routes/admin.tsx");
    const hookSource = await source("../src/hooks/useHedgixWrite.ts");

    expect(protectSource).toContain("writer.purchase.isPending");
    expect(dashboardSource).toContain("claimPending");
    expect(dashboardSource).toContain("cancellationPending");
    expect(adminSource).toContain("writer.addFunds.isPending");
    expect(adminSource).toContain("writer.settle.variables?.protectionId === id");
    expect(hookSource.match(/retry: false/g)?.length).toBe(9);
  });

  it("maps wallet and RPC errors to friendly codes and logs raw errors only in development", async () => {
    expect(mapHedgixError(new Error("WALLET_ACCOUNT_MISMATCH")).title).toBe(
      "Wallet account changed",
    );
    expect(mapHedgixError({ code: 4001, message: "User rejected the request" }).code).toBe(
      "USER_REJECTED",
    );
    expect(mapHedgixError(new Error("insufficient funds for gas")).code).toBe("INSUFFICIENT_GEN");
    expect(mapHedgixError(new Error("fetch failed")).code).toBe("RPC_UNAVAILABLE");
    expect(mapHedgixError(new Error("VMError: INVALID_PREMIUM")).code).toBe("INVALID_PREMIUM");

    const writesSource = await source("../src/lib/genlayer/writes.ts");
    expect(writesSource).toContain("if (!import.meta.env.DEV) return");
    expect(writesSource).toContain("console.error");
  });

  it("keeps production contract address selection in runtimeEnv and refreshes state after writes", async () => {
    const writesSource = await source("../src/lib/genlayer/writes.ts");
    const hookSource = await source("../src/hooks/useHedgixWrite.ts");
    expect(writesSource).toContain("const address = requireContractAddress()");
    expect(writesSource).not.toContain("0xFc7A79324f8624DeFb10e9771Af45A5444ea708D");
    expect(hookSource).toContain("queryClient.invalidateQueries");
    expect(hookSource).toContain("onSuccess: refresh");
  });
});
