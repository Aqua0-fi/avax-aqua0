"use client";

import { useAccount } from "wagmi";
import { useSLPBalance } from "@/hooks/use-slp-balance";
import { useWalletBalance } from "@/hooks/use-slp-balance";
import type { Market } from "@/lib/contracts";
import { formatAmount } from "@/lib/utils";

// ============================================================================
// MarketCard — one FX market (ARS, BRL, MXN). Renders the two issuer routes
// (Ripio + Twin) side-by-side and shows that both are backed by the same SLP
// deposit. This is the visual the pitch hinges on.
// ============================================================================

export function MarketCard({ market }: { market: Market }) {
  return (
    <article className="rounded-2xl border border-cyan/30 bg-cyan/[0.04] p-6 backdrop-blur-sm">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none">{market.flag}</span>
          <div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-cyan">
              {market.code} market
            </div>
            <h3 className="text-lg font-bold tracking-tight">
              {market.label}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-cyan/30 bg-black/40 px-2.5 py-1 text-[9.5px] uppercase tracking-[0.22em] text-cyan">
          <span className="h-1 w-1 rounded-full bg-cyan cyan-glow" />
          Aqua0 hook
        </div>
      </header>

      {/* ── Routes (Ripio | Twin) ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {market.routes.map((route) => (
          <RouteCell key={route.poolId} route={route} />
        ))}
      </div>

      {/* ── Footnote ────────────────────────────────────────────────────── */}
      <p className="mt-4 text-[11px] leading-relaxed text-cyan/65">
        Both issuers share the same SLP deposit. No need to pick — your
        capital backs <span className="text-cyan">both</span> at once.
      </p>
    </article>
  );
}

// ─── A single Ripio or Twin route card inside a market ─────────────────────
function RouteCell({ route }: { route: Market["routes"][number] }) {
  const { isConnected } = useAccount();
  const slp = useSLPBalance(route.token);
  const wallet = useWalletBalance(route.token);

  const issuerLabel =
    route.token.issuer === "ripio" ? "Ripio" : "Twin";

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{
              background: route.token.accent,
              boxShadow: `0 0 8px ${route.token.accent}88`,
            }}
          />
          <span className="text-sm font-semibold">
            {route.token.symbol} / USDC
          </span>
        </div>
        <span className="text-[9px] uppercase tracking-[0.22em] text-white/40">
          {issuerLabel}
        </span>
      </div>

      <dl className="space-y-1 text-[12px]">
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
          label="Your wallet"
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
      <dt className="text-[10px] uppercase tracking-[0.18em] text-white/40">
        {label}
      </dt>
      <dd
        className={
          tint === "cyan"
            ? "font-mono text-[12px] text-cyan"
            : "font-mono text-[12px] text-white/85"
        }
      >
        {value}
      </dd>
    </div>
  );
}
