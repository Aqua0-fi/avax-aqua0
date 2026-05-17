"use client";

// @refresh reset — see use-slp-balance.ts for the full rationale on why
// every custom hook in this app carries this pragma.

import { parseAbiItem } from "viem";
import { usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import {
  FUJI_DEPLOYMENT,
  STRATEGIES,
  TOKENS,
  type Strategy,
} from "@/lib/contracts";
import { FUJI_CHAIN_ID } from "@/lib/wagmi";

// ────────────────────────────────────────────────────────────────────────────
// Per-pool swap activity, read straight from PoolManager.Swap event logs.
//
// Powers the /swap "fees earned" comparison panel — the only place the demo
// quantifies the SLP pitch: same $20k of LP capital backing 3 Twin Aqua0
// pools earns fees from all three simultaneously, vs the same $20k split
// across 2 vanilla pools earning only from those two. The numbers come
// from a real `forge script SimulateSwaps` run, not mocks.
//
// Math:
//   - volume_usd ≈ (|amount0| + |amount1|) / 2 / 10^USDC_DECIMALS
//     This holds because all 6 surfaced tokens are 6-decimal mocks pegged
//     1:1 to USD in the demo. Real deployments would multiply by the
//     non-USDC token's price feed.
//   - fees_usd  = volume_usd * (fee / 1_000_000)
//     V4 emits `fee` in hundredths of a bip, e.g. 3000 = 0.30%.
// ────────────────────────────────────────────────────────────────────────────

const SWAP_EVENT = parseAbiItem(
  "event Swap(bytes32 indexed id, address indexed sender, int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee)",
);

const POOL_STATS_REFETCH_INTERVAL_MS = 10_000;

export interface PoolStats {
  strategy: Strategy;
  swapCount: number;
  volumeUsd: number;
  feesUsd: number;
}

export interface PoolStatsGroup {
  /** Sum of `feesUsd` across the group. */
  totalFeesUsd: number;
  /** Sum of `volumeUsd` across the group. */
  totalVolumeUsd: number;
  /** Sum of `swapCount` across the group. */
  totalSwaps: number;
  /** Per-pool breakdown so the UI can list contributing strategies. */
  pools: PoolStats[];
}

export interface PoolStatsReport {
  aqua0: PoolStatsGroup;
  vanilla: PoolStatsGroup;
}

/**
 * Reads Swap events for every surfaced strategy and groups the stats into
 * Aqua0 (SLP-backed) vs vanilla (traditional V4) buckets. The two groups
 * are what the comparison panel renders side-by-side.
 *
 * Single `getLogs` call against the PoolManager, no per-pool roundtrips —
 * filtering happens client-side via a poolId map.
 */
export function usePoolStats() {
  const publicClient = usePublicClient({ chainId: FUJI_CHAIN_ID });

  const query = useQuery<PoolStatsReport>({
    queryKey: ["poolStats"],
    enabled: Boolean(publicClient),
    refetchInterval: POOL_STATS_REFETCH_INTERVAL_MS,
    queryFn: async () => {
      if (!publicClient) return emptyReport();

      // One big query for the PoolManager, no `args` filter. We do the
      // poolId match in JS — 5 surfaced poolIds vs the indexed `id`
      // topic means the RPC would otherwise need 5 round trips.
      const logs = await publicClient.getLogs({
        address: FUJI_DEPLOYMENT.poolManager,
        event: SWAP_EVENT,
        fromBlock: FUJI_DEPLOYMENT.slpDeployBlock,
        toBlock: "latest",
      });

      // Index strategies by lowercase poolId for the loop below.
      const strategyByPool = new Map<string, Strategy>();
      for (const s of STRATEGIES) {
        strategyByPool.set(s.poolId.toLowerCase(), s);
      }

      // Per-pool tally.
      const tally = new Map<
        string,
        { strategy: Strategy; swapCount: number; volumeUsd: number; feesUsd: number }
      >();

      for (const log of logs) {
        const id = log.args.id;
        if (!id) continue;
        const strategy = strategyByPool.get(id.toLowerCase());
        if (!strategy) continue; // ignore the 3 hidden Ripio Aqua0 pools

        const a0 = log.args.amount0 ?? 0n;
        const a1 = log.args.amount1 ?? 0n;
        const fee = log.args.fee ?? 0;

        const absVolumeUnits = abs(a0) + abs(a1); // sum of both legs
        // Divide by 2 to get one-sided volume (the trade was the same
        // size on both sides modulo the fee), then by 10^USDC_DECIMALS
        // to get a USD number. JS Number is fine — at 1M USD volumes
        // we're well below 2^53.
        const volumeUsd =
          Number(absVolumeUnits) / 2 / Math.pow(10, TOKENS.usdc.decimals);
        const feesUsd = (volumeUsd * fee) / 1_000_000;

        const existing = tally.get(strategy.id);
        if (existing) {
          existing.swapCount += 1;
          existing.volumeUsd += volumeUsd;
          existing.feesUsd += feesUsd;
        } else {
          tally.set(strategy.id, {
            strategy,
            swapCount: 1,
            volumeUsd,
            feesUsd,
          });
        }
      }

      // Project per-pool tallies into a PoolStats[] in STRATEGIES order so
      // the UI rows are stable across renders.
      const allPools: PoolStats[] = STRATEGIES.map((s) => {
        const t = tally.get(s.id);
        return {
          strategy: s,
          swapCount: t?.swapCount ?? 0,
          volumeUsd: t?.volumeUsd ?? 0,
          feesUsd: t?.feesUsd ?? 0,
        };
      });

      const aqua0Pools = allPools.filter((p) => p.strategy.kind === "aqua0");
      const vanillaPools = allPools.filter(
        (p) => p.strategy.kind === "vanilla",
      );

      return {
        aqua0: groupOf(aqua0Pools),
        vanilla: groupOf(vanillaPools),
      };
    },
  });

  return {
    report: query.data ?? emptyReport(),
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

// ─── helpers ──────────────────────────────────────────────────────────────

function abs(n: bigint): bigint {
  return n < 0n ? -n : n;
}

function groupOf(pools: PoolStats[]): PoolStatsGroup {
  return {
    pools,
    totalFeesUsd: pools.reduce((s, p) => s + p.feesUsd, 0),
    totalVolumeUsd: pools.reduce((s, p) => s + p.volumeUsd, 0),
    totalSwaps: pools.reduce((s, p) => s + p.swapCount, 0),
  };
}

function emptyReport(): PoolStatsReport {
  const emptyPools = (kind: "aqua0" | "vanilla"): PoolStats[] =>
    STRATEGIES.filter((s) => s.kind === kind).map((s) => ({
      strategy: s,
      swapCount: 0,
      volumeUsd: 0,
      feesUsd: 0,
    }));

  return {
    aqua0: groupOf(emptyPools("aqua0")),
    vanilla: groupOf(emptyPools("vanilla")),
  };
}
