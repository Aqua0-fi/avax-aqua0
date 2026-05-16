"use client";

import { useAccount, useReadContract } from "wagmi";
import {
  ERC20_ABI,
  FUJI_DEPLOYMENT,
  SLP_ABI,
  type TokenMeta,
} from "@/lib/contracts";

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
    query: { enabled: Boolean(address) },
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
    query: { enabled: Boolean(address) },
  });
  return {
    balance: data as bigint | undefined,
    isLoading,
    refetch,
  };
}
