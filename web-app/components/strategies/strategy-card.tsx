"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { useSLPBalance, useWalletBalance } from "@/hooks/use-slp-balance";
import { LiquidityAtlas } from "@/components/strategies/liquidity-atlas";
import type { Strategy } from "@/lib/contracts";
import { formatAmount } from "@/lib/utils";

// ============================================================================
// StrategyCard — one row in the /strategies marketplace grid. A "strategy"
// is a single pool (USDC ↔ one stable). Both Aqua0-hooked and vanilla
// baselines render through this component; styling diverges by kind so the
// aqua0 strategies feel like the upgrade and the vanilla ones feel like
// comparison furniture.
//
// Whole card is a Link into /strategies/[id].
// ============================================================================

export function StrategyCard({ strategy }: { strategy: Strategy }) {
  const { isConnected } = useAccount();
  const slp = useSLPBalance(strategy.token);
  const wallet = useWalletBalance(strategy.token);

  const isAqua = strategy.kind === "aqua0";
  const issuerLabel =
    strategy.issuer === "ripio"
      ? "Ripio"
      : strategy.issuer === "twin"
      ? "Twin"
      : "Vanilla";

  return (
    <Link
      href={`/strategies/${strategy.id}`}
      className={`group flex h-full flex-col rounded-xl border p-5 transition-colors ${
        isAqua
          ? "border-white/10 bg-card hover:border-white/30"
          : "border-white/10 bg-white/[0.015] hover:border-white/25"
      }`}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`h-3 w-3 rounded-full ${isAqua ? "" : "opacity-60"}`}
            style={{
              background: strategy.token.accent,
              boxShadow: isAqua ? `0 0 8px ${strategy.token.accent}88` : undefined,
            }}
          />
          <div>
            <h3
              className={`text-[16px] font-semibold tracking-[-0.01em] ${
                isAqua ? "text-white" : "text-white/85"
              }`}
            >
              {strategy.token.symbol} / USDC
            </h3>
            <p className="mt-0.5 text-[11px] text-white/50">
              <span>{strategy.marketFlag} {strategy.marketLabel}</span>
              <span className="text-white/30"> · </span>
              <span>{issuerLabel}</span>
            </p>
          </div>
        </div>
        {isAqua ? (
          <Badge label="Aqua0 hook" tone="aqua" pulse />
        ) : (
          <Badge label="Hook · None" tone="dim" />
        )}
      </header>

      {/* ── Liquidity atlas — kind-appropriate variant ──────────────── */}
      <div className="mb-4">
        <LiquidityAtlas
          variant={isAqua ? "aqua0" : "vanilla"}
          size="sm"
          showLegend={false}
        />
      </div>

      {/* ── Balances ────────────────────────────────────────────────── */}
      <dl className="space-y-1.5">
        <Row
          label={isAqua ? "SLP backing" : "Seeded"}
          value={
            isAqua
              ? isConnected
                ? formatAmount(slp.balance?.deposited, strategy.token.decimals, 0)
                : "100,000"
              : "100,000"
          }
          tint={isAqua ? "cyan" : "muted"}
        />
        <Row
          label="Wallet"
          value={
            isConnected
              ? formatAmount(wallet.balance, strategy.token.decimals, 0)
              : "—"
          }
        />
      </dl>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
        <Metric
          label="Fee · 30d"
          value={isAqua ? "$72 (mocked)" : "$12"}
        />
        <span
          className={`text-[12px] font-medium transition-colors ${
            isAqua
              ? "text-white/65 group-hover:text-cyan"
              : "text-white/55 group-hover:text-white"
          }`}
        >
          Open →
        </span>
      </div>
    </Link>
  );
}

function Row({
  label,
  value,
  tint = "white",
}: {
  label: string;
  value: string;
  tint?: "cyan" | "white" | "muted";
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
            : tint === "muted"
            ? "font-mono text-[12px] text-white/60"
            : "font-mono text-[12px] text-white/80"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1.5 text-[11px]">
      <span className="uppercase tracking-[0.18em] text-white/40">{label}</span>
      <span className="font-mono text-white/65">{value}</span>
    </span>
  );
}

function Badge({
  label,
  tone,
  pulse,
}: {
  label: string;
  tone: "aqua" | "dim";
  pulse?: boolean;
}) {
  const styles =
    tone === "aqua"
      ? "border-cyan/30 bg-cyan/10 text-cyan"
      : "border-white/10 bg-white/[0.02] text-white/55";
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
