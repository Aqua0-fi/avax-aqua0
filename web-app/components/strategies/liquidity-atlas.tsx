"use client";

import { useMemo } from "react";

// LiquidityAtlas — chunky bell-curve liquidity heatmap. Ported from the
// production aqua0/web-app StrategyCard so the Avalanche edition speaks the
// same visual language.
//
// Why a synthetic curve: the backend doesn't expose per-tick liquidity yet,
// so we render a Gaussian around the current tick. Reads as "liquidity is
// concentrated near the current price" at a glance, which is accurate even
// without live data because all our demo pools were seeded full-range at
// 1:1 sqrt price.
//
// Two variants:
//   - aqua0:  each bar is split. Bottom ~22% (white) is the real seeded
//             V4 liquidity; the rest (cyan) is the virtual JIT slice the
//             SLP can inject just-in-time during a swap.
//   - vanilla: solid white bars throughout, single cyan center marker.
//             No SLP, no JIT — just the seeded liquidity.

interface LiquidityAtlasProps {
  variant: "aqua0" | "vanilla";
  /** Visual size — sm fits in summary cards, lg for the main detail view. */
  size?: "sm" | "md" | "lg";
  /** Render the legend strip beneath the atlas. Defaults true on aqua0 variants. */
  showLegend?: boolean;
}

// Ratio of bar height that's "real" V4 liquidity (white) on aqua0 variants.
// The remainder is virtual JIT depth pulled from the SLP (cyan).
const REAL_LIQUIDITY_RATIO = 0.22;

const SIZE_MAP = {
  sm: { containerHeight: "h-10", buckets: 25, sigma: 3.5 },
  md: { containerHeight: "h-16", buckets: 31, sigma: 4 },
  lg: { containerHeight: "h-20", buckets: 41, sigma: 5 },
} as const;

export function LiquidityAtlas({
  variant,
  size = "md",
  showLegend,
}: LiquidityAtlasProps) {
  const { containerHeight, buckets, sigma } = SIZE_MAP[size];
  const center = Math.floor(buckets / 2);

  // Bell curve sampled at each bucket. Constant per render — the shape
  // only depends on (buckets, sigma) which are size-derived.
  const cells = useMemo(
    () =>
      Array.from({ length: buckets }, (_, i) => {
        const d = Math.abs(i - center);
        return Math.exp(-(d * d) / (2 * sigma * sigma));
      }),
    [buckets, center, sigma],
  );

  const isAqua = variant === "aqua0";
  const legendVisible = showLegend ?? isAqua;

  return (
    <div>
      <div className={`relative ${containerHeight}`}>
        <div className="absolute inset-0 flex items-end gap-px">
          {cells.map((v, i) => {
            const isCenter = i === center;
            const barHeight = Math.max(8, v * 100);

            if (isAqua) {
              return (
                <div
                  key={i}
                  className="flex flex-1 items-end"
                  style={{ height: "100%" }}
                >
                  <div
                    className="relative w-full"
                    style={{ height: `${barHeight}%` }}
                  >
                    {/* Virtual JIT slice (cyan, top) */}
                    <div
                      className="absolute left-0 right-0 top-0 bg-cyan"
                      style={{
                        height: `${(1 - REAL_LIQUIDITY_RATIO) * 100}%`,
                        opacity: isCenter ? 0.95 : 0.35 + v * 0.45,
                      }}
                    />
                    {/* Real seeded V4 (white, bottom) */}
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-white"
                      style={{
                        height: `${REAL_LIQUIDITY_RATIO * 100}%`,
                        opacity: isCenter ? 0.9 : 0.4 + v * 0.3,
                      }}
                    />
                  </div>
                </div>
              );
            }

            // Vanilla: solid white, center bar tinted cyan to mark current tick
            return (
              <div
                key={i}
                className="flex flex-1 items-end"
                style={{ height: "100%" }}
              >
                <div
                  className={`w-full ${isCenter ? "bg-cyan" : "bg-white"}`}
                  style={{
                    height: `${barHeight}%`,
                    opacity: isCenter ? 0.85 : 0.15 + v * 0.5,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {legendVisible && (
        <div className="mt-2 flex items-center gap-3 text-[9px] uppercase tracking-[0.1em] text-white/40">
          {isAqua ? (
            <>
              <LegendChip color="bg-white" opacity={0.7} label="Real" />
              <LegendChip color="bg-cyan" label="Shared · Aqua0" />
            </>
          ) : (
            <>
              <LegendChip color="bg-white" opacity={0.7} label="Seeded" />
              <LegendChip color="bg-cyan" label="Current tick" />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function LegendChip({
  color,
  label,
  opacity = 1,
}: {
  color: string;
  label: string;
  opacity?: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`h-1.5 w-1.5 rounded-sm ${color}`}
        style={{ opacity }}
      />
      {label}
    </span>
  );
}
