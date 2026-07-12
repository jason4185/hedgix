import "@rainbow-me/rainbowkit/styles.css";
import type { ReactNode } from "react";
import { lightTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { genLayerBradbury } from "@/config/chains";
import { wagmiConfig } from "@/config/wagmi";

export function Web3Provider({
  children,
  queryClient,
}: {
  children: ReactNode;
  queryClient: QueryClient;
}) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          appInfo={{
            appName: "Hedgix",
            learnMoreUrl: "https://hedgix-market-registry.netlify.app",
          }}
          initialChain={genLayerBradbury}
          modalSize="compact"
          theme={lightTheme({
            accentColor: "#6d31d8",
            accentColorForeground: "#fffaf0",
            borderRadius: "small",
            fontStack: "system",
            overlayBlur: "small",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
