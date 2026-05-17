"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { useSLPBalance, useWalletBalance } from "@/hooks/use-slp-balance";
import type { Market } from "@/lib/contracts";
import { formatAmount } from "@/lib/utils";

// ============================================================================
// MarketCard — one FX market (ARS, BRL, MXN). Renders the two issuer routes
// (Ripio + Twin) side-by-side and shows both are backed by the same SLP
// deposit. This is the visual the pitch hinges on. Styled to match the
// production aqua0/web-app card aesthetic: solid #0d0d0d surface, tight
// 16px heading, badge with pulsing dot for the Aqua0 hook indicator.
// ============================================================================

export function MarketCard({ market }: { market: Market }) {
  return (
    <Link
      href={`/strategies/${market.code.toLowerCase()}`}
      className="group flex h-full flex-col rounded-xl border border-white/10 bg-card p-5 transition-colors hover:border-white/30"
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none">{market.flag}</span>
          <div>
            <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-white">
              {market.label}
            </h3>
            <p className="mt-0.5 text-[11px] text-white/50">
              {market.code} · USDC pair
            </p>
          </div>
        </div>
        <Badge label="Aqua0 hook" tone="aqua" pulse />
      </header>

      {/* ── Routes (Ripio | Twin) ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2.5">
        {market.routes.map((route) => (
          <RouteCell key={route.poolId} route={route} />
        ))}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
        <p className="text-[11.5px] leading-relaxed text-white/50">
          Both issuers · one SLP deposit
        </p>
        <span className="text-[12px] font-medium text-white/65 transition-colors group-hover:text-cyan">
          Open →
        </span>
      </div>
    </Link>
  );
}

// ─── A single Ripio or Twin route cell inside a market ─────────────────────
function RouteCell({ route }: { route: Market["routes"][number] }) {
  const { isConnected } = useAccount();
  const slp = useSLPBalance(route.token);
  const wallet = useWalletBalance(route.token);

  const issuerLabel = route.token.issuer === "ripio" ? "Ripio" : "Twin";

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{
              background: route.token.accent,
              boxShadow: `0 0 6px ${route.token.accent}88`,
            }}
          />
          <span className="text-[13px] font-semibold text-white">
            {route.token.symbol}
          </span>
        </div>
        <span className="text-[9px] uppercase tracking-[0.18em] text-white/40">
          {issuerLabel}
        </span>
      </div>

      <dl className="space-y-1.5">
        <Row
          label="SLP backing"
          value={
            isConnected
              ? formatAmount(slp.balance?.deposited, route.token.decimals, 0)
              : "100,000"
          }
          tint="cyan"
        />
        <Row
          label="Wallet"
          value={
            isConnected
              ? formatAmount(wallet.balance, route.token.decimals, 0)
              : "—"
          }
        />
      </dl>
    </div>
  );
}

function Row({
  label,
  value,
  tint = "white",
}: {
  label: string;
  value: string;
  tint?: "cyan" | "white";
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-[9.5px] uppercase tracking-[0.18em] text-white/40">
        {label}
      </dt>
      <dd
        className={
          tint === "cyan"
            ? "font-mono text-[12px] text-cyan"
            : "font-mono text-[12px] text-white/80"
        }
      >
        {value}
      </dd>
    </div>
  );
}

// ─── Aqua0 hook badge ───────────────────────────────────────────────────────
function Badge({
  label,
  tone,
  pulse,
}: {
  label: string;
  tone: "aqua" | "neutral";
  pulse?: boolean;
}) {
  const styles =
    tone === "aqua"
      ? "border-cyan/30 bg-cyan/10 text-cyan"
      : "border-white/10 bg-white/[0.04] text-white/70";
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
