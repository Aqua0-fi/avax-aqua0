"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink } from "lucide-react";
import { useAccount } from "wagmi";
import { HeroWaves } from "@/components/aquatic-waves";
import { DotMark } from "@/components/dot-mark";
import { Navbar } from "@/components/navbar";
import { LiquidityAtlas } from "@/components/strategies/liquidity-atlas";
import { useWalletBalance } from "@/hooks/use-slp-balance";
import type { TokenMeta } from "@/lib/contracts";
import { formatAmount } from "@/lib/utils";

const SNOWTRACE = "https://testnet.snowtrace.io/address/";

// VanillaPoolDetail — the per-pool detail page for one of the two vanilla
// baseline pools (wARS/USDC, wBRL/USDC). Styled deliberately dim — no
// cyan accents on the headline surfaces, just a comparison-only badge and
// a prominent CTA pointing at the corresponding Aqua0-hooked market so
// the visitor leaves with "this is what NOT to do" in their head.

interface VanillaPoolDetailProps {
  token: TokenMeta;
  poolId: `0x${string}`;
  marketCode: "ars" | "brl";
  marketLabel: string;
  marketFlag: string;
}

export function VanillaPoolDetail({
  token,
  poolId,
  marketCode,
  marketLabel,
  marketFlag,
}: VanillaPoolDetailProps) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <HeroWaves />
      <Navbar />

      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 lg:px-8">
        {/* ── Back link ───────────────────────────────────────────── */}
        <Link
          href="/strategies"
          className="mb-6 inline-flex items-center gap-1.5 text-[12px] text-white/55 transition-colors hover:text-white/85"
        >
          ← All markets
        </Link>

        {/* ── Hero (deliberately dim — no cyan accents) ──────────── */}
        <section className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.3em] text-white/40">
            <DotMark className="text-white/50" />
            {marketFlag} {token.symbol}/USDC · Vanilla baseline
          </div>
          <h1 className="text-[clamp(32px,4.5vw,52px)] font-bold leading-none tracking-[-0.025em] text-white/85">
            {token.symbol}/USDC
          </h1>
          <p className="mt-4 max-w-[680px] text-[14px] leading-[1.55] text-white/55">
            A traditional Uniswap V4 pool with{" "}
            <span className="border-b border-dotted border-white/30 text-white/80">
              no Aqua0 hook
            </span>
            . Earns only its own pair&apos;s fees. Lives here as the
            baseline the SLP-backed pools above out-perform.
          </p>
        </section>

        {/* ── Main grid: pool card + comparison sidebar ─────────────── */}
        <section className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <PoolCard token={token} poolId={poolId} />
          <WhyExistsSidebar
            marketCode={marketCode}
            marketLabel={marketLabel}
            tokenSymbol={token.symbol}
          />
        </section>

        {/* ── "Compare with Aqua0" callout ─────────────────────────── */}
        <section className="mt-10">
          <CompareCallout
            token={token}
            marketCode={marketCode}
            marketLabel={marketLabel}
            marketFlag={marketFlag}
          />
        </section>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   The single big pool card — pool ID + Snowtrace, large vanilla atlas,
   config metrics. Stays neutral (no cyan) to keep the comparison framing.
   ─────────────────────────────────────────────────────────────────────────── */

