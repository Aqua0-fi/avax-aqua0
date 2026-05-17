"use client";

import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { FUJI_CHAIN_ID } from "@/lib/wagmi";

// ChainGuard — sticky banner that surfaces when the connected wallet is on
// a chain other than Avalanche Fuji. Without this you get the silent-mint
// failure mode: wallet signs locally and returns a hash, broadcast goes to
// the wrong network or fails entirely, and the UI spins on 'Minting…'
// forever because the receipt poll on Fuji never finds anything.
//
// Rendered globally inside Providers so every page gets the safety belt.

export function ChainGuard() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected) return null;
  if (chainId === FUJI_CHAIN_ID) return null;

  return (
    <div className="sticky top-16 z-40 border-b border-amber-400/30 bg-amber-500/[0.08] backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 text-[12.5px] sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_#fbbf24]" />
          <span className="text-amber-100">
            Your wallet is on chain{" "}
            <span className="font-mono text-amber-200">{chainId}</span>. Aqua0
            on Avalanche only works on Fuji (43113).
          </span>
        </div>
        <button
          onClick={() => switchChain({ chainId: FUJI_CHAIN_ID })}
          disabled={isPending}
          className="shrink-0 rounded-lg bg-amber-300 px-3.5 py-1.5 text-[12px] font-semibold text-black transition-colors hover:bg-amber-200 disabled:opacity-50"
        >
          {isPending ? "Switching…" : "Switch to Fuji"}
        </button>
      </div>
    </div>
  );
}
