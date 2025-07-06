// ✅ /api/pools/route.ts - Get all pools with TVL, profit, etc
import { NextResponse } from "next/server";
import { createPublicClient, http, formatUnits } from "viem";
import { bscTestnet } from "viem/chains";
import vaultAbi from "@/app/abi/vault.json";

const client = createPublicClient({ chain: bscTestnet, transport: http() });
const VAULT = process.env.NEXT_PUBLIC_VAULT_ADDRESS as `0x${string}`;
const DECIMALS = 18;

export async function GET() {
  try {
    const poolCount = await client.readContract({
      address: VAULT,
      abi: vaultAbi,
      functionName: "poolCount",
    }) as bigint;

    const poolPromises = [];
    for (let i = 0n; i < poolCount; i++) {
      poolPromises.push(
        client.readContract({
          address: VAULT,
          abi: vaultAbi,
          functionName: "pools",
          args: [i],
        }).then(async (res: any) => {
          const tvl = await client.readContract({
            address: VAULT,
            abi: vaultAbi,
            functionName: "getPoolTVL",
            args: [i],
          });

          return {
            id: Number(i),
            name: res[0],
            duration: Number(res[1]),
            fee: Number(res[2]),
            active: res[3],
            totalDeposited: formatUnits(res[4], DECIMALS),
            totalWithdrawn: formatUnits(res[5], DECIMALS),
            totalProfit: formatUnits(res[6], DECIMALS),
            capitalSentOut: formatUnits(res[7], DECIMALS),
            currentTVL: formatUnits(tvl as bigint, DECIMALS),
          };
        })
      );
    }

    const pools = await Promise.all(poolPromises);
    return NextResponse.json(pools);
  } catch (e) {
    console.error("Failed to load pools:", e);
    return NextResponse.json({ error: "Failed to load pools" }, { status: 500 });
  }
}