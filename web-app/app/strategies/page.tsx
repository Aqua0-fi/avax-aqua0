import { MarketCard } from "@/components/market-card";
import { HeroWaves } from "@/components/aquatic-waves";
import { DotMark } from "@/components/dot-mark";
import { Navbar } from "@/components/navbar";
import { VanillaBaseline } from "@/components/vanilla-baseline";
import { MARKETS } from "@/lib/contracts";

// /strategies — the page where the pitch lives. Three FX markets across the
// top (each pairing Ripio + Twin against USDC, both backed by the same SLP
// deposit), the vanilla baseline section at the bottom for the comparison.
export default function StrategiesPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <HeroWaves />
      <Navbar />

      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 lg:px-8">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.3em] text-white/60">
            <DotMark />
            LATAM Liquidity Layer · Avalanche Fuji
          </div>
          <h1 className="text-[clamp(32px,4.5vw,52px)] font-bold leading-none tracking-[-0.025em] text-white">
            Strategies
          </h1>
          <p className="mt-4 max-w-[680px] text-[14px] leading-[1.55] text-white/60">
            Three FX markets. Two issuers per market (Ripio + Twin). Aqua0
            backs all six pools from a{" "}
            <span className="border-b border-dotted border-cyan/60 text-white">
              single SLP deposit
            </span>
            . Below: the same tokens on traditional vanilla V4 — fragmented,
            idle, earning less.
          </p>
        </section>

        {/* ── 3 LATAM markets ─────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {MARKETS.map((market) => (
              <MarketCard key={market.code} market={market} />
            ))}
          </div>
        </section>

        {/* ── Vanilla baseline comparison ─────────────────────────────── */}
        <section className="mb-8">
          <VanillaBaseline />
        </section>
      </div>
    </div>
  );
}
