"use client";

// @refresh reset — see use-slp-balance.ts for the full rationale. Custom
// hooks whose internal hook count changes between edits crash Fast Refresh
// with "Rendered more hooks than during the previous render"; this pragma
// forces a full remount of consumers when this file changes.

import { useState } from "react";
import { parseGwei, parseUnits } from "viem";
import { useAccount, useConfig } from "wagmi";
import {
  getTransactionCount,
  writeContract,
  waitForTransactionReceipt,
} from "@wagmi/core";
import { useQueryClient } from "@tanstack/react-query";
import {
  AQUA0_STRATEGIES,
  FUJI_DEPLOYMENT,
  FULL_RANGE_TICKS,
  SLP_ABI,
  TOKENS,
  type Strategy,
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
//
// The contract signature is wider than you might expect: the SLP was
// originally designed for cross-chain liquidity, so every declaration
// carries an explicit `targetChainId` plus token0 / token1 addresses. For
// the Fuji-only demo we pass `targetChainId = FUJI_CHAIN_ID` (same chain).
export function useJitPreference() {
  const { address } = useAccount();
  const config = useConfig();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setPreference(strategy: Strategy, humanAmount: string) {
    if (!address) {
      setError("Connect a wallet first");
      return;
    }
    if (strategy.kind !== "aqua0") {
      setError("setPreference only applies to Aqua0 strategies");
      return;
    }
    setError(null);
    setIsPending(true);
    try {
      // V4 PoolKey sorts currency0 < currency1 by address. The SLP
      // expects the JIT declaration to match that order so token0 and
      // amount0 always refer to the lower-address currency.
      const usdcAddr = TOKENS.usdc.address;
      const latamAddr = strategy.token.address;
      const usdcIsToken0 = usdcAddr.toLowerCase() < latamAddr.toLowerCase();
      const token0 = usdcIsToken0 ? usdcAddr : latamAddr;
      const token1 = usdcIsToken0 ? latamAddr : usdcAddr;

      // 1:1 demo — both sides at the same human amount + same decimals.
      const amount = parseUnits(humanAmount, TOKENS.usdc.decimals);

      const nonce = await getTransactionCount(config, {
        address,
        chainId: FUJI_CHAIN_ID,
        blockTag: "pending",
      });
      const hash = await writeContract(config, {
        chainId: FUJI_CHAIN_ID,
        nonce,
        address: FUJI_DEPLOYMENT.slp,
        abi: SLP_ABI,
        functionName: "setJITPosition",
        args: [
          strategy.poolId,
          BigInt(FUJI_CHAIN_ID), // targetChainId — same chain in this demo
          FULL_RANGE_TICKS.tickLower,
          FULL_RANGE_TICKS.tickUpper,
          amount,
          amount,
          token0,
          token1,
        ],
        maxFeePerGas: MAX_FEE_PER_GAS,
        maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
      });
      await waitForTransactionReceipt(config, { hash });
      // Refresh every wagmi reader so the JIT inventory / KPI strip pick up
      // the new position instantly (the events are also surfaced via
      // refetchInterval as a backstop).
      await queryClient.invalidateQueries();
      return hash;
    } catch (err) {
      console.error("[useJitPreference] failed:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsPending(false);
    }
  }

  /** Convenience: declare the same amount across every surfaced Aqua0
   *  strategy — after the Twin-only simplification that's ARSt / BRLt /
   *  MXNt, all backed by one shared SLP deposit. */
  async function backAllLatamPools(humanAmount: string) {
    for (const strategy of AQUA0_STRATEGIES) {
      await setPreference(strategy, humanAmount);
    }
  }

  return { setPreference, backAllLatamPools, isPending, error };
}
