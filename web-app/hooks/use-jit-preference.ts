"use client";

import { useState } from "react";
import { parseGwei, parseUnits } from "viem";
import { useAccount, useConfig } from "wagmi";
import { writeContract, waitForTransactionReceipt } from "@wagmi/core";
import {
  FUJI_DEPLOYMENT,
  FULL_RANGE_TICKS,
  SLP_ABI,
  TOKENS,
} from "@/lib/contracts";
import { FUJI_CHAIN_ID } from "@/lib/wagmi";

// Force EIP-1559 fees above Avalanche Fuji's validator floor — see the same
// note in use-mint.ts. Default wallet estimation lands at 2 wei because
// idle Fuji reports baseFeePerGas = 1 wei, and validators silently refuse
// to include such txs.
const MAX_FEE_PER_GAS = parseGwei("50");
const MAX_PRIORITY_FEE_PER_GAS = parseGwei("2");

// The "magic moment" of Aqua0 — the LP declares that their SLP capital
// should back a specific V4 pool. The Aqua0 hook reads this declaration
// at swap time and pulls just-in-time depth from the SLP.
//
// `setJITPosition` is an event-emitting authorisation on the SLP — the
// LP signs once per pool, on-chain. No off-chain signer, no API call,
// no orchestration server: the wallet writes directly to the SLP.
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
        chainId: FUJI_CHAIN_ID,
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
        maxFeePerGas: MAX_FEE_PER_GAS,
        maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
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
      FUJI_DEPLOYMENT.pools.arstUsdcAqua0,
      FUJI_DEPLOYMENT.pools.brltUsdcAqua0,
      FUJI_DEPLOYMENT.pools.mxntUsdcAqua0,
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
