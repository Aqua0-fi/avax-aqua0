"use client";

import { parseAbiItem } from "viem";
import { useAccount, usePublicClient, useReadContract } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import {
  ERC20_ABI,
  FUJI_DEPLOYMENT,
  type TokenMeta,
} from "@/lib/contracts";
import { FUJI_CHAIN_ID } from "@/lib/wagmi";

// Auto-refresh balance reads every 5 s. Without this the SLPInventory and
// KpiStrip on /profile stay stuck on whatever was cached at mount, since
// each component instantiates its own hook — the local refetch() call inside
// DepositCard / VanillaDepositCard only refreshes that surface. 5 s is
// comfortable for a demo (~12 reads/min per token) and guarantees a
// deposit / mint / JIT tx is visible within one or two refresh ticks, even
// when the explicit invalidateQueries on tx success is missed.
const BALANCE_REFETCH_INTERVAL_MS = 5_000;

// The SharedLiquidityPool contract intentionally stores no per-user balance
// on-chain — only Deposited / Withdrawn events. We reconstruct the balance
// client-side by summing events for (user, token). Still 100 % on-chain:
// every input to this computation lives on the chain, no backend indexer in
// the middle.
const DEPOSITED_EVENT = parseAbiItem(
  "event Deposited(address indexed user, address indexed token, uint256 amount)",
);
const WITHDRAWN_EVENT = parseAbiItem(
  "event Withdrawn(address indexed user, address indexed token, uint256 amount, address destination)",
);

interface SLPBalance {
  deposited: bigint;
  withdrawn: bigint;
  // Kept for API compatibility with components that still read these — the
  // current contract has no on-chain PnL state, so they're always zero.
  pnlCredit: bigint;
  pnlDebit: bigint;
  /** Currently usable = deposited - withdrawn (clamped to zero). */
  available: bigint;
}

export function useSLPBalance(token: TokenMeta) {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: FUJI_CHAIN_ID });

  const query = useQuery<SLPBalance | undefined>({
    queryKey: ["slpBalance", token.address, address],
    enabled: Boolean(address) && Boolean(publicClient),
    refetchInterval: BALANCE_REFETCH_INTERVAL_MS,
    queryFn: async () => {
      if (!address || !publicClient) return undefined;
      // `fromBlock` is the SLP deploy block so we don't ask Fuji RPCs to
      // scan all of history. Topic filter on (user, token) makes this O(1)
      // for our demo's deposit volume — at most a handful of logs per
      // (user, token).
      const [deposits, withdrawals] = await Promise.all([
        publicClient.getLogs({
          address: FUJI_DEPLOYMENT.slp,
          event: DEPOSITED_EVENT,
          args: { user: address, token: token.address },
          fromBlock: FUJI_DEPLOYMENT.slpDeployBlock,
          toBlock: "latest",
        }),
        publicClient.getLogs({
          address: FUJI_DEPLOYMENT.slp,
          event: WITHDRAWN_EVENT,
          args: { user: address, token: token.address },
          fromBlock: FUJI_DEPLOYMENT.slpDeployBlock,
          toBlock: "latest",
        }),
      ]);
      const deposited = deposits.reduce<bigint>(
        (sum, log) => sum + (log.args.amount ?? 0n),
        0n,
      );
      const withdrawn = withdrawals.reduce<bigint>(
        (sum, log) => sum + (log.args.amount ?? 0n),
        0n,
      );
      const available = deposited > withdrawn ? deposited - withdrawn : 0n;
      return {
        deposited,
        withdrawn,
        pnlCredit: 0n,
        pnlDebit: 0n,
        available,
      };
    },
  });

  return {
    balance: query.data,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

export function useWalletBalance(token: TokenMeta) {
  const { address } = useAccount();
  const { data, isLoading, refetch } = useReadContract({
    address: token.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
      refetchInterval: BALANCE_REFETCH_INTERVAL_MS,
    },
  });
  return {
    balance: data as bigint | undefined,
    isLoading,
    refetch,
  };
}
