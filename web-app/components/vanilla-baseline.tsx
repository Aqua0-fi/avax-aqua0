"use client";

import { VANILLA_POOLS } from "@/lib/contracts";

// ============================================================================
// VanillaBaseline — the dim, "traditional V4 LP" section under the markets.
// Renders the two no-hook pools to make the comparison explicit: same tokens,
// same fees, but capital is FRAGMENTED across pools instead of unified.
// ============================================================================

const VANILLA_TVL_USD = 10_000; // per pool — the demo's assumed split
const VANILLA_FEES_30D_USD = 12; // per pool

export function VanillaBaseline() {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.015] p-6">
      <header className="mb-1 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.28em] text-white/40">
            Traditional V4 · No hook
          </div>
          <h3 className="text-lg font-bold tracking-tight text-white/80">
            Vanilla baseline pools
          </h3>
        </div>
        <span className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[9.5px] uppercase tracking-[0.22em] text-white/60">
          Comparison
        </span>
      </header>

      <p className="mb-5 max-w-[640px] text-[12.5px] leading-relaxed text-white/55">
        The same {VANILLA_POOLS.length}0,000 USDC, fragmented across two
        unrelated vanilla V4 pools. Each pool earns only its own pair's fees.
        Capital sits idle for every market the LP didn't pick.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {VANILLA_POOLS.map((p) => (
          <div
            key={p.poolId}
            className="rounded-xl border border-white/10 bg-black/30 p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full opacity-60"
                  style={{ background: p.token.accent }}
                />
                <span className="text-sm font-semibold text-white/85">
                  {p.token.symbol} / USDC
                </span>
              </div>
              <span className="text-[9px] uppercase tracking-[0.22em] text-white/40">
                Vanilla
              </span>
            </div>
            <dl className="space-y-1 text-[12px]">
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
          </div>
        ))}
      </div>

      <p className="mt-5 text-[11px] leading-relaxed text-white/40">
        Total committed: <span className="text-white/65">$20,000</span> · Total
        fees:{" "}
        <span className="text-white/65">
          ${(VANILLA_FEES_30D_USD * VANILLA_POOLS.length).toFixed(0)} / 30d
        </span>
        . Same $20k deposited in Aqua0's SLP backs all 6 markets above
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
      <dt className="text-[10px] uppercase tracking-[0.18em] text-white/40">
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
