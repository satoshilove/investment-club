// src/providers/wagmi-provider.tsx
"use client";

import { WagmiConfig, createConfig, http } from "wagmi";
import { bscTestnet } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Recommended BSC Testnet RPC URL (e.g., from Chainstack or public source)
const bscTestnetRpcUrl = "https://data-seed-prebsc-1-s1.binance.org:8545"; // Public BSC Testnet RPC

const config = createConfig({
  chains: [bscTestnet],
  transports: {
    [bscTestnet.id]: http(bscTestnetRpcUrl), // Specific RPC for BSC Testnet
  },
  ssr: true,
  // Optional: Add a default connector or wallet configuration if needed
  // e.g., connectors: [injectedConnector()],
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevent unwanted refetching
      staleTime: 5 * 60 * 1000, // 5 minutes stale time
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