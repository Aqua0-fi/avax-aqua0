import Link from "next/link";
import { HeroWaves } from "@/components/aquatic-waves";
import { DotMark } from "@/components/dot-mark";
import { Navbar } from "@/components/navbar";
import { RouteDetail } from "@/components/strategies/route-detail";
import {
  FUJI_DEPLOYMENT,
  TOKENS,
  type Market,
  type TokenMeta,
} from "@/lib/contracts";

// Maps a market code to its matching vanilla pool (if one exists). Only
// wARS/USDC and wBRL/USDC have vanilla baselines deployed; the MXN market
// renders without the comparison block.
const VANILLA_FOR_MARKET: Record<
  "ARS" | "BRL" | "MXN",
  { token: TokenMeta; poolId: `0x${string}` } | null
> = {
  ARS: { token: TOKENS.wars, poolId: FUJI_DEPLOYMENT.pools.warsUsdcVanilla },
  BRL: { token: TOKENS.wbrl, poolId: FUJI_DEPLOYMENT.pools.wbrlUsdcVanilla },
  MXN: null,
};

// MarketDetail — the per-market view at /strategies/[code]. Surfaces both
// issuer routes with deeper stats than the MarketCard summary, plus the
// vanilla-pool comparison and a routing explainer sidebar.

export function MarketDetail({ market }: { market: Market }) {
  const vanilla = VANILLA_FOR_MARKET[market.code];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <HeroWaves />
      <Navbar />

      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 lg:px-8">
        {/* ── Back link ────────────────────────────────────────────── */}
        <Link
          href="/strategies"
          className="mb-6 inline-flex items-center gap-1.5 text-[12px] text-white/55 transition-colors hover:text-cyan"
        >
          ← All markets
        </Link>

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.3em] text-white/60">
            <DotMark />
            {market.flag} {market.code} market · Avalanche Fuji
          </div>
          <h1 className="text-[clamp(32px,4.5vw,52px)] font-bold leading-none tracking-[-0.025em] text-white">
            {market.label}
          </h1>
          <p className="mt-4 max-w-[680px] text-[14px] leading-[1.55] text-white/60">
            Two issuer routes ({market.routes[0].token.symbol} +{" "}
            {market.routes[1].token.symbol}) paired against USDC. Both pools
            run the{" "}
            <span className="border-b border-dotted border-cyan/60 text-white">
              Aqua0 V4 hook
            </span>{" "}
            and share the same SLP deposit — your capital is amplified across
            both at once.
          </p>
        </section>

        {/* ── Main grid: routes + sidebar ──────────────────────────── */}
        <section className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          {/* Left column: two route cards stacked */}
          <div className="grid gap-4 md:grid-cols-2">
            {market.routes.map((route) => (
              <RouteDetail key={route.poolId} route={route} />
            ))}
          </div>

          {/* Right column: routing explainer */}
          <RouteExplainer market={market} />
        </section>

        {/* ── Vanilla baseline (only if this market has one) ───────── */}
        {vanilla && (
          <section className="mt-10">
            <VanillaBaselineForMarket
              token={vanilla.token}
              poolId={vanilla.poolId}
              marketLabel={market.label}
            />
          </section>
        )}

        {/* ── Capital efficiency callout ──────────────────────────── */}
        <section className="mt-10">
          <CapitalEfficiencyCallout marketCode={market.code} />
        </section>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Right-hand sidebar — narrates how a swap routes through this specific
   market end-to-end. Mirrors the /swap RouteInfo composition.
   ─────────────────────────────────────────────────────────────────────────── */

function RouteExplainer({ market }: { market: Market }) {
  return (
    <aside className="rounded-2xl border border-cyan/25 bg-cyan/[0.03] p-6">
      <header className="mb-4">
        <div className="text-[10px] uppercase tracking-[0.28em] text-cyan">
          How this market routes
        </div>
        <h2 className="mt-1 text-[18px] font-bold tracking-[-0.015em] text-white">
          Two routes, one deposit.
        </h2>
      </header>

      <ol className="space-y-3.5 text-[13px] leading-relaxed text-white/75">
        <Step
          n={1}
          title="Deposit USDC + your chosen stable"
          body={`Add USDC and either ${market.routes[0].token.symbol} or ${market.routes[1].token.symbol} (or both) to the SLP.`}
        />
        <Step
          n={2}
          title="Declare a JIT preference"
          body="Sign an EIP-712 payload that authorises the hook to draw on your balance for this market's pools."
        />
        <Step
          n={3}
          title="Hook routes every swap"
          body={`Each swap on ${market.routes[0].token.symbol}/USDC or ${market.routes[1].token.symbol}/USDC pulls JIT depth from your SLP balance for the swap window.`}
        />
        <Step
          n={4}
          title="Fees credit the SLP"
          body="afterSwap settles fees back into your SLP position so the same capital is ready for the next swap on any other market."
        />
      </ol>

      <Link
        href="/profile"
        className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-cyan px-4 py-2 text-[12px] font-semibold text-black transition-colors hover:bg-cyan-dim"
      >
        Open profile to deposit
      </Link>
    </aside>
  );
}

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

