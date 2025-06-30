"use client";

import { useEffect, useState } from "react";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  usePublicClient,
} from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { formatUnits, parseUnits } from "viem";
import { Button } from "@/components/ui/button";
import type { Abi } from "viem";

import vaultAbiJson from "@/app/abi/vault.json";
import membershipAbiJson from "@/app/abi/membership.json";
import erc20AbiJson from "@/app/abi/erc20.json";

const vaultAbi = vaultAbiJson as Abi;
const membershipAbi = membershipAbiJson as Abi;
const erc20Abi = erc20AbiJson as Abi;

const USDT = process.env.NEXT_PUBLIC_USDT_ADDRESS as `0x${string}`;
const MEMBERSHIP = process.env.NEXT_PUBLIC_MEMBERSHIP_ADDRESS as `0x${string}`;
const VAULT = process.env.NEXT_PUBLIC_VAULT_ADDRESS as `0x${string}`;
const USDT_DECIMALS = 18;

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();

  const [usdtBalance, setUsdtBalance] = useState("0");
  const [isMember, setIsMember] = useState(false);
  const [pools, setPools] = useState<any[]>([]);
  const [userDeposits, setUserDeposits] = useState<{ [poolId: number]: string }>({});
  const [depositAmounts, setDepositAmounts] = useState<{ [poolId: number]: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  const { writeContractAsync: write } = useWriteContract();

  useEffect(() => {
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  const { data: balanceRaw, error: balanceError } = useReadContract({
    abi: erc20Abi,
    address: USDT,
    functionName: "balanceOf",
    args: [address],
    query: { enabled: !!address },
  });

  const { data: isMemberRaw, error: membershipError } = useReadContract({
    abi: membershipAbi,
    address: MEMBERSHIP,
    functionName: "isMember",
    args: [address],
    query: { enabled: !!address },
  });

  const { data: poolCount, error: poolCountError } = useReadContract({
    abi: vaultAbi,
    address: VAULT,
    functionName: "poolCount",
    query: { enabled: !!address },
  });

  const {
    data: poolData,
    error: poolDataError,
    refetch: refetchPoolData,
  } = useReadContracts({
    contracts:
      poolCount && typeof poolCount === "bigint"
        ? Array.from({ length: Number(poolCount) }, (_, i) => ({
            address: VAULT,
            abi: vaultAbi,
            functionName: "pools",
            args: [BigInt(i)],
          }))
        : [],
    query: { enabled: !!poolCount },
  });

  const { data: userDepositStructsRaw, refetch: refetchDeposits } = useReadContract({
    abi: vaultAbi,
    address: VAULT,
    functionName: "getUserDeposits",
    args: [address],
    query: { enabled: !!address && isConnected },
  });

  useEffect(() => {
    if (balanceError || membershipError) {
      setError(balanceError?.message || membershipError?.message || "Error fetching account data");
    } else if (balanceRaw && typeof balanceRaw === "bigint") {
      setUsdtBalance(formatUnits(balanceRaw, USDT_DECIMALS));
    }
    setIsMember(Boolean(isMemberRaw));
  }, [balanceRaw, isMemberRaw, balanceError, membershipError]);

  useEffect(() => {
    if (poolCountError || poolDataError) {
      setError(poolCountError?.message || poolDataError?.message || "Error fetching pool data");
      return;
    }

    if (!poolData || !Array.isArray(poolData)) return;

    const cleaned = poolData.map((res: any) =>
      res?.status === "success" && res?.result?.length > 0
        ? res.result
        : ["Unnamed", 0n, 0n, false, 0n, 0n, 0n, 0n]
    );

    setPools(cleaned);
  }, [poolData, poolCountError, poolDataError]);

  useEffect(() => {
    if (Array.isArray(userDepositStructsRaw)) {
      const parsed: { [key: number]: bigint } = {};

      for (const d of userDepositStructsRaw) {
        try {
          if (
            !d ||
            typeof d.poolId === "undefined" ||
            typeof d.amount === "undefined" ||
            d.amount === null
          )
            continue;

          const poolId = Number(d.poolId);
          const rawAmount = typeof d.amount === "bigint" ? d.amount : BigInt(d.amount);
          if (!isNaN(poolId) && rawAmount > 0n) {
            parsed[poolId] = (parsed[poolId] || 0n) + rawAmount;
          }
        } catch (err) {
          console.warn("Invalid deposit struct:", d, err);
        }
      }

      const formatted: { [key: number]: string } = {};
      for (const [k, v] of Object.entries(parsed)) {
        formatted[Number(k)] = formatUnits(v, USDT_DECIMALS);
      }

      setUserDeposits(formatted);
    } else {
      setUserDeposits({});
    }
  }, [userDepositStructsRaw]);

  function formatUnlockTime(unlockTime: number) {
    const diff = unlockTime - now;
    if (diff <= 0) return "✅ Unlocked";
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    return `${h}h ${m}m ${s}s`;
  }

  function updateDepositAmount(poolId: number, value: string) {
    setDepositAmounts((prev) => ({ ...prev, [poolId]: value }));
  }

  async function handleDeposit(poolId: number) {
    try {
      const amount = depositAmounts[poolId]?.trim();
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        alert("Enter a valid amount.");
        return;
      }

      const parsedAmount = parseUnits(amount, USDT_DECIMALS);
      const approveTx = await write({
        abi: erc20Abi,
        address: USDT,
        functionName: "approve",
        args: [VAULT, parsedAmount],
      });
      const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveTx });
      if (approveReceipt.status !== 1) throw new Error("Approval failed");

      const depositTx = await write({
        abi: vaultAbi,
        address: VAULT,
        functionName: "deposit",
        args: [parsedAmount, BigInt(poolId)],
      });
      const depositReceipt = await publicClient.waitForTransactionReceipt({ hash: depositTx });
      if (depositReceipt.status !== 1) throw new Error("Deposit failed");

      await queryClient.invalidateQueries();
      await refetchDeposits();
      await refetchPoolData();
      setDepositAmounts((prev) => ({ ...prev, [poolId]: "" }));
      alert("✅ Deposit successful!");
    } catch (err: any) {
      console.error("❌ Deposit failed:", err);
      alert(err?.message || "Deposit error");
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Member Dashboard</h1>
          <nav className="space-x-4">
            <a href="/" className="text-gray-300 hover:text-white font-medium">Home</a>
            <a href="/dashboard" className="text-gray-300 hover:text-white font-medium">Dashboard</a>
          </nav>
        </div>

        {!isConnected ? (
          <p className="text-gray-400">Please connect your wallet.</p>
        ) : error ? (
          <p className="text-red-500">Error: {error}</p>
        ) : (
          <>
            <div className="mb-6 bg-[#121212] p-6 rounded-xl border border-gray-800">
              <h2 className="text-xl font-semibold mb-2">👤 Wallet</h2>
              <p className="text-gray-300 break-all">{address}</p>
            </div>

            <div className="mb-6 bg-[#121212] p-6 rounded-xl border border-gray-800">
              <h2 className="text-xl font-semibold mb-2">💰 USDT Balance</h2>
              <p className="text-gray-300">{Number(usdtBalance).toFixed(2)} USDT</p>
            </div>

            <div className="mb-6 bg-[#121212] p-6 rounded-xl border border-gray-800">
              <h2 className="text-xl font-semibold mb-2">🛡️ Membership Status</h2>
              <p className={isMember ? "text-green-400 font-semibold" : "text-red-500 font-semibold"}>
                {isMember ? "Active Member" : "Not a Member"}
              </p>
            </div>

            <h2 className="text-2xl font-bold mt-10 mb-4">Active Pools</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {pools.length > 0 ? (
                pools.map((pool: any[], poolId: number) => {
                  const name = pool[0] || `Pool ${poolId}`;
                  const lockDuration = pool[1] || 0n;
                  const feePercent = pool[2] || 0n;
                  const active = pool[3] || false;
                  const totalDeposited = pool[4];

                  let tvlDisplay = "Loading...";
                  try {
                    tvlDisplay = formatUnits(BigInt(totalDeposited), USDT_DECIMALS);
                  } catch {
                    tvlDisplay = "Format error";
                  }

                  const unlockString = Array.isArray(userDepositStructsRaw)
                    ? (() => {
                        const d = userDepositStructsRaw.find((d: any) => Number(d.poolId) === poolId);
                        return d ? formatUnlockTime(Number(d.unlockTime)) : "N/A";
                      })()
                    : "N/A";

                  return (
                    <div key={poolId} className="bg-[#121212] p-6 rounded-xl border border-gray-800">
                      <h3 className="text-xl font-semibold mb-2">{name}</h3>
                      <p className="text-sm text-gray-400 mb-1">
                        APY: {typeof feePercent === "bigint" ? Number(feePercent) : feePercent}% · Lock: {lockDuration && typeof lockDuration === "bigint" ? `${Number(lockDuration) / 86400} days` : "N/A"}
                      </p>
                      <p className="text-sm text-gray-400 mb-1">TVL: {tvlDisplay} USDT</p>
                      <p className="text-sm text-gray-400 mb-1">Your Deposit: {userDeposits[poolId] || "0"} USDT</p>
                      <p className="text-sm text-yellow-400 mb-2">Unlocks: {unlockString}</p>
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="number"
                          placeholder="Enter USDT"
                          step="0.01"
                          min="0"
                          value={depositAmounts[poolId] || ""}
                          onChange={(e) => updateDepositAmount(poolId, e.target.value)}
                          className="bg-black border border-gray-700 text-white px-3 py-1 rounded text-sm w-32"
                        />
                        <Button size="sm" onClick={() => handleDeposit(poolId)} disabled={!isMember}>
                          Deposit
                        </Button>
                      </div>
                      <Button variant="outline" size="sm" disabled>
                        Withdraw
                      </Button>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-400">No active pools available.</p>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
