/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HEDGIX_CONTRACT_ADDRESS?: string;
  readonly VITE_GENLAYER_NETWORK?: string;
  readonly VITE_GENLAYER_RPC_URL?: string;
  readonly VITE_GENLAYER_EXPLORER_URL?: string;
  readonly VITE_HEDGIX_REGISTRY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  ethereum?: unknown;
}
