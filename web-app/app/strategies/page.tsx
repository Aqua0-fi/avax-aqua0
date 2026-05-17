import { HeroWaves } from "@/components/aquatic-waves";
import { DotMark } from "@/components/dot-mark";
import { Navbar } from "@/components/navbar";
import { StrategyCard } from "@/components/strategies/strategy-card";
import {
  AQUA0_STRATEGIES,
  VANILLA_STRATEGIES,
} from "@/lib/contracts";

// /strategies — flat marketplace of every venue an LP can browse.
// Five cards: three Twin Aqua0-hooked pools (the pitch) + two Ripio
// vanilla baselines (the comparison — also doubles as a cross-issuer
// reminder that Aqua0 doesn't care which issuer's stablecoin you LP).
// Clicking any card opens its /strategies/[id] detail.
//
// We split the page into two sections rather than mixing the kinds in one
// grid: Aqua0 strategies dominate visually (solid card surface + cyan
// accents); vanilla baselines sit below with a dim 'Comparison only'
// label so they read as supporting material, not as venues to deposit
// into.
export default function StrategiesPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <HeroWaves />
      <Navbar />

      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 lg:px-8">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.3em] text-white/60">
            <DotMark />
            LATAM Liquidity Layer · Avalanche Fuji
          </div>
          <h1 className="text-[clamp(32px,4.5vw,52px)] font-bold leading-none tracking-[-0.025em] text-white">
            Strategies
          </h1>
          <p className="mt-4 max-w-[680px] text-[14px] leading-[1.55] text-white/60">
            Three Twin Aqua0 strategies, each a USDC ↔ LATAM stablecoin pool
            with the Aqua0 hook attached. All backed by the{" "}
            <span className="border-b border-dotted border-cyan/60 text-white">
              same SLP deposit
            </span>
            . Below: two Ripio vanilla baselines for comparison.
          </p>
        </section>

        {/* ── Aqua0 strategies (Twin pools) ─────────────────────────── */}
        <section className="mb-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[11px] uppercase tracking-[0.28em] text-cyan">
              Aqua0 · {AQUA0_STRATEGIES.length} pools
            </h2>
            <span className="text-[10.5px] text-white/40">
              Twin · ARS · BRL · MXN
            </span>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {AQUA0_STRATEGIES.map((s) => (
              <StrategyCard key={s.id} strategy={s} />
            ))}
          </div>
        </section>

        {/* ── Vanilla baselines (comparison only) ──────────────────── */}
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[11px] uppercase tracking-[0.28em] text-white/45">
              Vanilla baselines · comparison only
            </h2>
            <span className="text-[10.5px] text-white/40">
              No hook · 1 market backed each
            </span>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {VANILLA_STRATEGIES.map((s) => (
              <StrategyCard key={s.id} strategy={s} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
