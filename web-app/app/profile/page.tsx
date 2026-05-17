"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { HeroWaves } from "@/components/aquatic-waves";
import { DotMark } from "@/components/dot-mark";
import { Navbar } from "@/components/navbar";
import { ActivePositions } from "@/components/profile/active-positions";
import { DepositCard } from "@/components/profile/deposit-card";
import { JitActions } from "@/components/profile/jit-actions";
import { KpiStrip } from "@/components/profile/kpi-strip";
import { SLPInventory } from "@/components/profile/slp-inventory";
import { shortAddr } from "@/lib/utils";

// /profile — what an LP sees about their own position. Layout follows the
// dashboard pattern from app.aqua0.xyz: KPI strip, then a full-width
// "active positions" hero (one card per JIT declaration), then the SLP
// inventory + quick actions side-by-side. No withdraw UI yet (TODO).
export default function ProfilePage() {
  const { address, isConnected } = useAccount();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <HeroWaves />
      <Navbar />

      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 lg:px-8">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.3em] text-white/60">
            <DotMark />
            {isConnected ? shortAddr(address) : "Wallet not connected"}
          </div>
          <h1 className="text-[clamp(32px,4.5vw,52px)] font-bold leading-none tracking-[-0.025em] text-white">
            Profile
          </h1>
          <p className="mt-4 max-w-[640px] text-[14px] leading-[1.55] text-white/60">
            Your SLP positions, the markets they back, and the demo&apos;s
            happy path in{" "}
            <span className="border-b border-dotted border-cyan/60 text-white">
              three buttons
            </span>
            .
          </p>
        </section>

        {/* ── Not-connected banner ───────────────────────────────────── */}
        {!isConnected && (
          <section className="mb-10">
            <div className="rounded-2xl border border-cyan/30 bg-cyan/[0.04] p-5 text-[13.5px] text-cyan/90">
              Connect a wallet on Avalanche Fuji to see your real SLP
              balances. Need test AVAX? Drip from the{" "}
              <a
                href="https://faucet.avax.network/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-cyan/40 underline-offset-4 hover:decoration-cyan"
              >
                official faucet
              </a>
              . Need mock LATAM stables?{" "}
              <Link
                href="/faucet"
                className="underline decoration-cyan/40 underline-offset-4 hover:decoration-cyan"
              >
                Use ours
              </Link>
              .
            </div>
          </section>
        )}

        {/* ── KPI strip ─────────────────────────────────────────────── */}
        <section className="mb-6">
          <KpiStrip />
        </section>

        {/* ── Active positions — the "you're backing N markets" hero ── */}
        <section className="mb-6">
          <ActivePositions />
        </section>

        {/* ── Inventory + Actions ───────────────────────────────────── */}
        <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <SLPInventory />
          <div className="flex flex-col gap-5">
            <DepositCard />
            <JitActions />
          </div>
        </section>
      </div>
    </div>
  );
}
