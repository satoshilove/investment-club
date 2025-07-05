// src/components/ConnectWallet.tsx
"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "../components/ui/button";

export default function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const [showWallets, setShowWallets] = useState(false);

  const handleConnect = async (connectorIndex: number) => {
    const connector = connectors[connectorIndex];
    try {
      await connectAsync({ connector });
      setShowWallets(false);
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
    <div className="relative">
      <Button onClick={() => setShowWallets(!showWallets)} className="px-4 py-2 text-sm">
        Connect Wallet
      </Button>

      {showWallets && (
        <div className="absolute right-0 mt-2 bg-black border border-gray-700 rounded-md shadow-lg z-50">
          {connectors.map((connector, i) => (
            <button
              key={connector.id}
              onClick={() => handleConnect(i)}
              className="block w-full text-left px-4 py-2 text-white hover:bg-gray-800"
            >
              {connector.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
