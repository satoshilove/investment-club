"use client";

import { WagmiConfig, createConfig, http } from "wagmi";
import { bsc, bscTestnet } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { injected, walletConnect } from "@wagmi/connectors";

// WalletConnect Project ID
const WALLETCONNECT_PROJECT_ID = "974ebd43f4df9852b2dd53c83aa32ada";

// BSC RPC URLs
const BSC_MAINNET_RPC = "https://bsc-dataseed1.binance.org/";
const BSC_TESTNET_RPC = "https://data-seed-prebsc-1-s1.binance.org:8545";

// ✅ Create Wagmi config
const config = createConfig({
  chains: [bsc, bscTestnet],
  connectors: [
    injected(),
    walletConnect({
      projectId: WALLETCONNECT_PROJECT_ID,
      showQrModal: true,
    }),
  ],
  transports: {
    [bsc.id]: http(BSC_MAINNET_RPC),
    [bscTestnet.id]: http(BSC_TESTNET_RPC),
  },
  ssr: true,
});

// React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// Provider wrapper
export function WagmiProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiConfig>
  );
}

// ✅ Export the config so you can use it with getChainId(), switchChain(), etc.
export { config };
