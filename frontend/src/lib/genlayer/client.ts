import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import type { Address } from "viem";
import { runtimeEnv } from "@/config/env";
import type { Eip1193Provider } from "./types";

export function createHedgixReadClient(account?: Address) {
  return createClient({
    chain: testnetBradbury,
    endpoint: runtimeEnv.rpcUrl,
    account,
  });
}

export function createHedgixWriteClient({
  account,
  provider,
}: {
  account: Address;
  provider: Eip1193Provider;
}) {
  return createClient({
    chain: testnetBradbury,
    endpoint: runtimeEnv.rpcUrl,
    account,
    provider,
  });
}
