import { defineChain } from "viem";

export const BRADBURY_CHAIN_ID = 4221;
export const BRADBURY_RPC_URL = "https://rpc-bradbury.genlayer.com";
export const BRADBURY_EXPLORER_URL = "https://explorer-bradbury.genlayer.com";

export const genLayerBradbury = defineChain({
  id: BRADBURY_CHAIN_ID,
  name: "GenLayer Bradbury",
  nativeCurrency: {
    name: "GEN",
    symbol: "GEN",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [BRADBURY_RPC_URL] },
    public: { http: [BRADBURY_RPC_URL] },
  },
  blockExplorers: {
    default: {
      name: "GenLayer Bradbury Explorer",
      url: BRADBURY_EXPLORER_URL,
    },
  },
  testnet: true,
});

export function explorerTransactionUrl(hash: string): string {
  return `${BRADBURY_EXPLORER_URL.replace(/\/$/, "")}/tx/${hash}`;
}

export function explorerAddressUrl(address: string): string {
  return `${BRADBURY_EXPLORER_URL.replace(/\/$/, "")}/address/${address}`;
}
