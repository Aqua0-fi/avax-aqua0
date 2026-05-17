"use client";

import Link from "next/link";
import { LiquidityAtlas } from "@/components/strategies/liquidity-atlas";
import { VANILLA_POOLS } from "@/lib/contracts";

// ============================================================================
// VanillaBaseline — the dim "traditional V4 LP" comparison panel that sits
// under the 3 markets on /strategies. Renders the two no-hook pools so the
// pitch is concrete: same tokens, same fees, but capital is FRAGMENTED
// across pools instead of unified by the SLP. Styled subtle on purpose so
// the cyan markets read as the upgrade.
//
// Each pool card links to /strategies/vanilla/[token] for a deeper view —
// mirrors the production marketplace where every venue (hook or vanilla)
// has its own detail surface.
// ============================================================================

const VANILLA_TVL_USD = 10_000; // per pool — the demo's assumed split
const VANILLA_FEES_30D_USD = 12; // per pool

export function VanillaBaseline() {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.015] p-6 sm:p-8">
      <header className="mb-1 flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.28em] text-white/40">
            Traditional V4 · No hook
          </div>
          <h3 className="mt-1 text-[18px] font-semibold tracking-[-0.015em] text-white/80">
            Vanilla baseline pools
          </h3>
        </div>
        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.02] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/50">
          Comparison
        </span>
      </header>

      <p className="mb-5 max-w-[640px] text-[13px] leading-[1.55] text-white/55">
        The same{" "}
        <span className="border-b border-dotted border-white/40 text-white/80">
          $20,000
        </span>
        , fragmented across two unrelated vanilla V4 pools. Each pool earns
        only its own pair&apos;s fees. Capital sits idle for every market
        the LP didn&apos;t pick.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {VANILLA_POOLS.map((p) => (
          <Link
            key={p.poolId}
            href={`/strategies/vanilla/${p.token.symbol.toLowerCase()}`}
            className="group flex flex-col rounded-xl border border-white/10 bg-card p-4 transition-colors hover:border-white/30"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full opacity-60"
                  style={{ background: p.token.accent }}
                />
                <span className="text-[13px] font-semibold text-white/85">
                  {p.token.symbol} / USDC
                </span>
              </div>
              <span className="text-[9px] uppercase tracking-[0.18em] text-white/40">
                Vanilla
              </span>
            </div>

            {/* Vanilla atlas — solid white bars, single cyan center marker. */}
            <div className="mb-3">
              <LiquidityAtlas variant="vanilla" size="sm" showLegend={false} />
            </div>

            <dl className="space-y-1.5">
              <Row
                label="Committed"
                value={`$${VANILLA_TVL_USD.toLocaleString()}`}
              />
              <Row
                label="Fees · 30d"
                value={`$${VANILLA_FEES_30D_USD}`}
                muted
              />
            </dl>

            <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
              <span className="text-[11px] text-white/40">Hook · None</span>
              <span className="text-[11px] font-medium text-white/55 transition-colors group-hover:text-cyan">
                Open →
              </span>
            </div>
          </Link>
        ))}
      </div>

      <p className="mt-5 text-[11.5px] leading-[1.6] text-white/40">
        Total committed{" "}
        <span className="font-mono text-white/65">$20,000</span> · Total
        fees{" "}
        <span className="font-mono text-white/65">
          ${(VANILLA_FEES_30D_USD * VANILLA_POOLS.length).toFixed(0)} / 30d
        </span>
        . The same $20k in Aqua0&apos;s SLP backs all 6 markets above
        simultaneously.
      </p>
    </section>
  );
}

function Row({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-[9.5px] uppercase tracking-[0.18em] text-white/40">
        {label}
      </dt>
      <dd
        className={`font-mono text-[12px] ${
          muted ? "text-white/55" : "text-white/85"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
