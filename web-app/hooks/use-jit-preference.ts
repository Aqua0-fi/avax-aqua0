"use client";

import { useState } from "react";
import { parseUnits } from "viem";
import { useAccount, useConfig } from "wagmi";
import { writeContract, waitForTransactionReceipt } from "@wagmi/core";
import {
  FUJI_DEPLOYMENT,
  FULL_RANGE_TICKS,
  SLP_ABI,
  TOKENS,
} from "@/lib/contracts";

// The "magic moment" of Aqua0 — the LP declares that their SLP capital should
// back a specific V4 pool. The hook reads this declaration at swap time.
//
// `setJITPosition` is event-only on the SLP (no storage update — the hook
// derives its decisions from the event log via the backend signer). For the
// no-backend demo, we set the position once per pool the LP wants to back;
// the deployer signs JIT auths client-side at swap time.
export function useJitPreference() {
  const { address } = useAccount();
  const config = useConfig();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setPreference(args: {
    poolId: `0x${string}`;
    amount0Human: string;
    amount1Human: string;
    /** decimals must match token0 / token1 — all 6 in our LATAM-stable demo. */
    decimals0: number;
    decimals1: number;
  }) {
    if (!address) {
      setError("Connect a wallet first");
      return;
    }
    setError(null);
    setIsPending(true);
    try {
      const amount0 = parseUnits(args.amount0Human, args.decimals0);
      const amount1 = parseUnits(args.amount1Human, args.decimals1);

      const hash = await writeContract(config, {
        address: FUJI_DEPLOYMENT.slp,
        abi: SLP_ABI,
        functionName: "setJITPosition",
        args: [
          args.poolId,
          FULL_RANGE_TICKS.tickLower,
          FULL_RANGE_TICKS.tickUpper,
          amount0,
          amount1,
        ],
      });
      await waitForTransactionReceipt(config, { hash });
      return hash;
    } catch (err) {
      console.error("[useJitPreference] failed:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsPending(false);
    }
  }

  /** Convenience: declare the same amount across all six LATAM pools — three
   *  Ripio markets + three Twin markets — backed by one shared SLP deposit. */
  async function backAllLatamPools(humanAmount: string) {
    // All seven mocks are 6 decimals — keeps the demo math clean.
    const dec = TOKENS.usdc.decimals;
    const pools = [
      FUJI_DEPLOYMENT.pools.warsUsdcAqua0,
      FUJI_DEPLOYMENT.pools.wbrlUsdcAqua0,
      FUJI_DEPLOYMENT.pools.wmxnUsdcAqua0,
      FUJI_DEPLOYMENT.pools.nuarsUsdcAqua0,
      FUJI_DEPLOYMENT.pools.nubrlUsdcAqua0,
      FUJI_DEPLOYMENT.pools.numxnUsdcAqua0,
    ];
    for (const poolId of pools) {
      await setPreference({
        poolId,
        amount0Human: humanAmount,
        amount1Human: humanAmount,
        decimals0: dec,
        decimals1: dec,
      });
    }
  }

  return { setPreference, backAllLatamPools, isPending, error };
}
