"use client";

// @refresh reset — see use-slp-balance.ts for the full rationale.

import { parseAbiItem } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import {
  FUJI_DEPLOYMENT,
  STRATEGIES,
  TOKEN_LIST,
  type Strategy,
  type TokenMeta,
} from "@/lib/contracts";
import { FUJI_CHAIN_ID } from "@/lib/wagmi";

// Active JIT declarations are reconstructed from the JITPositionSet log
// stream. The SLP contract emits this every time an LP calls
// setJITPosition; if they later redeclare for the same (lp, poolId), the
// newer event wins. We collapse the stream to "latest per poolId" so the
// UI shows one row per Aqua0 strategy the LP is currently backing.
//
// Notes:
//   * removeJITPosition isn't surfaced by the frontend yet, so any seen
//     JITPositionSet is treated as still active.
//   * Positions for pool IDs that aren't in STRATEGIES (e.g. the 3 Ripio
//     Aqua0 pools we deployed but don't surface) are still returned —
//     the consumer decides whether to render them.

const JIT_POSITION_SET_EVENT = parseAbiItem(
  "event JITPositionSet(address indexed lp, bytes32 indexed poolId, uint256 indexed sourceChainId, uint256 targetChainId, int24 tickLower, int24 tickUpper, uint256 amount0, uint256 amount1, address token0, address token1)",
);

const POSITIONS_REFETCH_INTERVAL_MS = 5_000;

export interface JitPosition {
  poolId: `0x${string}`;
  /** Matching frontend strategy if we surface this pool, else null. */
  strategy: Strategy | null;
  /** The two token metas in V4-sorted order (token0 < token1 by address). */
  token0: TokenMeta;
  token1: TokenMeta;
  amount0: bigint;
  amount1: bigint;
  tickLower: number;
  tickUpper: number;
  targetChainId: number;
  blockNumber: bigint;
  txHash: `0x${string}`;
}

export function useJitPositions() {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: FUJI_CHAIN_ID });

  const query = useQuery<JitPosition[]>({
    queryKey: ["jitPositions", address],
    enabled: Boolean(address) && Boolean(publicClient),
    refetchInterval: POSITIONS_REFETCH_INTERVAL_MS,
    queryFn: async () => {
      if (!address || !publicClient) return [];

      const logs = await publicClient.getLogs({
        address: FUJI_DEPLOYMENT.slp,
        event: JIT_POSITION_SET_EVENT,
        args: { lp: address },
        fromBlock: FUJI_DEPLOYMENT.slpDeployBlock,
        toBlock: "latest",
      });

      // Collapse by poolId, keeping the highest-block declaration. We
      // also dedupe by (block, logIndex) implicitly because getLogs
      // returns ordered logs.
      const latestByPool = new Map<string, (typeof logs)[number]>();
      for (const log of logs) {
        const poolId = log.args.poolId;
        if (!poolId) continue;
        const existing = latestByPool.get(poolId);
        if (
          !existing ||
          (log.blockNumber ?? 0n) > (existing.blockNumber ?? 0n)
        ) {
          latestByPool.set(poolId, log);
        }
      }

      // Resolve each event into a richer JitPosition using STRATEGIES +
      // TOKEN_LIST. If a token isn't in TOKEN_LIST we skip the row
      // (shouldn't happen on the Twin-only demo, but guards against
      // historic Ripio JIT positions if a future user replays them).
      const tokenByAddr = new Map<string, TokenMeta>();
      for (const t of TOKEN_LIST)
        tokenByAddr.set(t.address.toLowerCase(), t);

      const positions: JitPosition[] = [];
      for (const log of latestByPool.values()) {
        const a = log.args;
        if (
          !a.poolId ||
          !a.token0 ||
          !a.token1 ||
          a.amount0 === undefined ||
          a.amount1 === undefined ||
          a.tickLower === undefined ||
          a.tickUpper === undefined ||
          a.targetChainId === undefined
        )
          continue;

        const t0 = tokenByAddr.get(a.token0.toLowerCase());
        const t1 = tokenByAddr.get(a.token1.toLowerCase());
        if (!t0 || !t1) continue;

        const strategy =
          STRATEGIES.find((s) => s.poolId === a.poolId) ?? null;

        positions.push({
          poolId: a.poolId,
          strategy,
          token0: t0,
          token1: t1,
          amount0: a.amount0,
          amount1: a.amount1,
          tickLower: a.tickLower,
          tickUpper: a.tickUpper,
          targetChainId: Number(a.targetChainId),
          blockNumber: log.blockNumber ?? 0n,
          txHash: log.transactionHash,
        });
      }

      // Stable-sort by declaration order (oldest first) so the demo
      // narrative — "I backed twin-arst, then brlt, then mxnt" — reads
      // top to bottom.
      positions.sort((a, b) =>
        a.blockNumber === b.blockNumber
          ? 0
          : a.blockNumber < b.blockNumber
            ? -1
            : 1,
      );

      return positions;
    },
  });

  return {
    positions: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
