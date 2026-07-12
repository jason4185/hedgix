import { isAddress, type Address } from "viem";
import { BRADBURY_EXPLORER_URL, BRADBURY_RPC_URL } from "./chains";

export const DEFAULT_REGISTRY_URL =
  "https://hedgix-market-registry.netlify.app/hedgix-market-protection-registry.v1.json";

export type RuntimeEnv = {
  contractAddress: Address | null;
  contractAddressRaw: string;
  contractConfigured: boolean;
  contractError: string;
  network: "testnetBradbury";
  rpcUrl: string;
  explorerUrl: string;
  registryUrl: string;
};

const rawContractAddress = (import.meta.env.VITE_HEDGIX_CONTRACT_ADDRESS ?? "").trim();
const isConfiguredAddress = isAddress(rawContractAddress);

export const runtimeEnv: RuntimeEnv = {
  contractAddress: isConfiguredAddress ? (rawContractAddress as Address) : null,
  contractAddressRaw: rawContractAddress,
  contractConfigured: isConfiguredAddress,
  contractError: rawContractAddress
    ? "VITE_HEDGIX_CONTRACT_ADDRESS is not a valid 0x address."
    : "VITE_HEDGIX_CONTRACT_ADDRESS is not configured.",
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
