"use client";

// @refresh reset — see use-slp-balance.ts for the full rationale.

import { useState } from "react";
import { parseGwei, keccak256, toBytes } from "viem";
import { useAccount, useConfig } from "wagmi";
import {
  getTransactionCount,
  writeContract,
  waitForTransactionReceipt,
} from "@wagmi/core";
import { useQueryClient } from "@tanstack/react-query";
import { FUJI_DEPLOYMENT, SWAP_SIMULATOR_ABI } from "@/lib/contracts";
import { FUJI_CHAIN_ID } from "@/lib/wagmi";

// Force EIP-1559 fees above the Fuji validator floor — same combo every
// other write hook uses. Idle Fuji reports baseFeePerGas = 1 wei, wallets
// estimate 2 wei, validators silently refuse to include the tx.
//
// Lower than the standard 50 gwei used in setJIT / deposit because this
// hook explicitly sets `gas: 8M` for a 25-swap batch — at 50 gwei MM
// would block any wallet with < 0.4 AVAX as "insufficient funds for gas",
// even though the actual cost is <0.001 AVAX on idle Fuji.
const MAX_FEE_PER_GAS = parseGwei("5");
const MAX_PRIORITY_FEE_PER_GAS = parseGwei("1");

// ────────────────────────────────────────────────────────────────────────────
// useRunSwaps — fires the SwapSimulator's `runBatch(count)` from the
// connected wallet. The simulator already holds its own token balance, so
// the caller doesn't need to faucet or approve anything; they just sign
// one tx and the contract loops the swaps internally.
//
// State machine:
//   idle    → pending → success | error
// The receipt is returned in full so the UI can list internal Swap event
// indexes for verification on Snowtrace.
// ────────────────────────────────────────────────────────────────────────────

export interface RunSwapsResult {
  hash: `0x${string}`;
  blockNumber: bigint;
  /** Number of Swap events emitted by PoolManager during this batch. */
  swapEventCount: number;
}

export function useRunSwaps() {
  const { address } = useAccount();
  const config = useConfig();
  const queryClient = useQueryClient();

  const [isPending, setIsPending] = useState(false);
  const [lastTx, setLastTx] = useState<RunSwapsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(count: number): Promise<RunSwapsResult | undefined> {
    if (!address) {
      setError("Connect a wallet first");
      return;
    }
    if (
      FUJI_DEPLOYMENT.swapSimulator ===
      "0x0000000000000000000000000000000000000000"
    ) {
      setError(
        "SwapSimulator not deployed yet — run DeploySwapSimulator.s.sol and paste the address",
      );
      return;
    }
    if (count <= 0 || count > 25 || count % 5 !== 0) {
      setError("count must be a multiple of 5 between 5 and 25");
      return;
    }
    setError(null);
    setIsPending(true);
    try {
      const nonce = await getTransactionCount(config, {
        address,
        chainId: FUJI_CHAIN_ID,
        blockTag: "pending",
      });

      const hash = await writeContract(config, {
        chainId: FUJI_CHAIN_ID,
        nonce,
        address: FUJI_DEPLOYMENT.swapSimulator,
        abi: SWAP_SIMULATOR_ABI,
        functionName: "runBatch",
        args: [count],
        maxFeePerGas: MAX_FEE_PER_GAS,
        maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
        // 25 swaps lands around ~5-6M gas (V4 swap + hook + settle ~200-
        // 250k each); 8M gives headroom without locking out wallets with
        // < 0.1 AVAX from signing.
        gas: 8_000_000n,
      });

      const receipt = await waitForTransactionReceipt(config, { hash });

      // Count internal Swap events emitted by PoolManager so the UI can
      // show "25 swaps observed on-chain". V4 declares Swap as:
      //   event Swap(bytes32 indexed id, address indexed sender, int128 ...)
      // PoolId is a `type PoolId is bytes32`, so the canonical sig matches.
      const SWAP_EVENT_TOPIC = keccak256(
        toBytes(
          "Swap(bytes32,address,int128,int128,uint160,uint128,int24,uint24)",
        ),
      );
      const swapEventCount = receipt.logs.filter(
        (log) =>
          log.address.toLowerCase() ===
            FUJI_DEPLOYMENT.poolManager.toLowerCase() &&
          log.topics[0]?.toLowerCase() === SWAP_EVENT_TOPIC.toLowerCase(),
      ).length;

      const result: RunSwapsResult = {
        hash,
        blockNumber: receipt.blockNumber,
        swapEventCount,
      };
      setLastTx(result);

      // Refresh the pool-stats query so the comparison panel jumps to
      // the new numbers immediately instead of waiting for the 10s
      // refetchInterval.
      await queryClient.invalidateQueries({ queryKey: ["poolStats"] });

      return result;
    } catch (err) {
      console.error("[useRunSwaps] failed:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsPending(false);
    }
  }

  return { run, isPending, lastTx, error };
}
