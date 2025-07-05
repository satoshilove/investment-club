// src/providers/wagmi-provider.tsx
"use client";

import { WagmiConfig, createConfig, http } from "wagmi";
import { bscTestnet } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { injected, walletConnect } from "@wagmi/connectors";

// 👇 Replace this with your WalletConnect Project ID from https://cloud.walletconnect.com
const WALLETCONNECT_PROJECT_ID = "974ebd43f4df9852b2dd53c83aa32ada"; 

// BSC Testnet RPC
const bscTestnetRpcUrl = "https://data-seed-prebsc-1-s1.binance.org:8545";

const config = createConfig({
  chains: [bscTestnet],
  connectors: [
    injected(), // MetaMask, Trust (if browser extension), etc.
    walletConnect({
      projectId: WALLETCONNECT_PROJECT_ID,
      showQrModal: true, // Required for mobile wallets like Trust Wallet
    }),
  ],
  transports: {
    [bscTestnet.id]: http(bscTestnetRpcUrl),
  },
  ssr: true,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

export function WagmiProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiConfig>
  );
}
