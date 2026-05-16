import Link from "next/link";
import { ActionPanel } from "@/components/action-panel";
import { ComparisonCards } from "@/components/comparison-cards";
import { ConnectButton } from "@/components/connect-button";

export default function Home() {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-black text-white">
      {/* Subtle radial backdrop — matches the rest of the brand without
          shipping a full <canvas> animation just for this page. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(127,229,229,0.10) 0%, rgba(0,0,0,0) 60%)",
        }}
      />

      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <nav className="relative z-10 mx-auto flex max-w-[1180px] items-center justify-between px-6 py-6 sm:px-10">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-sm font-bold text-cyan">
            A
          </span>
          <span className="text-[15px] font-semibold tracking-[0.02em]">
            Aqua0
          </span>
          <span className="ml-2 hidden text-[10px] uppercase tracking-[0.28em] text-cyan sm:inline">
            · Avalanche Edition
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/faucet"
            className="hidden text-sm text-white/70 transition hover:text-cyan sm:inline"
          >
            Faucet
          </Link>
          <ConnectButton />
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-[1180px] px-6 pt-8 pb-12 sm:px-10 sm:pt-14">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-black/40 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.3em] text-white/85 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan cyan-glow" />
          Live · Avalanche Fuji
        </div>

        <h1 className="mt-6 max-w-[860px] text-[clamp(36px,5.5vw,72px)] font-extrabold leading-[1.02] tracking-[-0.03em]">
          One deposit.
          <span className="block text-white/40">Every LATAM market.</span>
        </h1>

        <p className="mt-6 max-w-[640px] text-[15px] leading-[1.55] text-white/65 sm:text-[17px]">
          Aqua0 is cross-margin prime brokerage for DeFi. Deposit once into the
          Shared Liquidity Pool — the same capital backs{" "}
          <span className="border-b border-dotted border-cyan/60 text-white">
            wARS, wBRL, and wMXN
          </span>{" "}
          simultaneously. 3× the fees from one deposit. No fragmentation, no
          bridges, no backend trust.
        </p>
      </section>

      {/* ── Split-screen comparison ────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-[1180px] px-6 pb-12 sm:px-10">
        <ComparisonCards />
      </section>

      {/* ── Action panel ───────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-[860px] px-6 pb-20 sm:px-10">
        <ActionPanel />
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
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
