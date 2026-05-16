import { MarketCard } from "@/components/market-card";
import { Navbar } from "@/components/navbar";
import { VanillaBaseline } from "@/components/vanilla-baseline";
import { MARKETS } from "@/lib/contracts";

// /strategies — the page where the pitch lives. Three FX markets across the
// top (each pairing Ripio + Twin against USDC, both backed by the same SLP
// deposit), the vanilla baseline section at the bottom for the comparison.
export default function StrategiesPage() {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-black text-white">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(127,229,229,0.10) 0%, rgba(0,0,0,0) 60%)",
        }}
      />

      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-[1180px] px-6 pt-8 pb-10 sm:px-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-black/40 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.3em] text-white/85 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan cyan-glow" />
          LATAM Liquidity Layer · Avalanche Fuji
        </div>

        <h1 className="mt-6 max-w-[860px] text-[clamp(32px,4.6vw,56px)] font-extrabold leading-[1.05] tracking-[-0.025em]">
          Strategies
        </h1>
        <p className="mt-3 max-w-[640px] text-[14.5px] leading-relaxed text-white/60 sm:text-[15.5px]">
          Three FX markets. Two issuers per market (Ripio + Twin). Aqua0 backs
          all six pools from a single SLP deposit. Below them: the same
          tokens on traditional vanilla V4 — fragmented, idle, earning less.
        </p>
      </section>

      {/* ── 3 LATAM markets ──────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-[1180px] px-6 pb-10 sm:px-10">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {MARKETS.map((market) => (
            <MarketCard key={market.code} market={market} />
          ))}
        </div>
      </section>

      {/* ── Vanilla baseline comparison ──────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-[1180px] px-6 pb-16 sm:px-10">
        <VanillaBaseline />
      </section>
    </main>
  );
}
