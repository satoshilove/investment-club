"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { injected } from "@wagmi/connectors";
import { parseUnits } from "viem";
import logo from "@/assets/logo_paragon_circle.png";
import { Button } from "@/components/ui/button";

import membershipAbi from "@/app/abi/membership.json";
import erc20Abi from "@/app/abi/erc20.json";

const MEMBERSHIP_ADDRESS = process.env.NEXT_PUBLIC_MEMBERSHIP_ADDRESS as `0x${string}`;
const USDT_ADDRESS = process.env.NEXT_PUBLIC_USDT_ADDRESS as `0x${string}`;
const MEMBERSHIP_FEE = parseUnits("230", 18);

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connectAsync } = useConnect();
  const { disconnect } = useDisconnect();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>();
  const [joinTxHash, setJoinTxHash] = useState<`0x${string}` | undefined>();
  const [livePools, setLivePools] = useState<any[]>([]);

  const { data: isMember, refetch } = useReadContract({
    address: MEMBERSHIP_ADDRESS,
    abi: membershipAbi,
    functionName: "isMember",
    args: [address],
    query: { enabled: !!address },
  });

  const { data: isPaused } = useReadContract({
    address: MEMBERSHIP_ADDRESS,
    abi: membershipAbi,
    functionName: "paused",
  });

  const { data: currentFee } = useReadContract({
    address: MEMBERSHIP_ADDRESS,
    abi: membershipAbi,
    functionName: "membershipFeeUSDT",
  });

  const { data: allowance } = useReadContract({
    address: USDT_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: [address, MEMBERSHIP_ADDRESS],
    query: { enabled: !!address },
  });

  const { data: usdtBalance } = useReadContract({
    address: USDT_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
    query: { enabled: !!address },
  });

  const { writeContractAsync: approveAsync, isPending: isApproving } = useWriteContract();
  const { writeContractAsync: joinAsync, isPending: isJoining } = useWriteContract();

  const { isLoading: isApprovingConfirmed } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isLoading: isJoiningConfirmed } = useWaitForTransactionReceipt({ hash: joinTxHash });

  const handleJoin = async () => {
    setError("");
    if (!isConnected || !address) return setError("Connect your wallet first.");
    if (isPaused) return setError("Membership is paused. Try again later.");
    if (!currentFee || currentFee.toString() !== MEMBERSHIP_FEE.toString())
      return setError("Membership fee changed.");
    if (!usdtBalance || usdtBalance < MEMBERSHIP_FEE) return setError("Insufficient USDT.");

    try {
      setLoading(true);
      if (!allowance || allowance < MEMBERSHIP_FEE) {
        const tx = await approveAsync({
          address: USDT_ADDRESS,
          abi: erc20Abi,
          functionName: "approve",
          args: [MEMBERSHIP_ADDRESS, MEMBERSHIP_FEE],
        });
        setApproveTxHash(tx);
      }
      const joinTx = await joinAsync({
        address: MEMBERSHIP_ADDRESS,
        abi: membershipAbi,
        functionName: "joinCircle",
      });
      setJoinTxHash(joinTx);
      await refetch?.();
      alert("🎉 Welcome to Paragon Circle.");
    } catch (err: any) {
      setError(err.message || "Join failed.");
    } finally {
      setLoading(false);
      setApproveTxHash(undefined);
      setJoinTxHash(undefined);
    }
  };

  const handleExplore = () => {
    if (isMember) window.location.href = "/dashboard";
    else setError("You must be a member to explore pools.");
  };

  const handleConnect = async () => {
    try {
      await connectAsync({ connector: injected() });
    } catch (err) {
      setError("Wallet connection failed.");
    }
  };

  useEffect(() => {
    async function fetchPools() {
      try {
        const res = await fetch("/api/readPools");
        const json = await res.json();
        const activePools = json.filter((p: any) => p.active);
        setLivePools(activePools);
      } catch {
        setLivePools([]);
      }
    }
    fetchPools();
  }, []);

  return (
    <main className="min-h-screen bg-[#0e0e0e] text-white">
      <div className="absolute top-6 right-6">
        {isConnected ? (
          <Button onClick={() => disconnect()} variant="outline" className="text-white border-white">
            {`${address?.slice(0, 6)}...${address?.slice(-4)}`} (Disconnect)
          </Button>
        ) : (
          <Button onClick={handleConnect}>Connect Wallet</Button>
        )}
      </div>

      <section className="text-center px-6 py-20">
        <Image src={logo} alt="Paragon Circle" width={120} className="mx-auto mb-6" />
        <h1 className="text-4xl md:text-6xl font-bold mb-4">Unbank Yourself. Join a Private Investment Circle.</h1>
        <p className="text-lg md:text-xl mb-6 text-gray-300 max-w-2xl mx-auto">
          Say goodbye to traditional finance. Paragon Circle gives you control, yield, and freedom.
        </p>
        <div className="flex justify-center gap-4">
          <Button
            onClick={handleJoin}
            disabled={loading || isApproving || isJoining || isApprovingConfirmed || isJoiningConfirmed || isPaused}
            className="px-6 py-3 text-lg"
          >
            {loading || isApproving || isJoining || isApprovingConfirmed || isJoiningConfirmed
              ? "Processing..."
              : "Join Now ($230)"}
          </Button>
          <Button variant="outline" onClick={handleExplore} className="px-6 py-3 text-lg border-white text-white">
            Explore Pools
          </Button>
        </div>
        {error && <p className="mt-4 text-red-500">{error}</p>}
      </section>

      <section className="py-16 px-6 bg-[#121212]">
        <h2 className="text-3xl font-semibold text-center mb-12">Why Paragon is Better Than Banks</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto text-center">
          <div>
            <h3 className="text-xl font-bold mb-2">🔐 Private & Permissionless</h3>
            <p className="text-gray-400">No gatekeepers. Your wallet is your key to wealth.</p>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2">🚫 No Hidden Fees</h3>
            <p className="text-gray-400">Unlike banks, we take no cut from your profits.</p>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2">📊 Transparent & On-chain</h3>
            <p className="text-gray-400">Every transaction is verifiable on blockchain.</p>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-black">
        <h2 className="text-3xl font-semibold text-center mb-8">Live Investment Pools</h2>
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 text-center text-gray-300">
          {livePools.length > 0 ? (
            livePools.map((pool, i) => (
              <div key={i} className="border border-gray-700 p-6 rounded-xl">
                <h3 className="text-lg font-bold mb-2">{pool.name}</h3>
                <p>{pool.fee}% · {Math.floor(pool.duration / 86400)} day lock</p>
              </div>
            ))
          ) : (
            <p className="text-center col-span-3">No live pools found.</p>
          )}
        </div>
      </section>

      <footer className="bg-[#0a0a0a] py-6 px-4 text-sm text-gray-400 text-center border-t border-gray-800">
        <p>Live Prices · BTC: $64,230 · ETH: $3,420 · PRGN: $0.42 · USDT: $1.00</p>
        <p className="mt-2">© 2025 Paragon Circle. All rights reserved.</p>
      </footer>
    </main>
  );
}
