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
import { Sparklines, SparklinesLine } from "react-sparklines";

import membershipAbi from "@/app/abi/membership.json";
import erc20Abi from "@/app/abi/erc20.json";

const MEMBERSHIP_ADDRESS = process.env.NEXT_PUBLIC_MEMBERSHIP_ADDRESS as `0x${string}`;
const USDT_ADDRESS = process.env.NEXT_PUBLIC_USDT_ADDRESS as `0x${string}`;
const MEMBERSHIP_FEE = parseUnits("230", 18); // 230 USDT

const CHART_IDS = ["bitcoin", "ethereum", "binancecoin", "tether", "solana", "ripple"];

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connectAsync } = useConnect();
  const { disconnect } = useDisconnect();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>();
  const [joinTxHash, setJoinTxHash] = useState<`0x${string}` | undefined>();
  const [livePools, setLivePools] = useState<any[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({
    BTC: "Loading...",
    ETH: "Loading...",
    BNB: "Loading...",
    USDT: "Loading...",
    SOL: "Loading...",
    XRP: "Loading...",
  });

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,tether,solana,ripple&vs_currencies=usd"
        );
        const data = await res.json();
        setPrices({
          BTC: `$${data.bitcoin.usd.toLocaleString()}`,
          ETH: `$${data.ethereum.usd.toLocaleString()}`,
          BNB: `$${data.binancecoin.usd.toLocaleString()}`,
          USDT: `$${data.tether.usd.toFixed(2)}`,
          SOL: `$${data.solana.usd.toLocaleString()}`,
          XRP: `$${data.ripple.usd.toFixed(4)}`,
        });
      } catch (err) {
        console.error("Failed to fetch prices:", err);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  const { data: isMember, refetch } = useReadContract({
    address: MEMBERSHIP_ADDRESS,
    abi: membershipAbi,
    functionName: "isMember",
    args: [address],
    query: { enabled: !!address },
  });

  const { data: isPausedRaw } = useReadContract({
    address: MEMBERSHIP_ADDRESS,
    abi: membershipAbi,
    functionName: "paused",
  });
  const isPaused = isPausedRaw as boolean;

  const { data: currentFeeRaw } = useReadContract({
    address: MEMBERSHIP_ADDRESS,
    abi: membershipAbi,
    functionName: "membershipFeeUSDT",
  });
  const currentFee = currentFeeRaw as bigint;

  const { data: allowanceRaw } = useReadContract({
    address: USDT_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: [address, MEMBERSHIP_ADDRESS],
    query: { enabled: !!address },
  });
  const allowance = allowanceRaw as bigint;

  const { data: usdtBalanceRaw } = useReadContract({
    address: USDT_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
    query: { enabled: !!address },
  });
  const usdtBalance = usdtBalanceRaw as bigint;

  const { writeContractAsync: approveAsync, isPending: isApproving } = useWriteContract();
  const { writeContractAsync: joinAsync, isPending: isJoining } = useWriteContract();

  const { isLoading: isApprovingConfirmed } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isLoading: isJoiningConfirmed } = useWaitForTransactionReceipt({ hash: joinTxHash });

  const handleJoin = async () => {
    setError("");
    if (!isConnected || !address) return setError("Connect your wallet first.");
    if (isPaused) return setError("Membership is paused. Try again later.");
    if (!currentFee || currentFee !== MEMBERSHIP_FEE) return setError("Membership fee changed.");
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
    } catch {
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

      {/* Hero Section */}
      <section className="text-center px-6 py-20">
        <Image src={logo} alt="Paragon Circle" width={120} className="mx-auto mb-6" />
        <h1 className="text-4xl md:text-6xl font-bold mb-4">Unbank Yourself. Join a Private Investment Circle.</h1>
        <p className="text-lg md:text-xl mb-6 text-gray-300 max-w-2xl mx-auto">
          Say goodbye to traditional finance. Paragon Circle gives you control, yield, and freedom.
        </p>
        <div className="flex justify-center gap-4">
          <Button
            onClick={handleJoin}
            disabled={
              loading ||
              isApproving ||
              isJoining ||
              isApprovingConfirmed ||
              isJoiningConfirmed ||
              Boolean(isPaused)
            }
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

      {/* Why Paragon Section */}
      <section className="py-20 px-6 bg-[#121212]">
        <h2 className="text-4xl font-bold text-center mb-12">Why Paragon is Better Than Banks</h2>
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 text-center text-gray-300">
          <div className="flex flex-col items-center p-6 bg-[#1a1a1a] rounded-xl shadow-md">
            <span className="text-3xl mb-3">🔐</span>
            <h3 className="text-lg font-semibold mb-2">Private & Permissionless</h3>
            <p className="text-sm text-gray-400">No gatekeepers. Your wallet is your key to wealth.</p>
          </div>
          <div className="flex flex-col items-center p-6 bg-[#1a1a1a] rounded-xl shadow-md">
            <span className="text-3xl mb-3">🚫</span>
            <h3 className="text-lg font-semibold mb-2">No Hidden Fees</h3>
            <p className="text-sm text-gray-400">Unlike banks, we take no cut from your profits.</p>
          </div>
          <div className="flex flex-col items-center p-6 bg-[#1a1a1a] rounded-xl shadow-md">
            <span className="text-3xl mb-3">📊</span>
            <h3 className="text-lg font-semibold mb-2">Transparent & On-chain</h3>
            <p className="text-sm text-gray-400">Every transaction is verifiable on blockchain.</p>
          </div>
        </div>
      </section>


      {/* How It Works Section */}
      <section className="py-20 px-6 bg-[#111111]">
        <h2 className="text-4xl font-bold text-center mb-12">How It Works</h2>
        <div className="max-w-5xl mx-auto grid md:grid-cols-5 gap-6 text-center text-gray-300">
          <div className="flex flex-col items-center p-4 bg-[#1a1a1a] rounded-xl shadow-md">
            <span className="text-3xl mb-2">🦊</span>
           <h3 className="font-semibold text-lg mb-1">Connect Wallet</h3>
            <p className="text-sm text-gray-400">Use MetaMask to connect your crypto wallet.</p>
          </div>
          <div className="flex flex-col items-center p-4 bg-[#1a1a1a] rounded-xl shadow-md">
            <span className="text-3xl mb-2">💳</span>
            <h3 className="font-semibold text-lg mb-1">Pay Membership</h3>
            <p className="text-sm text-gray-400">Pay $230 USDT to join the Circle forever.</p>
          </div>
          <div className="flex flex-col items-center p-4 bg-[#1a1a1a] rounded-xl shadow-md">
            <span className="text-3xl mb-2">💰</span>
            <h3 className="font-semibold text-lg mb-1">Deposit in Pool</h3>
            <p className="text-sm text-gray-400">Pick a live investment pool and deposit USDT.</p>
          </div>
          <div className="flex flex-col items-center p-4 bg-[#1a1a1a] rounded-xl shadow-md">
            <span className="text-3xl mb-2">⏳</span>
            <h3 className="font-semibold text-lg mb-1">Wait Lock Period</h3>
            <p className="text-sm text-gray-400">Funds are locked for a set duration (e.g. 30 days).</p>
          </div>
          <div className="flex flex-col items-center p-4 bg-[#1a1a1a] rounded-xl shadow-md">
            <span className="text-3xl mb-2">💵</span>
            <h3 className="font-semibold text-lg mb-1">Withdraw Yield</h3>
            <p className="text-sm text-gray-400">Withdraw your funds plus profit after unlock.</p>
          </div>
        </div>
      </section>

      {/* Live Pools */}
      <section className="py-16 px-6 bg-black">
        <h2 className="text-3xl font-semibold text-center mb-8">Live Investment Pools</h2>
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 text-center text-gray-300">
          {livePools.length > 0 ? (
            livePools.map((pool, i) => (
              <div key={i} className="border border-gray-700 p-6 rounded-xl">
                <h3 className="text-lg font-bold mb-2">{pool.name}</h3>
                <p>
                  {pool.fee}% · {Math.floor(pool.duration / 86400)} day lock
                </p>
              </div>
            ))
          ) : (
            <p className="text-center col-span-3">No live pools found.</p>
          )}
        </div>
      </section>

      {/* Live Crypto Prices */}
      <section className="py-12 px-6 bg-gradient-to-br from-[#0a0f1c] to-[#111827]">
        <h2 className="text-3xl font-bold text-center mb-10 text-white">Live Crypto Prices</h2>
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 lg:grid-cols-6 gap-6 text-center">
          {Object.entries(prices).map(([symbol, price]) => (
            <div
              key={symbol}
              className="flex flex-col items-center p-4 bg-gradient-to-tr from-[#101c26] to-[#1f2937] border border-[#2a3747] rounded-2xl shadow-lg text-white"
            >
              <span className="text-xl font-semibold mb-2">{symbol}</span>
              <p className="text-sm mb-3 text-gray-400">{price}</p>
              <div className="w-full h-12">
                <Sparklines
                  data={[
                    Math.random() * 10 + 1,
                    Math.random() * 10 + 2,
                    Math.random() * 10 + 3,
                    Math.random() * 10 + 2,
                    Math.random() * 10 + 4,
                    Math.random() * 10 + 3,
                  ]}
                  width={100}
                  height={40}
                  margin={5}
                >
                  <SparklinesLine color="#00ffab" style={{ strokeWidth: 2, fill: "none" }} />
                </Sparklines>
              </div>
            </div>
          ))}
        </div>
      </section>



      {/* Footer */}
      <footer className="bg-[#0a0a0a] py-6 px-4 text-sm text-gray-400 text-center border-t border-gray-800">
        
        <div className="mt-4 space-x-4">
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
            Privacy Policy
          </a>
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
            Terms of Use
          </a>
          <a href="/disclaimer" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
            Investment Disclaimer
          </a>
        </div>

        <p className="mt-4 max-w-2xl mx-auto text-gray-500 text-xs">
          Paragon Circle is a private investment club for educational purposes only. We are not licensed financial advisors and do not hold an AFSL. Participation carries risk and does not guarantee returns.
        </p>

        <p className="mt-2">© 2025 Paragon Circle. All rights reserved.</p>
      </footer>

    </main>
  );
}
