import Link from "next/link";
import { Navbar } from "@/components/navbar";

// Root — the entry point a judge / new visitor hits first. Hero + two CTAs
// into the actual app surface (/strategies for the pitch, /profile for the
// LP view). Comparison and action panel live on their own routes now.
export default function Home() {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-black text-white">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 85% 55% at 50% -10%, rgba(127,229,229,0.12) 0%, rgba(0,0,0,0) 60%)",
        }}
      />

      <Navbar />

      <section className="relative z-10 mx-auto flex max-w-[1180px] flex-col items-start px-6 pt-16 pb-20 sm:px-10 sm:pt-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-black/40 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.3em] text-white/85 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan cyan-glow" />
          Live · Avalanche Fuji
        </span>

        <h1 className="mt-8 max-w-[920px] text-[clamp(40px,7vw,96px)] font-extrabold leading-[0.98] tracking-[-0.035em]">
          One deposit.
          <span className="block text-white/40">Every LATAM market.</span>
        </h1>

        <p className="mt-7 max-w-[660px] text-[16px] leading-[1.55] text-white/65 sm:text-[18px]">
          Aqua0 is cross-margin prime brokerage for DeFi. Deposit once into
          the Shared Liquidity Pool — the same capital backs{" "}
          <span className="border-b border-dotted border-cyan/60 text-white">
            Ripio's wARS, wBRL, wMXN and Twin's ARSt, BRLt, MXNt
          </span>{" "}
          simultaneously. Six markets, one deposit, no fragmentation. Built as
          a Uniswap V4 hook, deployed to Avalanche.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link
            href="/strategies"
            className="rounded-full bg-cyan px-6 py-3 text-sm font-semibold text-black transition hover:-translate-y-px hover:bg-cyan-dim cyan-glow"
          >
            See the strategies →
          </Link>
          <Link
            href="/profile"
            className="rounded-full border border-white/15 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-white/85 transition hover:border-cyan/60 hover:text-cyan"
          >
            Open your profile
          </Link>
        </div>

        {/* Quick stats — three pieces of context without overloading */}
        <div className="mt-16 grid w-full grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:mt-20 sm:max-w-[720px]">
          <Stat value="6" label="Aqua0 pools" />
          <Stat value="2" label="Issuers (Ripio + Twin)" />
          <Stat value="6×" label="Capital multiplier" highlighted />
        </div>
      </section>

      <footer className="relative z-10 mx-auto max-w-[1180px] px-6 pb-10 sm:px-10">
        <div className="flex flex-col gap-2 border-t border-white/10 pt-6 text-[12px] text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Built for the Avalanche Institutional DeFi hackathon · LATAM
            stablecoin liquidity layer
          </span>
          <a
            href="https://github.com/Aqua0-fi/avax-aqua0"
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-cyan"
          >
            github.com/Aqua0-fi/avax-aqua0 ↗
          </a>
        </div>
      </footer>
    </main>
  );
}

function Stat({
  value,
  label,
  highlighted = false,
}: {
  value: string;
  label: string;
  highlighted?: boolean;
}) {
  return (
    <div className="bg-black px-5 py-6">
      <div
        className={`text-3xl font-extrabold tracking-tight ${
          highlighted ? "text-cyan" : "text-white"
        }`}
      >
        {value}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-white/45">
        {label}
      </div>
    </div>
  );
}
