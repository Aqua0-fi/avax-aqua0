"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink } from "lucide-react";
import { useAccount } from "wagmi";
import { HeroWaves } from "@/components/aquatic-waves";
import { DotMark } from "@/components/dot-mark";
import { Navbar } from "@/components/navbar";
import { DeployLiquidityCard } from "@/components/strategies/deploy-liquidity-card";
import { LiquidityAtlas } from "@/components/strategies/liquidity-atlas";
import { useSLPBalance, useWalletBalance } from "@/hooks/use-slp-balance";
import { STRATEGIES, type Strategy } from "@/lib/contracts";
import { formatAmount } from "@/lib/utils";

const SNOWTRACE = "https://testnet.snowtrace.io/address/";

// ────────────────────────────────────────────────────────────────────────────
// StrategyDetail — single entrypoint for /strategies/[id]. Branches on the
// strategy's kind so Aqua0 pools get the deploy-flow + amplified-depth
// framing while vanilla baselines stay dim + comparison-only.
// ────────────────────────────────────────────────────────────────────────────

export function StrategyDetail({ strategy }: { strategy: Strategy }) {
  return strategy.kind === "aqua0" ? (
    <AquaStrategyDetail strategy={strategy} />
  ) : (
    <VanillaStrategyDetail strategy={strategy} />
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   AQUA0 STRATEGY DETAIL
   ─────────────────────────────────────────────────────────────────────────── */

function AquaStrategyDetail({ strategy }: { strategy: Strategy }) {
  const issuerLabel = strategy.issuer === "ripio" ? "Ripio" : "Twin";
  return (
    <div className="relative min-h-screen overflow-hidden">
      <HeroWaves />
      <Navbar />

      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 lg:px-8">
        {/* ── Back link ─────────────────────────────────────────── */}
        <Link
          href="/strategies"
          className="mb-6 inline-flex items-center gap-1.5 text-[12px] text-white/55 transition-colors hover:text-cyan"
        >
          ← All strategies
        </Link>

        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.3em] text-white/60">
            <DotMark />
            {strategy.marketFlag} {strategy.marketLabel} · {issuerLabel}
          </div>
          <h1 className="text-[clamp(32px,4.5vw,52px)] font-bold leading-none tracking-[-0.025em] text-white">
            {strategy.token.symbol} / USDC
          </h1>
          <p className="mt-4 max-w-[680px] text-[14px] leading-[1.55] text-white/60">
            A Uniswap V4 pool with the{" "}
            <span className="border-b border-dotted border-cyan/60 text-white">
              Aqua0 hook
            </span>{" "}
            attached. Every swap pulls amplified depth from the Shared
            Liquidity Pool just-in-time, so the same deposit can back this
            pool alongside the other two Twin Aqua0 markets.
          </p>
        </section>

        {/* ── Main grid: pool card + deploy CTA ─────────────────── */}
        <section className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <PoolCard strategy={strategy} />
          <DeployLiquidityCard strategy={strategy} />
        </section>

        {/* ── Routing explainer ───────────────────────────────── */}
        <section className="mt-10">
          <RouteExplainer strategy={strategy} />
        </section>

        {/* ── Capital efficiency callout ──────────────────────── */}
        <section className="mt-6">
          <CapitalEfficiencyCallout strategy={strategy} />
        </section>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   VANILLA STRATEGY DETAIL
   ─────────────────────────────────────────────────────────────────────────── */

function VanillaStrategyDetail({ strategy }: { strategy: Strategy }) {
  // Find the matching Aqua0 strategy for the "see Aqua0 version" CTA.
  // After the Twin-only simplification, vanilla pools (wARS / wBRL) no
  // longer have a same-token Aqua0 sibling — we pair by FX market instead
  // (vanilla-wars → twin-arst, vanilla-wbrl → twin-brlt). The story still
  // holds: "this is your baseline ARS pool, here's the SLP-backed ARS pool
  // you'd compare against (Twin's ARSt)."
  const aquaSibling = STRATEGIES.find(
    (s) => s.kind === "aqua0" && s.marketCode === strategy.marketCode,
  );

  return (
    <div className="relative min-h-screen overflow-hidden">
      <HeroWaves />
      <Navbar />

      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 lg:px-8">
        <Link
          href="/strategies"
          className="mb-6 inline-flex items-center gap-1.5 text-[12px] text-white/55 transition-colors hover:text-white/85"
        >
          ← All strategies
        </Link>

        <section className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.3em] text-white/40">
            <DotMark className="text-white/50" />
            {strategy.marketFlag} {strategy.marketLabel} · Vanilla baseline
          </div>
          <h1 className="text-[clamp(32px,4.5vw,52px)] font-bold leading-none tracking-[-0.025em] text-white/85">
            {strategy.token.symbol} / USDC
          </h1>
          <p className="mt-4 max-w-[680px] text-[14px] leading-[1.55] text-white/55">
            A traditional Uniswap V4 pool with{" "}
            <span className="border-b border-dotted border-white/30 text-white/80">
              no Aqua0 hook
            </span>
            . Earns only its own pair&apos;s fees. Lives here as the
            baseline the SLP-backed pools out-perform.
          </p>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <PoolCard strategy={strategy} />
          <WhyExistsSidebar strategy={strategy} aquaSibling={aquaSibling} />
        </section>

        {aquaSibling && (
          <section className="mt-10">
            <CompareCallout strategy={strategy} aquaSibling={aquaSibling} />
          </section>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   PoolCard — big detail card. Shared by aqua0 + vanilla; tone follows kind.
   ─────────────────────────────────────────────────────────────────────────── */

function PoolCard({ strategy }: { strategy: Strategy }) {
  const { isConnected } = useAccount();
  const slp = useSLPBalance(strategy.token);
  const wallet = useWalletBalance(strategy.token);
  const [copied, setCopied] = useState(false);

  const isAqua = strategy.kind === "aqua0";
  const poolIdShort = `${strategy.poolId.slice(0, 6)}…${strategy.poolId.slice(-4)}`;
  const issuerLabel =
    strategy.issuer === "ripio"
      ? "Ripio"
      : strategy.issuer === "twin"
      ? "Twin"
      : "Vanilla";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(strategy.poolId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard API can fail in restricted contexts */
    }
  }

  return (
    <article className="flex h-full flex-col rounded-xl border border-white/10 bg-card p-5 sm:p-6">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`h-3 w-3 rounded-full ${isAqua ? "" : "opacity-70"}`}
            style={{
              background: strategy.token.accent,
              boxShadow: isAqua ? `0 0 8px ${strategy.token.accent}88` : undefined,
            }}
          />
          <div>
            <h2
              className={`text-[16px] font-semibold tracking-[-0.01em] ${
                isAqua ? "text-white" : "text-white/85"
              }`}
            >
              {strategy.token.symbol} / USDC
            </h2>
            <p className="mt-0.5 text-[11px] text-white/50">
              {issuerLabel} · Uniswap V4 · 0.30%
            </p>
          </div>
        </div>
        {isAqua ? (
          <Badge label="Aqua0 hook" tone="aqua" pulse />
        ) : (
          <Badge label="Hook · None" tone="dim" />
        )}
      </header>

      {/* ── Liquidity atlas ─────────────────────────────────────── */}
      <div className="mb-5 rounded-lg border border-white/[0.06] bg-white/[0.015] px-3.5 py-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[9.5px] uppercase tracking-[0.22em] text-white/40">
            Liquidity around current tick
          </div>
          {!isAqua && (
            <span className="text-[9px] uppercase tracking-[0.18em] text-white/35">
              Seeded only
            </span>
          )}
        </div>
        <LiquidityAtlas
          variant={isAqua ? "aqua0" : "vanilla"}
          size="lg"
          showLegend
        />
      </div>

      {/* ── Pool ID ────────────────────────────────────────────── */}
      <div className="mb-5 rounded-lg border border-white/[0.06] bg-white/[0.015] px-3.5 py-2.5">
        <div className="text-[9.5px] uppercase tracking-[0.22em] text-white/40">
          Pool ID
        </div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="font-mono text-[12px] text-white/80" title={strategy.poolId}>
            {poolIdShort}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => void handleCopy()}
              className="grid h-6 w-6 place-items-center rounded-md text-white/50 transition-colors hover:bg-white/[0.04] hover:text-white"
              aria-label="Copy pool ID"
            >
              {copied ? (
                <Check className={`h-3 w-3 ${isAqua ? "text-cyan" : "text-white/85"}`} />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
            <a
              href={`${SNOWTRACE}${strategy.token.address}`}
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

      {/* ── Balances ───────────────────────────────────────────── */}
      {isAqua && (
        <dl className="mb-5 grid grid-cols-3 gap-3">
          <BalanceCell
            label="SLP backing"
            value={
              isConnected
                ? formatAmount(slp.balance?.deposited, strategy.token.decimals, 0)
                : "100,000"
            }
            tint="cyan"
          />
          <BalanceCell
            label="Available now"
            value={
              isConnected
                ? formatAmount(slp.balance?.available, strategy.token.decimals, 0)
                : "100,000"
            }
          />
          <BalanceCell
            label="Wallet"
            value={
              isConnected
                ? formatAmount(wallet.balance, strategy.token.decimals, 0)
                : "—"
            }
          />
        </dl>
      )}

      {/* ── Pool config metrics ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-4 sm:grid-cols-4">
        <Metric label="Fee tier" value="0.30%" />
        <Metric label="Tick spacing" value="60" />
        <Metric label="Range" value="Full" />
        <Metric
          label="Markets backed"
          value={isAqua ? "3 of 3" : "1 of 3"}
          tint={isAqua ? "cyan" : "white"}
        />
      </div>
    </article>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Sidebar — routing explainer (aqua0 only)
   ─────────────────────────────────────────────────────────────────────────── */

function RouteExplainer({ strategy }: { strategy: Strategy }) {
  return (
    <aside className="rounded-2xl border border-cyan/25 bg-cyan/[0.03] p-6">
      <header className="mb-4">
        <div className="text-[10px] uppercase tracking-[0.28em] text-cyan">
          How this strategy routes
        </div>
        <h2 className="mt-1 text-[18px] font-bold tracking-[-0.015em] text-white">
          One deposit. JIT-routed.
        </h2>
      </header>

      <ol className="grid gap-3.5 text-[13px] leading-relaxed text-white/75 md:grid-cols-2">
        <Step
          n={1}
          title="Deposit USDC + the stable"
          body={`Add USDC and ${strategy.token.symbol} to the SLP (one transaction per token).`}
        />
        <Step
          n={2}
          title="Declare a JIT preference"
          body="Sign once. Authorises the hook to draw on your SLP balance for this pool during swaps."
        />
        <Step
          n={3}
          title="Hook routes every swap"
          body={`beforeSwap pulls JIT depth from your SLP balance for the ${strategy.token.symbol}/USDC pool window.`}
        />
        <Step
          n={4}
          title="afterSwap settles fees"
          body="Fees credit your SLP balance. Capital is released so it can back the next swap on any other pool."
        />
      </ol>
    </aside>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Sidebar — "why this exists" (vanilla only)
   ─────────────────────────────────────────────────────────────────────────── */

function WhyExistsSidebar({
  strategy,
  aquaSibling,
}: {
  strategy: Strategy;
  aquaSibling: Strategy | undefined;
}) {
  return (
    <aside className="rounded-2xl border border-white/10 bg-white/[0.015] p-6">
      <header className="mb-4">
        <div className="text-[10px] uppercase tracking-[0.28em] text-white/40">
          Why this strategy exists
        </div>
        <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.015em] text-white/85">
          The baseline.
        </h2>
      </header>

      <p className="text-[13px] leading-[1.6] text-white/55">
        Aqua0 needs a control group. We deployed this vanilla{" "}
        {strategy.token.symbol}/USDC pool so an LP can compare what their
        capital would earn{" "}
        <span className="border-b border-dotted border-white/35 text-white/75">
          without the SLP backing
        </span>{" "}
        — same fee tier, same tokens, same chain.
      </p>

      <p className="mt-3 text-[13px] leading-[1.6] text-white/55">
        Same deposit. Earns fees only from this pair. Idle for the other 2
        Aqua0 markets.
      </p>

      {aquaSibling && (
        <Link
          href={`/strategies/${aquaSibling.id}`}
          className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-cyan px-4 py-2.5 text-[12px] font-semibold text-black transition-colors hover:bg-cyan-dim"
        >
          See the Aqua0 version →
        </Link>
      )}
    </aside>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Capital efficiency callout — pills for every Aqua0 strategy (3 after the
   Twin-only simplification). Current strategy is highlighted.
   ─────────────────────────────────────────────────────────────────────────── */

function CapitalEfficiencyCallout({ strategy }: { strategy: Strategy }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card p-6 sm:p-7">
      <div className="text-[10px] uppercase tracking-[0.28em] text-white/40">
        Capital efficiency
      </div>
      <h3 className="mt-1 text-[18px] font-semibold tracking-[-0.015em] text-white">
        Same deposit. Three markets.
      </h3>

      <p className="mt-3 max-w-[640px] text-[13px] leading-[1.55] text-white/60">
        You&apos;re looking at one of three Twin Aqua0 strategies, all backed
        by the same SLP deposit. A vanilla LP would have to fragment $60k
        across three pools to match;{" "}
        <span className="border-b border-dotted border-cyan/60 text-white">
          you commit $20k once
        </span>
        .
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {STRATEGIES.filter((s) => s.kind === "aqua0").map((s) => {
          const isThis = s.id === strategy.id;
          const issuer = s.issuer === "ripio" ? "Ripio" : "Twin";
          return (
            <span
              key={s.id}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-[0.12em] ${
                isThis
                  ? "border-cyan/40 bg-cyan/[0.08] text-cyan"
                  : "border-white/10 bg-white/[0.02] text-white/55"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isThis ? "bg-cyan shadow-[0_0_4px_#7FE5E5]" : "bg-white/30"
                }`}
              />
              {s.token.symbol} · {issuer}
              {isThis && (
                <span className="ml-1 text-[9px] uppercase tracking-[0.18em] text-cyan/70">
                  You&apos;re here
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Compare callout — final beat for vanilla detail pages. Side-by-side
   vanilla vs Aqua0 sibling.
   ─────────────────────────────────────────────────────────────────────────── */

function CompareCallout({
  strategy,
  aquaSibling,
}: {
  strategy: Strategy;
  aquaSibling: Strategy;
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
            Vanilla · {strategy.token.symbol}/USDC
          </h3>
          <dl className="mt-4 space-y-2">
            <CompareRow label="Hook" value="None" />
            <CompareRow label="Markets backed" value="1 of 3" />
            <CompareRow label="Capital efficiency" value="1× (baseline)" />
            <CompareRow label="Fees · 30d" value="$12" />
          </dl>
        </div>
        <div className="border-t border-white/10 p-6 sm:border-l sm:border-t-0 sm:p-7">
          <div className="text-[10px] uppercase tracking-[0.28em] text-cyan">
            With Aqua0
          </div>
          <h3 className="mt-1 text-[18px] font-semibold tracking-[-0.015em] text-white">
            {strategy.marketFlag} {aquaSibling.token.symbol}/USDC ·{" "}
            {aquaSibling.issuer === "ripio" ? "Ripio" : "Twin"}
          </h3>
          <dl className="mt-4 space-y-2">
            <CompareRow label="Hook" value="Aqua0" tint="cyan" />
            <CompareRow label="Markets backed" value="3 of 3" tint="cyan" />
            <CompareRow label="Capital efficiency" value="3×" tint="cyan" />
            <CompareRow label="Fees · 30d" value="$72 (mocked)" tint="cyan" />
          </dl>
          <Link
            href={`/strategies/${aquaSibling.id}`}
            className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-cyan transition-colors hover:text-white"
          >
            Open the Aqua0 strategy →
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Atoms
   ─────────────────────────────────────────────────────────────────────────── */

function Step({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: string;
}) {
  return (
    <li className="flex items-start gap-3.5">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan/40 text-[11px] font-bold text-cyan">
        {n}
      </div>
      <div>
        <div className="text-[13px] font-semibold text-white">{title}</div>
        <div className="mt-0.5 text-[12px] text-white/55">{body}</div>
      </div>
    </li>
  );
}

function BalanceCell({
  label,
  value,
  tint = "white",
}: {
  label: string;
  value: string;
  tint?: "cyan" | "white";
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-3">
      <div className="text-[9.5px] uppercase tracking-[0.18em] text-white/40">
        {label}
      </div>
      <div
        className={`mt-1 font-mono text-[14px] font-semibold ${
          tint === "cyan" ? "text-cyan" : "text-white/85"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tint = "white",
}: {
  label: string;
  value: string;
  tint?: "cyan" | "white";
}) {
  return (
    <div>
      <div className="text-[9.5px] uppercase tracking-[0.18em] text-white/40">
        {label}
      </div>
      <div
        className={`mt-1 text-[13px] font-semibold ${
          tint === "cyan" ? "text-cyan" : "text-white/85"
        }`}
      >
        {value}
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

function Badge({
  label,
  tone,
  pulse,
}: {
  label: string;
  tone: "aqua" | "dim";
  pulse?: boolean;
}) {
  const styles =
    tone === "aqua"
      ? "border-cyan/30 bg-cyan/10 text-cyan"
      : "border-white/10 bg-white/[0.02] text-white/55";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${styles}`}
    >
      {pulse && (
        <span className="h-1 w-1 rounded-full bg-current shadow-[0_0_4px_currentColor]" />
      )}
      {label}
    </span>
  );
}
