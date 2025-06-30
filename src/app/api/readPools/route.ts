// src/app/api/readPools/route.ts

import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { bscTestnet } from "viem/chains";
import vaultAbi from "@/app/abi/vault.json";

const VAULT = process.env.NEXT_PUBLIC_VAULT_ADDRESS as `0x${string}`;

const client = createPublicClient({
  chain: bscTestnet,
  transport: http(),
});

export async function GET() {
  try {
    const pools = [];
    for (let i = 0; i < 5; i++) {
      const data = await client.readContract({
        address: VAULT,
        abi: vaultAbi,
        functionName: "pools",
        args: [BigInt(i)],
      });
      const [name, duration, fee, active, emergency] = data as any;
      if (active) {
        pools.push({ name, duration: Number(duration), fee: Number(fee), active });
      }
    }

    return NextResponse.json(pools);
  } catch (e) {
    console.error("Pool fetch failed:", e);
    return NextResponse.json([], { status: 500 });
  }
}
