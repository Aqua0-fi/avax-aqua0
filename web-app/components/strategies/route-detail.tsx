"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Check, ExternalLink } from "lucide-react";
import { useAccount } from "wagmi";
import { useSLPBalance, useWalletBalance } from "@/hooks/use-slp-balance";
import type { MarketRoute } from "@/lib/contracts";
import { formatAmount } from "@/lib/utils";

const SNOWTRACE_TX = "https://testnet.snowtrace.io/address/";

// RouteDetail — the per-route card on /strategies/[code]. Deeper than the
// MarketCard summary on /strategies: shows pool config (fee, tick spacing),
// pool ID with copy + Snowtrace, and the LP-relevant balances (SLP backing
// vs wallet inventory).

export function RouteDetail({ route }: { route: MarketRoute }) {
  const { isConnected } = useAccount();
  const slp = useSLPBalance(route.token);
  const wallet = useWalletBalance(route.token);
  const [copied, setCopied] = useState(false);

  const issuerLabel = route.token.issuer === "ripio" ? "Ripio" : "Twin";
  // Short poolId for inline display — 6 + … + 4 mirrors the wallet pattern.
  const poolIdShort = `${route.poolId.slice(0, 6)}…${route.poolId.slice(-4)}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(route.poolId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard API can fail in restricted contexts */
    }
  }

  return (
    <article className="flex h-full flex-col rounded-xl border border-white/10 bg-card p-5 transition-colors hover:border-white/30">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="h-3 w-3 rounded-full"
            style={{
              background: route.token.accent,
              boxShadow: `0 0 8px ${route.token.accent}88`,
            }}
          />
          <div>
            <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-white">
              {route.token.symbol} / USDC
            </h3>
            <p className="mt-0.5 text-[11px] text-white/50">
              {issuerLabel} · Uniswap V4 · 0.30%
            </p>
          </div>
        </div>
        <Badge label="Aqua0 hook" tone="aqua" pulse />
      </header>

      {/* ── Pool ID ───────────────────────────────────────────────── */}
      <div className="mb-4 rounded-lg border border-white/[0.06] bg-white/[0.015] px-3.5 py-2.5">
        <div className="text-[9.5px] uppercase tracking-[0.22em] text-white/40">
          Pool ID
        </div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="font-mono text-[12px] text-white/80" title={route.poolId}>
            {poolIdShort}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => void handleCopy()}
              className="grid h-6 w-6 place-items-center rounded-md text-white/50 transition-colors hover:bg-white/[0.04] hover:text-white"
              aria-label="Copy pool ID"
            >
              {copied ? (
                <Check className="h-3 w-3 text-cyan" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
            <a
              href={`${SNOWTRACE_TX}${route.token.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="grid h-6 w-6 place-items-center rounded-md text-white/50 transition-colors hover:bg-white/[0.04] hover:text-white"
              aria-label="View token on Snowtrace"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      {/* ── Balance rows ─────────────────────────────────────────── */}
      <dl className="space-y-2.5">
        <BalanceRow
          label="SLP backing"
          value={
            isConnected
              ? formatAmount(slp.balance?.deposited, route.token.decimals, 0)
              : "100,000"
          }
          tint="cyan"
          hint="Capital you've deposited into the SLP, available to back this pool's swaps."
        />
        <BalanceRow
          label="Available now"
          value={
            isConnected
              ? formatAmount(slp.balance?.available, route.token.decimals, 0)
              : "100,000"
          }
          hint="Deposited − withdrawn ± realised PnL. Shrinks as JIT positions consume it during swaps."
        />
        <BalanceRow
          label="Wallet"
          value={
            isConnected
              ? formatAmount(wallet.balance, route.token.decimals, 0)
              : "—"
          }
          hint="ERC-20 balance outside the SLP. Mint more from /faucet."
        />
      </dl>

      {/* ── Pool config ───────────────────────────────────────────── */}
      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-4">
        <Metric label="Fee tier" value="0.30%" />
        <Metric label="Tick spacing" value="60" />
        <Metric label="Range" value="Full" />
      </div>

      {/* ── Footer CTAs ─────────────────────────────────────────── */}
      <div className="mt-5 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-4">
        <Link
          href="/profile"
          className="text-[12px] font-medium text-white/65 transition-colors hover:text-cyan"
        >
          Manage in profile →
        </Link>
        <Link
          href="/swap"
          className="rounded-lg bg-cyan px-3.5 py-1.5 text-[11px] font-semibold text-black transition-colors hover:bg-cyan-dim"
        >
          Trade
        </Link>
      </div>
    </article>
  );
}

function BalanceRow({
  label,
  value,
  tint = "white",
  hint,
}: {
  label: string;
  value: string;
  tint?: "cyan" | "white";
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3" title={hint}>
      <dt className="text-[10.5px] uppercase tracking-[0.18em] text-white/40">
        {label}
      </dt>
      <dd
        className={`text-right font-mono text-[13px] ${
          tint === "cyan" ? "text-cyan" : "text-white/80"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9.5px] uppercase tracking-[0.18em] text-white/40">
        {label}
      </div>
      <div className="mt-1 text-[13px] font-semibold text-white">{value}</div>
    </div>
  );
}

function Badge({
  label,
  tone,
  pulse,
}: {
  label: string;
  tone: "aqua";
  pulse?: boolean;
}) {
  const styles =
    tone === "aqua" ? "border-cyan/30 bg-cyan/10 text-cyan" : "";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${styles}`}
    >
      {pulse && (
        <span className="h-1 w-1 rounded-full bg-current shadow-[0_0_4px_currentColor]" />
      )}
      {label}
    </span>
  );
}
