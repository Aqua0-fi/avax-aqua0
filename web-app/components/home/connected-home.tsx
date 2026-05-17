"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { HeroWaves } from "@/components/aquatic-waves";
import { DotMark } from "@/components/dot-mark";
import { Navbar } from "@/components/navbar";
import { KpiStrip } from "@/components/profile/kpi-strip";
import { shortAddr } from "@/lib/utils";

// ConnectedHome — the post-login dashboard hub. Renders when wagmi reports
// the user is connected; replaces the marketing-style DisconnectedHome.
//
// Surface intent: stop selling, start operating. Show the user their
// current SLP position (KpiStrip), then the three product surfaces as
// equally-weighted cards so they can jump straight to whichever one they
// need next — Strategies (where the pitch lives), Swap (trade), Profile
// (deeper position management).

export function ConnectedHome() {
  const { address } = useAccount();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <HeroWaves />
      <Navbar />

      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 lg:px-8">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.3em] text-white/60">
            <DotMark />
            {shortAddr(address)} · Avalanche Fuji
          </div>
          <h1 className="text-[clamp(32px,4.5vw,52px)] font-bold leading-none tracking-[-0.025em] text-white">
            Welcome back.
          </h1>
          <p className="mt-4 max-w-[640px] text-[14px] leading-[1.55] text-white/60">
            Your SLP position at a glance, then three doors:{" "}
            <span className="border-b border-dotted border-cyan/60 text-white">
              browse markets, trade, manage your deposit
            </span>
            .
          </p>
        </section>

        {/* ── KPI snapshot ─────────────────────────────────────────────── */}
        <section className="mb-10">
          <KpiStrip />
        </section>

        {/* ── Three surface cards ──────────────────────────────────────── */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SurfaceCard
            href="/strategies"
            eyebrow="01 · The pitch"
            title="Strategies"
            body="Three FX markets, two issuers per market, all backed by the same SLP deposit. The Aqua0 thesis on one page."
            cta="Explore markets →"
          />
          <SurfaceCard
            href="/swap"
            eyebrow="02 · Trade"
            title="Swap"
            body="Trade USDC against any LATAM stablecoin. Routes through the Aqua0 hook so your fees accrue back to the SLP."
            cta="Open swap →"
          />
          <SurfaceCard
            href="/profile"
            eyebrow="03 · Manage"
            title="Profile"
            body="Deposit, declare JIT preferences, watch your SLP inventory move. The full demo flow lives here."
            cta="Open profile →"
            tint="cyan"
          />
        </section>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="relative z-10 mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 border-t border-white/10 pt-6 text-[12px] text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <span>Aqua0 · Avalanche edition</span>
          <a
            href="https://github.com/Aqua0-fi/avax-aqua0"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-cyan"
          >
            github.com/Aqua0-fi/avax-aqua0 ↗
          </a>
        </div>
      </footer>
    </div>
  );
}

// ─── A single hub card pointing at one of the three product surfaces ──────
function SurfaceCard({
  href,
  eyebrow,
  title,
  body,
  cta,
  tint = "white",
}: {
  href: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  tint?: "cyan" | "white";
}) {
  const isCyan = tint === "cyan";
  return (
    <Link
      href={href}
      className={`group relative flex h-full flex-col overflow-hidden rounded-xl border p-5 transition-colors ${
        isCyan
          ? "border-cyan/30 bg-cyan/[0.04] hover:border-cyan/60"
          : "border-white/10 bg-card hover:border-white/30"
      }`}
    >
      {isCyan && (
        <div
          className="pointer-events-none absolute -top-16 -right-12 h-40 w-40 rounded-full opacity-50 blur-3xl"
          style={{ backgroundColor: "rgba(127, 229, 229, 0.16)" }}
        />
      )}
      <div className="relative">
        <div
          className={`text-[10px] uppercase tracking-[0.28em] ${
            isCyan ? "text-cyan" : "text-white/40"
          }`}
        >
          {eyebrow}
        </div>
        <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.015em] text-white">
          {title}
        </h2>
        <p className="mt-3 text-[12.5px] leading-[1.55] text-white/60">
          {body}
        </p>
        <div
          className={`mt-5 text-[12px] font-medium transition-colors ${
            isCyan ? "text-cyan" : "text-white/65 group-hover:text-cyan"
          }`}
        >
          {cta}
        </div>
      </div>
    </Link>
  );
}