function PoolCard({
  token,
  poolId,
}: {
  token: TokenMeta;
  poolId: `0x${string}`;
}) {
  const { isConnected } = useAccount();
  const wallet = useWalletBalance(token);
  const [copied, setCopied] = useState(false);

  const poolIdShort = `${poolId.slice(0, 6)}…${poolId.slice(-4)}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(poolId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard API can fail in restricted contexts */
    }
  }

  return (
    <article className="rounded-xl border border-white/10 bg-card p-5 sm:p-6">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="h-3 w-3 rounded-full opacity-70"
            style={{ background: token.accent }}
          />
          <div>
            <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-white">
              {token.symbol} / USDC
            </h2>
            <p className="mt-0.5 text-[11px] text-white/50">
              {token.issuer === "ripio" ? "Ripio" : "Twin"} · Uniswap V4 · 0.30%
            </p>
          </div>
        </div>
        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.02] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/55">
          Hook · None
        </span>
      </header>

      {/* ── Liquidity atlas — vanilla variant, no JIT layer ────────── */}
      <div className="mb-5 rounded-lg border border-white/[0.06] bg-white/[0.015] px-3.5 py-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[9.5px] uppercase tracking-[0.22em] text-white/40">
            Liquidity around current tick
          </div>
          <span className="text-[9px] uppercase tracking-[0.18em] text-white/35">
            Seeded only
          </span>
        </div>
        <LiquidityAtlas variant="vanilla" size="lg" showLegend />
      </div>

      {/* ── Pool ID + Snowtrace ─────────────────────────────────────── */}
      <div className="mb-5 rounded-lg border border-white/[0.06] bg-white/[0.015] px-3.5 py-2.5">
        <div className="text-[9.5px] uppercase tracking-[0.22em] text-white/40">
          Pool ID
        </div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="font-mono text-[12px] text-white/80" title={poolId}>
            {poolIdShort}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => void handleCopy()}
              className="grid h-6 w-6 place-items-center rounded-md text-white/50 transition-colors hover:bg-white/[0.04] hover:text-white"
              aria-label="Copy pool ID"
            >
              {copied ? (
                <Check className="h-3 w-3 text-white/85" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
            <a
              href={`${SNOWTRACE}${token.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="grid h-6 w-6 place-items-center rounded-md text-white/50 transition-colors hover:bg-white/[0.04] hover:text-white"
              aria-label="View token on Snowtrace"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      {/* ── Metrics grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Fee tier" value="0.30%" />
        <Metric label="Tick spacing" value="60" />
        <Metric label="Hook" value="None" />
        <Metric label="Markets backed" value="1 of 6" />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-4 sm:grid-cols-4">
        <Metric
          label="Your wallet"
          value={
            isConnected
              ? formatAmount(wallet.balance, token.decimals, 0)
              : "—"
          }
          mono
        />
        <Metric label="Seeded" value="100,000" mono />
        <Metric label="Committed" value="$10,000" mono />
        <Metric label="Fees · 30d" value="$12" mono />
      </div>
    </article>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   "Why this exists" sidebar — sets framing without selling. Tells the
   visitor this card is comparison furniture, not a venue to deposit into.
   ─────────────────────────────────────────────────────────────────────────── */

function WhyExistsSidebar({
  marketCode,
  marketLabel,
  tokenSymbol,
}: {
  marketCode: "ars" | "brl";
  marketLabel: string;
  tokenSymbol: string;
}) {
  return (
    <aside className="rounded-2xl border border-white/10 bg-white/[0.015] p-6">
      <header className="mb-4">
        <div className="text-[10px] uppercase tracking-[0.28em] text-white/40">
          Why this pool exists
        </div>
        <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.015em] text-white/85">
          The baseline.
        </h2>
      </header>

      <p className="text-[13px] leading-[1.6] text-white/55">
        Aqua0 needs a control group. We deployed two vanilla V4 pools
        ({tokenSymbol}/USDC and the other regional baseline) so an LP can
        see, on the same chain with the same fee tier, what their capital
        would earn{" "}
        <span className="border-b border-dotted border-white/35 text-white/75">
          without the SLP backing
        </span>
        .
      </p>

      <p className="mt-3 text-[13px] leading-[1.6] text-white/55">
        Same $10k. Earns fees only from this pair. Idle for the other 5
        LATAM markets.
      </p>

      <Link
        href={`/strategies/${marketCode}`}
        className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-cyan px-4 py-2.5 text-[12px] font-semibold text-black transition-colors hover:bg-cyan-dim"
      >
        See the Aqua0 {marketLabel} market →
      </Link>
    </aside>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Big "compare side-by-side" callout — final beat. Two columns: vanilla
   (dim) vs Aqua0 (cyan). Reads like an A/B with concrete numbers.
   ─────────────────────────────────────────────────────────────────────────── */

function CompareCallout({
  token,
  marketCode,
  marketLabel,
  marketFlag,
}: {
  token: TokenMeta;
  marketCode: "ars" | "brl";
  marketLabel: string;
  marketFlag: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-card">
      <div
        className="pointer-events-none absolute -bottom-20 -right-16 h-56 w-56 rounded-full opacity-30 blur-3xl"
        style={{ backgroundColor: "rgba(127, 229, 229, 0.18)" }}
      />
      <div className="relative grid gap-px sm:grid-cols-2">
        <div className="p-6 sm:p-7">
          <div className="text-[10px] uppercase tracking-[0.28em] text-white/40">
            Where you are
          </div>
          <h3 className="mt-1 text-[18px] font-semibold tracking-[-0.015em] text-white/85">
            Vanilla · {token.symbol}/USDC
          </h3>
          <dl className="mt-4 space-y-2">
            <CompareRow label="Hook" value="None" />
            <CompareRow label="Markets backed" value="1 of 6" />
            <CompareRow label="Capital efficiency" value="1× (baseline)" />
            <CompareRow label="Fees · 30d" value="$12" />
          </dl>
        </div>
        <div className="border-t border-white/10 p-6 sm:border-l sm:border-t-0 sm:p-7">
          <div className="text-[10px] uppercase tracking-[0.28em] text-cyan">
            With Aqua0
          </div>
          <h3 className="mt-1 text-[18px] font-semibold tracking-[-0.015em] text-white">
            {marketFlag} {marketLabel} · Both issuers
          </h3>
          <dl className="mt-4 space-y-2">
            <CompareRow label="Hook" value="Aqua0" tint="cyan" />
            <CompareRow label="Markets backed" value="6 of 6" tint="cyan" />
            <CompareRow label="Capital efficiency" value="6×" tint="cyan" />
            <CompareRow label="Fees · 30d" value="$72 (mocked)" tint="cyan" />
          </dl>
          <Link
            href={`/strategies/${marketCode}`}
            className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-cyan transition-colors hover:text-white"
          >
            Open the Aqua0 market →
          </Link>
        </div>
      </div>
    </div>
  );
}

function CompareRow({
  label,
  value,
  tint = "neutral",
}: {
  label: string;
  value: string;
  tint?: "cyan" | "neutral";
}) {
  return (
    <div className="flex items-center justify-between border-t border-white/[0.06] pt-2 first:border-t-0 first:pt-0">
      <dt className="text-[10.5px] uppercase tracking-[0.18em] text-white/40">
        {label}
      </dt>
      <dd
        className={`text-[12.5px] ${tint === "cyan" ? "text-cyan" : "text-white/70"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function Metric({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-[9.5px] uppercase tracking-[0.18em] text-white/40">
        {label}
      </div>
      <div
        className={`mt-1 text-[13px] font-semibold text-white/85 ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
