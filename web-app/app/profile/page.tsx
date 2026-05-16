"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { Navbar } from "@/components/navbar";
import { JitActions } from "@/components/profile/jit-actions";
import { KpiStrip } from "@/components/profile/kpi-strip";
import { SLPInventory } from "@/components/profile/slp-inventory";
import { shortAddr } from "@/lib/utils";

// /profile — what an LP sees about their own position. KPI strip at the top,
// SLP inventory in the main column, quick-action panel in the sidebar. No
// withdraw UI yet (TODO post-hackathon).
export default function ProfilePage() {
  const { address, isConnected } = useAccount();

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

      <section className="relative z-10 mx-auto max-w-[1180px] px-6 pt-8 pb-10 sm:px-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-black/40 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.3em] text-white/85 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan cyan-glow" />
          {isConnected ? shortAddr(address) : "Wallet not connected"}
        </div>

        <h1 className="mt-6 text-[clamp(32px,4.6vw,56px)] font-extrabold leading-[1.05] tracking-[-0.025em]">
          Profile
        </h1>
        <p className="mt-3 max-w-[640px] text-[14.5px] leading-relaxed text-white/60 sm:text-[15.5px]">
          Your SLP positions, the markets they back, and the demo's happy path
          in three buttons.
        </p>
      </section>

      {!isConnected && (
        <section className="relative z-10 mx-auto mb-10 max-w-[1180px] px-6 sm:px-10">
          <div className="rounded-2xl border border-cyan/30 bg-cyan/[0.04] p-5 text-[13.5px] text-cyan/90 backdrop-blur-sm">
            Connect a wallet on Avalanche Fuji to see your real SLP balances.
            Need test AVAX? Drip from the{" "}
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

      <section className="relative z-10 mx-auto max-w-[1180px] px-6 pb-10 sm:px-10">
        <KpiStrip />
      </section>

      <section className="relative z-10 mx-auto grid max-w-[1180px] gap-5 px-6 pb-16 sm:px-10 lg:grid-cols-[1.4fr_1fr]">
        <SLPInventory />
        <JitActions />
      </section>
    </main>
  );
}
