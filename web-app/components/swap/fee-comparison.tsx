"use client";

import { DotMark } from "@/components/dot-mark";
import { usePoolStats, type PoolStats, type PoolStatsGroup } from "@/hooks/use-pool-stats";

// ────────────────────────────────────────────────────────────────────────────
// FeeComparison — the demo's single quantitative panel.
//
// Reads PoolManager.Swap events for the 5 surfaced pools (3 Twin Aqua0 + 2
// Ripio vanilla) and shows the fees each side earned. The pitch is in the
// totals: the SLP side backs MORE pools with the SAME LP capital, so it
// captures fees across a wider surface. No SLAC jargon in the UI —
// "Pools tradicionales vs Pools con SLP" is the framing.
//
// Data source: a real `forge script SimulateSwaps` run that the deployer
// kicks off pre-demo to seed swap activity. Not mocks.
// ────────────────────────────────────────────────────────────────────────────

export function FeeComparison() {
  const { report, isLoading } = usePoolStats();

  const lead = computeLead(report.aqua0.totalFeesUsd, report.vanilla.totalFeesUsd);
  const noData =
    !isLoading &&
    report.aqua0.totalSwaps === 0 &&
    report.vanilla.totalSwaps === 0;

  return (
    <section>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="mb-5">
        <div className="mb-3 inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.3em] text-white/60">
          <DotMark />
          Fees earned, live from on-chain Swap events
        </div>
        <h2 className="max-w-[780px] text-[clamp(24px,3.2vw,36px)] font-bold leading-[1.05] tracking-[-0.025em] text-white">
          Same $20k of LP capital.{" "}
          <span className="text-white/35">Different</span>{" "}
          surface of pools earning fees.
        </h2>
        <p className="mt-3 max-w-[680px] text-[13.5px] leading-[1.55] text-white/55">
          The traditional LP splits their capital across 2 vanilla pools. The
          Aqua0 LP deposits once into the SLP, then backs the 3 Twin Aqua0
          pools — every swap on any of them routes against that same capital.
          Numbers below come straight from{" "}
          <code className="rounded bg-white/[0.05] px-1 py-0.5 text-[12px] text-white/75">
            PoolManager.Swap
          </code>{" "}
          logs.
        </p>
      </div>

      {/* ── Side-by-side groups ────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SideCard
          variant="vanilla"
          eyebrow="Pools tradicionales"
          subtitle="2 vanilla V4 pools · no hook"
          group={report.vanilla}
          loading={isLoading}
        />
        <SideCard
          variant="aqua0"
          eyebrow="Pools con SLP"
          subtitle="3 Twin Aqua0 pools · backed by SLP"
          group={report.aqua0}
          loading={isLoading}
          highlight={lead === "aqua0" ? formatMultiplier(report) : undefined}
        />
      </div>

      {/* ── Footnote ───────────────────────────────────────────────── */}
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11.5px] text-white/45">
        <span>
          {report.aqua0.totalSwaps + report.vanilla.totalSwaps} swaps observed
        </span>
        <span className="text-white/20">·</span>
        <span>
          ${formatUsd(report.aqua0.totalVolumeUsd + report.vanilla.totalVolumeUsd)} cumulative volume
        </span>
        <span className="text-white/20">·</span>
        <span>Fee tier 0.30% across all pools</span>
        {noData && (
          <>
            <span className="text-white/20">·</span>
            <span className="text-amber-300/70">
              No swaps yet — run{" "}
              <code className="rounded bg-white/[0.05] px-1 py-0.5 text-[11px]">
                forge script SimulateSwaps
              </code>{" "}
              to seed activity
            </span>
          </>
        )}
      </div>
    </section>
  );
}

// ─── Side card ────────────────────────────────────────────────────────────

