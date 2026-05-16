"use client";

import { useAccount } from "wagmi";
import { useSLPBalance, useWalletBalance } from "@/hooks/use-slp-balance";
import { TOKEN_LIST, type TokenMeta } from "@/lib/contracts";
import { formatAmount } from "@/lib/utils";

// SLP inventory — one row per token the user holds in the SLP. Reads balance
// directly from the SLP contract via wagmi. Wallet balance is shown next to
// the deposited amount so the LP can see how much idle ERC20 they still
// have outside the SLP.
export function SLPInventory() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <h2 className="text-base font-bold">SLP inventory</h2>
        <span className="text-[10px] uppercase tracking-[0.22em] text-white/40">
          {TOKEN_LIST.length} assets
        </span>
      </header>

      <div className="hidden grid-cols-[1.4fr_1fr_1fr] border-b border-white/5 px-5 py-2 text-[10px] uppercase tracking-[0.22em] text-white/40 sm:grid">
        <span>Asset</span>
        <span className="text-right">In SLP</span>
        <span className="text-right">Wallet</span>
      </div>

      <ul>
        {TOKEN_LIST.map((token) => (
          <InventoryRow key={token.address} token={token} />
        ))}
      </ul>
    </div>
  );
}

function InventoryRow({ token }: { token: TokenMeta }) {
  const { isConnected } = useAccount();
  const slp = useSLPBalance(token);
  const wallet = useWalletBalance(token);

  return (
    <li className="grid grid-cols-[1.4fr_1fr_1fr] items-center gap-3 border-b border-white/5 px-5 py-3.5 text-sm last:border-0">
      <div className="flex items-center gap-3">
        <span
          className="h-3 w-3 rounded-full"
          style={{
            background: token.accent,
            boxShadow: `0 0 8px ${token.accent}66`,
          }}
        />
        <div className="flex flex-col leading-tight">
          <span className="text-[14px] font-semibold">{token.symbol}</span>
          <span className="text-[10.5px] text-white/40">
            {token.issuer === "anchor"
              ? "Anchor"
              : token.issuer === "ripio"
              ? "Ripio"
              : "Twin"}
          </span>
        </div>
      </div>
      <div className="text-right font-mono text-[13px] text-cyan">
        {isConnected
          ? formatAmount(slp.balance?.deposited, token.decimals, 2)
          : "—"}
      </div>
      <div className="text-right font-mono text-[13px] text-white/70">
        {isConnected
          ? formatAmount(wallet.balance, token.decimals, 2)
          : "—"}
      </div>
    </li>
  );
}
