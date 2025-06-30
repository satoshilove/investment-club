// src/pages/api/readPool.ts
import { NextApiRequest, NextApiResponse } from "next";
import { createPublicClient, http } from "viem";
import { bscTestnet } from "viem/chains";
import vaultAbi from "@/app/abi/vault.json";

const client = createPublicClient({
  chain: bscTestnet,
  transport: http(),
});

const VAULT = process.env.NEXT_PUBLIC_VAULT_ADDRESS!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const idParam = req.query.id;
  const id = typeof idParam === "string" ? Number(idParam) : NaN;

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid pool ID" });
  }

  try {
    const data = await client.readContract({
      address: VAULT as `0x${string}`,
      abi: vaultAbi,
      functionName: "pools",
      args: [BigInt(id)],
    });

    if (!data || !Array.isArray(data)) {
      return res.status(500).json({ error: "Empty pool data" });
    }

    const [name, duration, fee, active, emergency, totalDeposited, totalProfit] = data as any;

    res.status(200).json({
      name: name || "Unnamed",
      duration: duration?.toString() ?? "0",
      fee: fee?.toString() ?? "0",
      active: Boolean(active),
      emergency: Boolean(emergency),
      totalDeposited: totalDeposited?.toString() ?? "0",
      totalProfit: totalProfit?.toString() ?? "0",
    });
  } catch (e: any) {
    console.error("readPool error:", e);
    res.status(500).json({ error: "Failed to fetch pool" });
  }
}
