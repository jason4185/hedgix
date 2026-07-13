import type { Address } from "viem";
import { BRADBURY_EXPLORER_URL, BRADBURY_RPC_URL, explorerAddressUrl } from "./chains";

export const DEFAULT_REGISTRY_URL =
  "https://hedgix-market-registry.netlify.app/hedgix-market-protection-registry.v1.json";

export type RuntimeEnv = {
  contractAddress: Address | null;
  contractAddressRaw: string;
  contractConfigured: boolean;
  contractError: string;
  contractExplorerUrl: string | null;
  network: "testnetBradbury";
  rpcUrl: string;
  explorerUrl: string;
  registryUrl: string;
};

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export function parseContractAddressConfig(value: unknown): {
  address: Address | null;
  raw: string;
  configured: boolean;
  error: string;
} {
  const raw = typeof value === "string" ? value.trim() : "";
  const configured = ADDRESS_PATTERN.test(raw);
  return {
    address: configured ? (raw as Address) : null,
    raw,
    configured,
    error: raw
      ? "VITE_HEDGIX_CONTRACT_ADDRESS is not a valid 0x address."
      : "VITE_HEDGIX_CONTRACT_ADDRESS is not configured.",
  };
}

export function contractExplorerUrlForAddress(address: Address | null): string | null {
  return address ? explorerAddressUrl(address) : null;
}

const contractAddressConfig = parseContractAddressConfig(
  import.meta.env.VITE_HEDGIX_CONTRACT_ADDRESS,
);

export const runtimeEnv: RuntimeEnv = {
  contractAddress: contractAddressConfig.address,
  contractAddressRaw: contractAddressConfig.raw,
  contractConfigured: contractAddressConfig.configured,
  contractError: contractAddressConfig.error,
  contractExplorerUrl: contractExplorerUrlForAddress(contractAddressConfig.address),
  network: "testnetBradbury",
  rpcUrl: import.meta.env.VITE_GENLAYER_RPC_URL || BRADBURY_RPC_URL,
  explorerUrl: import.meta.env.VITE_GENLAYER_EXPLORER_URL || BRADBURY_EXPLORER_URL,
  registryUrl: import.meta.env.VITE_HEDGIX_REGISTRY_URL || DEFAULT_REGISTRY_URL,
};

export function requireContractAddress(): Address {
  if (!runtimeEnv.contractAddress) {
    throw new Error("CONTRACT_ADDRESS_NOT_CONFIGURED");
  }
  return runtimeEnv.contractAddress;
}