/* ────────────────────────────────────────────────────────────────────────────
   Vanilla baseline — only renders for ARS + BRL, since those are the
   markets we deployed vanilla pools for. Dimly styled on purpose so the
   aqua0 routes above visually dominate.
   ─────────────────────────────────────────────────────────────────────────── */

function VanillaBaselineForMarket({
  token,
  poolId,
  marketLabel,
}: {
  token: TokenMeta;
  poolId: `0x${string}`;
  marketLabel: string;
}) {
  const poolIdShort = `${poolId.slice(0, 6)}…${poolId.slice(-4)}`;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.015] p-6 sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.28em] text-white/40">
            Traditional V4 · No hook
          </div>
          <h3 className="mt-1 text-[18px] font-semibold tracking-[-0.015em] text-white/80">
            Vanilla baseline · {token.symbol}/USDC
          </h3>
        </div>
        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.02] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/50">
          Comparison
        </span>
      </div>

      <p className="mt-3 max-w-[640px] text-[13px] leading-[1.55] text-white/55">
        The same {marketLabel.toLowerCase()} pair, deployed as a vanilla V4
        pool. Earns only its own pair&apos;s fees. Capital sits idle for
        every other market.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Pool ID" value={poolIdShort} mono />
        <Metric label="Hook" value="None" />
        <Metric label="Fee · 30d" value="$12" />
        <Metric label="Markets backed" value="1 of 6" />
      </div>
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
        className={`mt-1 text-[13px] font-semibold text-white/80 ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Capital efficiency callout — visualises the central pitch: this market
   is one of six, all backed by the same SLP deposit. Six dots, this one
   highlighted; the others remain available to back via the SLP.
   ─────────────────────────────────────────────────────────────────────────── */

function CapitalEfficiencyCallout({
  marketCode,
}: {
  marketCode: "ARS" | "BRL" | "MXN";
}) {
  const ALL_MARKETS = ["ARS", "BRL", "MXN"] as const;
  return (
    <div className="rounded-2xl border border-white/10 bg-card p-6 sm:p-7">
      <div className="text-[10px] uppercase tracking-[0.28em] text-white/40">
        Capital efficiency
      </div>
      <h3 className="mt-1 text-[18px] font-semibold tracking-[-0.015em] text-white">
        Same deposit. Six markets.
      </h3>

      <p className="mt-3 max-w-[640px] text-[13px] leading-[1.55] text-white/60">
        You&apos;re looking at {marketCode}, but your SLP deposit backs both
        routes here AND both routes on the other two FX markets. A vanilla
        LP would have to fragment $120k across six pools to match;{" "}
        <span className="border-b border-dotted border-cyan/60 text-white">
          you commit $20k once
        </span>
        .
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {ALL_MARKETS.flatMap((code) => [
          { code, issuer: "ripio" as const },
          { code, issuer: "twin" as const },
        ]).map(({ code, issuer }, i) => {
          const isThis = code === marketCode;
          return (
            <div
              key={`${code}-${issuer}`}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-[0.12em] ${
                isThis
                  ? "border-cyan/40 bg-cyan/[0.08] text-cyan"
                  : "border-white/10 bg-white/[0.02] text-white/50"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isThis ? "bg-cyan shadow-[0_0_4px_#7FE5E5]" : "bg-white/30"
                }`}
              />
              {code} · {issuer === "ripio" ? "Ripio" : "Twin"}
              {isThis && i % 2 === 0 && (
                <span className="ml-1 text-[9px] uppercase tracking-[0.18em] text-cyan/70">
                  You&apos;re here
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
