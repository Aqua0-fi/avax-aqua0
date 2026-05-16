"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { shortAddr } from "@/lib/utils";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:border-cyan/60 hover:text-cyan"
      >
        {shortAddr(address)}
      </button>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: injected() })}
      disabled={isPending}
      className="rounded-full bg-cyan px-5 py-2 text-sm font-semibold text-black transition hover:-translate-y-px hover:bg-cyan-dim disabled:opacity-60 disabled:hover:translate-y-0 cyan-glow"
    >
      {isPending ? "Connecting…" : "Connect wallet"}
    </button>
  );
}
