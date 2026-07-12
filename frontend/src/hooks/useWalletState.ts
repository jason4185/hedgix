import {
  useAccount,
  useBalance,
  useChainId,
  useConnectors,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { BRADBURY_CHAIN_ID } from "@/config/chains";
import type { Eip1193Provider, WriteContext } from "@/lib/genlayer/types";

export function useWalletState() {
  const account = useAccount();
  const chainId = useChainId();
  const connectors = useConnectors();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: switching } = useSwitchChain();
  const balance = useBalance({
    address: account.address,
    chainId: BRADBURY_CHAIN_ID,
    query: { enabled: Boolean(account.address) },
  });
  const isWrongNetwork = account.isConnected && chainId !== BRADBURY_CHAIN_ID;
  const hasInjectedWallet = connectors.length > 0;

  async function switchToBradbury() {
    await switchChainAsync({ chainId: BRADBURY_CHAIN_ID });
  }

  async function getWriteContext(): Promise<WriteContext> {
    if (!account.address || !account.connector) throw new Error("USER_REJECTED");
    const provider = (await account.connector.getProvider({
      chainId: BRADBURY_CHAIN_ID,
    })) as Eip1193Provider;
    return {
      address: account.address,
      chainId,
      provider,
    };
  }

  return {
    address: account.address,
    connector: account.connector,
    isConnected: account.isConnected,
    isConnecting: account.isConnecting,
    isWrongNetwork,
    chainId,
    balance: balance.data,
    balanceLoading: balance.isLoading,
    hasInjectedWallet,
    connectors,
    switching,
    disconnect,
    switchToBradbury,
    getWriteContext,
  };
}
