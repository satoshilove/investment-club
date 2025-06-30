"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect, useContractRead, useWriteContract } from "wagmi";
import { formatUnits, parseUnits, isAddress } from "viem";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

import vaultAbi from "@/app/abi/vault.json";
import membershipAbi from "@/app/abi/membership.json";
import erc20Abi from "@/app/abi/erc20.json";

const VAULT = process.env.NEXT_PUBLIC_VAULT_ADDRESS as `0x${string}`;
const USDT = process.env.NEXT_PUBLIC_USDT_ADDRESS as `0x${string}`;
const MEMBERSHIP = process.env.NEXT_PUBLIC_MEMBERSHIP_ADDRESS as `0x${string}`;
const DECIMALS = 18;

export default function AdminPanel() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { writeContractAsync } = useWriteContract();

  const [isOwner, setIsOwner] = useState(false);
  const [vaultBalance, setVaultBalance] = useState("0");
  const [membershipFee, setMembershipFee] = useState("0");
  const [newMembershipFee, setNewMembershipFee] = useState("");
  const [newPool, setNewPool] = useState({ name: "", duration: "", fee: "" });
  const [pools, setPools] = useState<any[]>([]);
  const [poolCount, setPoolCount] = useState(0);
  const [memberAddress, setMemberAddress] = useState("");
  const [movePoolId, setMovePoolId] = useState("");
  const [moveAddress, setMoveAddress] = useState("");
  const [moveAmount, setMoveAmount] = useState("");

  const { data: owner } = useContractRead({ address: VAULT, abi: vaultAbi, functionName: "owner" });
  const { data: balance } = useContractRead({ address: USDT, abi: erc20Abi, functionName: "balanceOf", args: [VAULT] });
  const { data: count } = useContractRead({ address: VAULT, abi: vaultAbi, functionName: "poolCount" });
  const { data: feeRaw } = useContractRead({ address: MEMBERSHIP, abi: membershipAbi, functionName: "membershipFeeUSDT" });
  const { data: emergencyUnlock } = useContractRead({ address: VAULT, abi: vaultAbi, functionName: "emergencyUnlock" });
  const { data: paused } = useContractRead({ address: VAULT, abi: vaultAbi, functionName: "paused" });

  useEffect(() => {
    if (address && typeof owner === "string" && owner.toLowerCase() === address.toLowerCase()) {
      setIsOwner(true);
    }
  }, [address, owner]);

  useEffect(() => {
    if (balance && typeof balance === "bigint") {
      setVaultBalance((Number(balance) / 10 ** DECIMALS).toFixed(2));
    }
  }, [balance]);

  useEffect(() => {
    if (feeRaw && typeof feeRaw === "bigint") {
      setMembershipFee((Number(feeRaw) / 10 ** DECIMALS).toFixed(2));
    }
  }, [feeRaw]);

  useEffect(() => {
    if (count && typeof count === "bigint") {
      setPoolCount(Number(count));
    }
  }, [count]);

  useEffect(() => {
    if (poolCount > 0) loadPools();
  }, [poolCount]);

  const loadPools = async () => {
    const allPools = await Promise.all(
      [...Array(poolCount)].map(async (_, i) => {
        const res = await fetch(`/api/readPool?id=${i}`);
        return res.json();
      })
    );
    setPools(allPools);
  };

  const createPool = async () => {
    if (!newPool.name || !newPool.duration || !newPool.fee) return alert("All fields required");
    try {
      await writeContractAsync({
        address: VAULT,
        abi: vaultAbi,
        functionName: "createPool",
        args: [newPool.name, BigInt(newPool.duration), parseInt(newPool.fee)]
      });
      alert("✅ Pool created");
      setNewPool({ name: "", duration: "", fee: "" });
      loadPools();
    } catch {
      alert("❌ Failed to create pool");
    }
  };

  const togglePoolStatus = async (id: number, currentStatus: boolean) => {
    try {
      await writeContractAsync({
        address: VAULT,
        abi: vaultAbi,
        functionName: "setPoolStatus",
        args: [id, !currentStatus]
      });
      alert("✅ Pool status updated");
      loadPools();
    } catch {
      alert("❌ Failed to update status");
    }
  };

  const toggleEmergency = async () => {
    try {
      await writeContractAsync({
        address: VAULT,
        abi: vaultAbi,
        functionName: "toggleEmergencyUnlock",
        args: []
      });
      alert("✅ Emergency toggled");
    } catch {
      alert("❌ Failed to toggle emergency");
    }
  };

  const togglePause = async () => {
    try {
      await writeContractAsync({
        address: VAULT,
        abi: vaultAbi,
        functionName: paused ? "unpause" : "pause",
        args: []
      });
      alert(`✅ Contract ${paused ? "unpaused" : "paused"}`);
    } catch {
      alert("❌ Failed to toggle pause");
    }
  };

  const moveCapital = async () => {
    if (!movePoolId || !isAddress(moveAddress) || !moveAmount || isNaN(Number(moveAmount))) return alert("❌ Invalid input");
    try {
      const amtWei = parseUnits(moveAmount, DECIMALS);
      await writeContractAsync({
        address: VAULT,
        abi: vaultAbi,
        functionName: "moveToInvestment",
        args: [parseInt(movePoolId), moveAddress, amtWei]
      });
      alert("✅ Capital moved");
      setMovePoolId("");
      setMoveAddress("");
      setMoveAmount("");
    } catch {
      alert("❌ Move failed");
    }
  };

  const removeMember = async () => {
    if (!isAddress(memberAddress)) return alert("Invalid address");
    try {
      await writeContractAsync({
        address: VAULT,
        abi: vaultAbi,
        functionName: "removeMember",
        args: [memberAddress]
      });
      alert("✅ Member removed");
      setMemberAddress("");
    } catch {
      alert("❌ Failed to remove member");
    }
  };

  const updateMembershipFee = async () => {
    if (!newMembershipFee || isNaN(Number(newMembershipFee))) return alert("Invalid fee");
    try {
      const fee = parseUnits(newMembershipFee, DECIMALS);
      await writeContractAsync({
        address: MEMBERSHIP,
        abi: membershipAbi,
        functionName: "updateMembershipFeeUSDT",
        args: [fee]
      });
      alert("✅ Membership fee updated");
      setNewMembershipFee("");
    } catch {
      alert("❌ Failed to update membership fee");
    }
  };

  return (
    <main className="min-h-screen bg-black text-white px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <nav className="space-x-6 text-sm">
            <Link href="/" className="hover:underline">Home</Link>
            <Link href="/dashboard" className="hover:underline">Dashboard</Link>
            <Link href="/admin" className="text-green-400 font-semibold">Admin</Link>
          </nav>
        </div>

        {!isConnected ? (
          <Button onClick={() => connect({ connector: connectors[0] })}>Connect Wallet</Button>
        ) : !isOwner ? (
          <p className="text-red-500">You are not the contract owner.</p>
        ) : (
          <>
            <Card className="mb-6 bg-[#1c1f26]">
              <CardContent>
                <h2 className="text-xl font-semibold mb-2">⚙️ Vault Controls</h2>
                <p>Vault Balance: {vaultBalance} USDT</p>
                <p className="mt-2">Emergency Unlock: {emergencyUnlock ? "🛑 Enabled" : "✅ Disabled"}</p>
                <Button className="mt-2 bg-red-600 hover:bg-red-700 text-white" onClick={toggleEmergency}>
                  {emergencyUnlock ? "Disable Emergency" : "Emergency Withdraw"}
                </Button>
                <p className="mt-4">Contract Paused: {paused ? "⏸️ Yes" : "▶️ No"}</p>
                <Button className="mt-2 bg-orange-500 hover:bg-orange-600 text-white" onClick={togglePause}>
                  {paused ? "Unpause" : "Pause Pools"}
                </Button>

                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2">📤 Move to Investment</h3>
                  <div className="flex flex-wrap gap-2">
                    <input type="number" placeholder="Pool ID" className="text-black px-2 py-1" value={movePoolId} onChange={(e) => setMovePoolId(e.target.value)} />
                    <input type="text" placeholder="Destination Address" className="text-black px-2 py-1" value={moveAddress} onChange={(e) => setMoveAddress(e.target.value)} />
                    <input type="number" placeholder="Amount (USDT)" className="text-black px-2 py-1" value={moveAmount} onChange={(e) => setMoveAmount(e.target.value)} />
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={moveCapital}>Move</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6 bg-[#1c1f26]">
              <CardContent>
                <h2 className="text-xl font-semibold mb-2">🧾 Membership Fee</h2>
                <p>Current Fee: {membershipFee} USDT</p>
                <input type="number" placeholder="New Fee" value={newMembershipFee} onChange={(e) => setNewMembershipFee(e.target.value)} className="text-black px-2 py-1 mr-2" />
                <Button onClick={updateMembershipFee}>Update Fee</Button>
              </CardContent>
            </Card>

            <Card className="mb-6 bg-[#1c1f26]">
              <CardContent>
                <h2 className="text-xl font-semibold mb-2">🧱 Create Pool</h2>
                <input type="text" placeholder="Name" value={newPool.name} onChange={(e) => setNewPool({ ...newPool, name: e.target.value })} className="text-black px-2 py-1 mr-2" />
                <input type="number" placeholder="Duration (s)" value={newPool.duration} onChange={(e) => setNewPool({ ...newPool, duration: e.target.value })} className="text-black px-2 py-1 mr-2" />
                <input type="number" placeholder="Fee (%)" value={newPool.fee} onChange={(e) => setNewPool({ ...newPool, fee: e.target.value })} className="text-black px-2 py-1 mr-2" />
                <Button onClick={createPool}>Create</Button>
              </CardContent>
            </Card>

            {pools.map((p, i) => (
              <Card key={i} className="mb-4 bg-[#1c1f26]">
                <CardContent>
                  <p><strong>{p.name}</strong> (ID: {i})</p>
                  <p>Duration: {p.duration}s | Fee: {p.fee}% | Status: {p.active ? "✅" : "❌"}</p>
                  <p>Deposited: {formatUnits(BigInt(p.totalDeposited), DECIMALS)} USDT</p>
                  <p>Profit: {formatUnits(BigInt(p.totalProfit), DECIMALS)} USDT</p>
                  <Button size="sm" className="mr-2 mt-2" onClick={() => togglePoolStatus(i, p.active)}>Toggle Status</Button>
                  <Button
                    size="sm"
                    className="mt-2 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={moveCapital}
                  >
                    Move Capital
                  </Button>
                </CardContent>
              </Card>
            ))}

            <Card className="mt-6 bg-[#1c1f26]">
              <CardContent>
                <h2 className="text-xl font-semibold mb-2">👤 Member Management</h2>
                <input type="text" placeholder="Wallet Address" value={memberAddress} onChange={(e) => setMemberAddress(e.target.value)} className="text-black px-2 py-1 mr-2" />
                <Button variant="outline" className="text-red-600 border-red-600 hover:bg-red-100" onClick={removeMember}>
                  Remove Member
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