function SideCard({
  variant,
  eyebrow,
  subtitle,
  group,
  loading,
  highlight,
}: {
  variant: "aqua0" | "vanilla";
  eyebrow: string;
  subtitle: string;
  group: PoolStatsGroup;
  loading: boolean;
  highlight?: string;
}) {
  const isAqua = variant === "aqua0";
  return (
    <div
      className={
        isAqua
          ? "relative overflow-hidden rounded-2xl border border-cyan/30 bg-cyan/[0.04] p-6"
          : "rounded-2xl border border-white/10 bg-white/[0.015] p-6"
      }
    >
      {/* ── Eyebrow + multiplier badge ──────────────────────────────── */}
      <div className="mb-1 flex items-center justify-between gap-3">
        <div
          className={`text-[10px] uppercase tracking-[0.28em] ${
            isAqua ? "text-cyan" : "text-white/40"
          }`}
        >
          {eyebrow}
        </div>
        {highlight && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan/35 bg-cyan/[0.08] px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-cyan">
            {highlight} fees
          </span>
        )}
      </div>
      <h3
        className={`text-[20px] font-semibold tracking-[-0.015em] ${
          isAqua ? "text-white" : "text-white/85"
        }`}
      >
        {subtitle}
      </h3>

      {/* ── Big number ──────────────────────────────────────────────── */}
      <div className="mt-5">
        <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">
          Fees earned
        </div>
        <div
          className={`mt-1 font-mono text-[42px] font-bold leading-none tracking-[-0.02em] ${
            isAqua ? "text-cyan" : "text-white/85"
          }`}
        >
          {loading ? "—" : `$${formatUsd(group.totalFeesUsd)}`}
        </div>
        <div className="mt-1.5 text-[11.5px] text-white/45">
          {group.totalSwaps} swaps · ${formatUsd(group.totalVolumeUsd)} volume
        </div>
      </div>

      {/* ── Per-pool breakdown ──────────────────────────────────────── */}
      <ul className="mt-5 space-y-2 border-t border-white/[0.06] pt-4">
        {group.pools.map((p) => (
          <PoolRow key={p.strategy.id} pool={p} variant={variant} />
        ))}
      </ul>
    </div>
  );
}

function PoolRow({
  pool,
  variant,
}: {
  pool: PoolStats;
  variant: "aqua0" | "vanilla";
}) {
  const isAqua = variant === "aqua0";
  const { strategy, swapCount, feesUsd } = pool;
  return (
    <li className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{
            background: strategy.token.accent,
            boxShadow: isAqua ? `0 0 6px ${strategy.token.accent}99` : undefined,
          }}
        />
        <span className="truncate text-[12.5px] text-white/75">
          {strategy.token.symbol}/USDC
        </span>
        <span className="text-[10.5px] text-white/35">
          {swapCount > 0 ? `· ${swapCount}` : ""}
        </span>
      </div>
      <span
        className={`font-mono text-[12.5px] ${
          isAqua ? "text-cyan/90" : "text-white/65"
        }`}
      >
        ${formatUsd(feesUsd)}
      </span>
    </li>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────

function formatUsd(n: number): string {
  if (!Number.isFinite(n)) return "—";
  // Whole-dollar precision below $100, two decimals otherwise. Keeps the
  // big-number cards uncluttered while small per-pool rows still read.
  const maxFrac = n >= 100 ? 0 : 2;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFrac,
  });
}

function computeLead(aqua0: number, vanilla: number): "aqua0" | "vanilla" | "tie" {
  if (aqua0 === 0 && vanilla === 0) return "tie";
  if (Math.abs(aqua0 - vanilla) < 0.5) return "tie";
  return aqua0 > vanilla ? "aqua0" : "vanilla";
}

function formatMultiplier(report: {
  aqua0: PoolStatsGroup;
  vanilla: PoolStatsGroup;
}): string | undefined {
  const { aqua0, vanilla } = report;
  if (vanilla.totalFeesUsd <= 0 || aqua0.totalFeesUsd <= 0) return undefined;
  const ratio = aqua0.totalFeesUsd / vanilla.totalFeesUsd;
  if (ratio < 1.05) return undefined;
  // Cap the displayed multiplier so wild small-denominator ratios don't
  // claim "30×" when vanilla earned a few cents.
  if (ratio > 9.9) return "10×+";
  return `${ratio.toFixed(1)}×`;
}
