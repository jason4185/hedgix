import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { genLayerBradbury } from "./chains";

export const wagmiConfig = createConfig({
  chains: [genLayerBradbury],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  multiInjectedProviderDiscovery: true,
  ssr: true,
  transports: {
    [genLayerBradbury.id]: http(genLayerBradbury.rpcUrls.default.http[0]),
  },
});

export const WALLETCONNECT_PROJECT_ID = undefined;
export const walletConnectorPolicy = {
  walletConnectEnabled: false,
  projectIdConfigured: false,
  connectorKinds: ["injected"],
};
