"use client";

import { useAccount, useReadContract } from "wagmi";
import {
  ERC20_ABI,
  FUJI_DEPLOYMENT,
  SLP_ABI,
  type TokenMeta,
} from "@/lib/contracts";

// Auto-refresh balance reads every 5 s. Without this the SLPInventory and
// KpiStrip on /profile stay stuck on whatever wagmi cached at mount, since
// each component instantiates its own useReadContract — the local refetch()
// call inside DepositCard / VanillaDepositCard only refreshes that surface.
// 5 s is comfortable for a demo (~12 RPC calls/min across the page) and
// guarantees a deposit / mint / JIT tx is visible within one or two refresh
// ticks, even when the explicit invalidateQueries on tx success is missed.
const BALANCE_REFETCH_INTERVAL_MS = 5_000;

interface SLPBalance {
  deposited: bigint;
  withdrawn: bigint;
  pnlCredit: bigint;
  pnlDebit: bigint;
  /** Currently usable = deposited - withdrawn + pnlCredit - pnlDebit */
  available: bigint;
}

// Reads SLP balance for `address × token` directly from chain. No backend
// ledger involved — the SLP itself stores the 4-tuple per (user, token) pair.
export function useSLPBalance(token: TokenMeta) {
  const { address } = useAccount();
  const { data, isLoading, refetch } = useReadContract({
    address: FUJI_DEPLOYMENT.slp,
    abi: SLP_ABI,
    functionName: "balances",
    args: address ? [address, token.address] : undefined,
    query: {
      enabled: Boolean(address),
      refetchInterval: BALANCE_REFETCH_INTERVAL_MS,
    },
  });

  const balance: SLPBalance | undefined =
    data && Array.isArray(data)
      ? {
          deposited: data[0] as bigint,
          withdrawn: data[1] as bigint,
          pnlCredit: data[2] as bigint,
          pnlDebit: data[3] as bigint,
          available:
            (data[0] as bigint) -
            (data[1] as bigint) +
            (data[2] as bigint) -
            (data[3] as bigint),
        }
      : undefined;

  return { balance, isLoading, refetch };
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
