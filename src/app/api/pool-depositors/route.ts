import { NextResponse } from "next/server";
import { createPublicClient, http, parseAbi } from "viem";
import { bscTestnet } from "viem/chains";
import vaultAbi from "@/app/abi/vault.json";

const VAULT = process.env.NEXT_PUBLIC_VAULT_ADDRESS as `0x${string}`;

const client = createPublicClient({
  chain: bscTestnet,
  transport: http(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const poolId = Number(searchParams.get("poolId"));
  if (isNaN(poolId)) return NextResponse.json([], { status: 400 });

  // Optional: list known test users (can be replaced with database or indexing later)
  const testUsers = [
    "0x69a50f7C9EAA7159Dae197CafBb0BaC032BD2762", // replace with full address
    // Add more test addresses if needed
  ];

  const result: { address: string; amount: number }[] = [];

  for (const addr of testUsers) {
    try {
      const deposits = await client.readContract({
        address: VAULT,
        abi: vaultAbi,
        functionName: "getUserDeposits",
        args: [addr],
      }) as {
        amount: bigint;
        unlockTime: bigint;
        poolId: bigint;
      }[];

      const total = deposits
        .filter((d) => Number(d.poolId) === poolId)
        .reduce((sum, d) => sum + Number(d.amount), 0);

      if (total > 0) {
        result.push({ address: addr, amount: total / 10 ** 18 });
      }
    } catch (err) {
      console.error("Failed for", addr);
    }
  }

  return NextResponse.json(result);
}
