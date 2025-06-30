// src/components/ConnectWallet.tsx
"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "@wagmi/connectors";
import { Button } from "../components/ui/button";

export default function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connectAsync } = useConnect(); // don't pass connector here
  const { disconnect } = useDisconnect();

  const handleConnect = async () => {
    try {
      await connectAsync({ connector: injected() }); // pass connector here
    } catch (error) {
      console.error("Wallet connection failed", error);
    }
  };

  if (isConnected) {
    return (
      <Button
        onClick={() => disconnect()}
        variant="outline"
        className="border-white text-white px-4 py-2 text-sm"
      >
        {`${address?.slice(0, 6)}...${address?.slice(-4)}`} (Disconnect)
      </Button>
    );
  }

  return (
    <Button onClick={handleConnect} className="px-4 py-2 text-sm">
      Connect Wallet
    </Button>
  );
}
