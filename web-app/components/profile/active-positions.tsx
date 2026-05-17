"use client";

import Link from "next/link";
import { ExternalLink, Sparkles } from "lucide-react";
import { useAccount } from "wagmi";
import { DotMark } from "@/components/dot-mark";
import { useJitPositions, type JitPosition } from "@/hooks/use-jit-positions";
import { TOKENS } from "@/lib/contracts";
import { formatAmount } from "@/lib/utils";

// ActivePositions — the dashboard hero on /profile, modelled after the
// "Active positions" panel in the production app.aqua0.xyz. One row per
// JIT declaration with four columns of metadata (Range / Committed /
// amount0 / amount1) so each card holds enough density to read like a
// professional LP dashboard instead of a faucet receipt.
//
// Why list-style instead of a grid of small cards: the pitch is "the LP
// can have N positions backed by the same SLP". A list scales linearly
// with N — five positions, ten positions, twenty — without forcing the
// rest of the page below the fold. Grid layouts cap visual density at
// 2-3 columns before the cards shrink.

const SNOWTRACE_TX = "https://testnet.snowtrace.io/tx/";

export function ActivePositions() {
  const { isConnected } = useAccount();
  const { positions, isLoading } = useJitPositions();

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.015] p-5 sm:p-6">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.28em] text-white/55">
          <DotMark />
          Active positions
          {isConnected && positions.length > 0 && (
            <span className="ml-1 rounded-full border border-white/15 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] text-white/75">
              {positions.length}
            </span>
          )}
        </div>
        <Link
          href="/strategies"
          className="text-[11.5px] font-semibold text-cyan transition-colors hover:text-white"
        >
          + Add another →
        </Link>
      </header>

      {!isConnected ? (
        <EmptyState
          title="Connect your wallet"
          body="Sign in to see your active JIT declarations."
        />
      ) : isLoading && positions.length === 0 ? (
        <EmptyState
          title="Loading…"
          body="Scanning JITPositionSet events on Fuji."
          muted
        />
      ) : positions.length === 0 ? (
        <EmptyState
          title="No positions yet"
          body="Back your first Twin market to start earning from every swap that routes through it."
          cta={{ label: "Open strategies", href: "/strategies" }}
        />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {positions.map((p) => (
            <PositionRow key={p.poolId} position={p} />
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── A single position row ────────────────────────────────────────────────

function PositionRow({ position }: { position: JitPosition }) {
  // Normalise to (usdc, latam) regardless of V4 currency sort so the
  // card always reads "{LATAM}/USDC" in the header and the per-side
  // amounts are tied to the right ticker.
  const usdcIsToken0 = position.token0.address === TOKENS.usdc.address;
  const usdc = usdcIsToken0 ? position.token0 : position.token1;
  const latam = usdcIsToken0 ? position.token1 : position.token0;
  const usdcAmount = usdcIsToken0 ? position.amount0 : position.amount1;
  const latamAmount = usdcIsToken0 ? position.amount1 : position.amount0;

  // 1:1 demo pricing — every LATAM stable is pegged to USD in our mocks,
  // so the committed-USD figure is just the sum of both sides.
  const committedUsd = formatAmount(
    usdcAmount + latamAmount,
    usdc.decimals,
    0,
  );
  const usdcUsd = formatAmount(usdcAmount, usdc.decimals, 0);
  const latamUsd = formatAmount(latamAmount, latam.decimals, 0);

  const issuerLabel =
    position.strategy?.issuer === "twin"
      ? "Twin"
      : position.strategy?.issuer === "ripio"
        ? "Ripio"
        : "Mock";
  const marketLabel = position.strategy?.marketLabel ?? "Unknown market";

  const inner = (
    <article className="group rounded-xl border border-white/[0.08] bg-card/80 p-4 transition-colors hover:border-cyan/40 sm:p-5">
      {/* ── Header — token pair + chain + status ──────────────────── */}
      <header className="mb-4 flex flex-wrap items-center gap-3">
        {/* Overlapping token avatars */}
        <div className="relative flex shrink-0">
          <span
            className="grid h-9 w-9 place-items-center rounded-full border-2 border-card text-[12px] font-bold text-black"
            style={{
              background: latam.accent,
              boxShadow: `0 0 12px ${latam.accent}66`,
            }}
            title={latam.symbol}
          >
            {symbolGlyph(latam.symbol)}
          </span>
          <span
            className="-ml-3 grid h-9 w-9 place-items-center rounded-full border-2 border-card text-[12px] font-bold text-black"
            style={{
              background: usdc.accent,
              boxShadow: `0 0 12px ${usdc.accent}66`,
            }}
            title={usdc.symbol}
          >
            {symbolGlyph(usdc.symbol)}
          </span>
        </div>

        <div className="leading-tight">
          <div className="text-[16px] font-semibold tracking-[-0.01em] text-white">
            {latam.symbol}/{usdc.symbol}
          </div>
          <div className="mt-0.5 text-[11px] text-white/45">
            {position.strategy?.marketFlag} {marketLabel} · {issuerLabel}
          </div>
        </div>

        <ChainPill targetChainId={position.targetChainId} />

        <ActiveBadge />
      </header>

      {/* ── Metric row — Range / Committed / amount0 / amount1 ───── */}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        <Metric
          label="Range"
          value="Full range"
          sub={`${formatTick(position.tickLower)} to ${formatTick(
            position.tickUpper,
          )}`}
        />
        <Metric
          label="Committed"
          value={`$${committedUsd}`}
          sub="USD declared"
          tint="cyan"
        />
        <Metric
          label={latam.symbol}
          value={formatAmount(latamAmount, latam.decimals, 0)}
          sub={`$${latamUsd}`}
        />
        <Metric
          label={usdc.symbol}
          value={formatAmount(usdcAmount, usdc.decimals, 0)}
          sub={`$${usdcUsd}`}
        />
      </dl>

      {/* ── Footer — strategy + snowtrace ─────────────────────────── */}
      <footer className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[11px]">
        {position.strategy ? (
          <Link
            href={`/strategies/${position.strategy.id}`}
            className="font-semibold text-cyan/85 transition-colors hover:text-white"
          >
            Open strategy →
          </Link>
        ) : (
          <span className="text-white/40">Pool not surfaced in this build</span>
        )}
        <a
          href={`${SNOWTRACE_TX}${position.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-mono text-white/50 transition-colors hover:text-white"
          title="View setJITPosition tx on Snowtrace"
        >
          {position.txHash.slice(0, 8)}…{position.txHash.slice(-6)}
          <ExternalLink className="h-3 w-3" />
        </a>
      </footer>
    </article>
  );

  return <li>{inner}</li>;
}

// ─── Atoms ─────────────────────────────────────────────────────────────────

function Metric({
  label,
  value,
  sub,
  tint = "white",
}: {
  label: string;
  value: string;
  sub?: string;
  tint?: "cyan" | "white";
}) {
  return (
    <div>
      <dt className="text-[9.5px] uppercase tracking-[0.22em] text-white/40">
        {label}
      </dt>
      <dd
        className={`mt-1 text-[18px] font-semibold tracking-[-0.01em] ${
          tint === "cyan" ? "text-cyan" : "text-white"
        }`}
      >
        {value}
      </dd>
      {sub && (
        <div className="mt-0.5 text-[10.5px] text-white/45">{sub}</div>
      )}
    </div>
  );
}

function ChainPill({ targetChainId }: { targetChainId: number }) {
  // Source chain is always Fuji on this build; targetChainId comes from
  // the JIT declaration itself. They'll match in the same-chain demo,
  // and diverge once the real cross-chain mainnet path lands.
  const sourceLabel = chainLabel(43113);
  const targetLabel = chainLabel(targetChainId);
  const sameChain = sourceLabel === targetLabel;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[10.5px] font-medium text-white/65">
      <span className="h-1.5 w-1.5 rounded-full bg-cyan shadow-[0_0_4px_#7FE5E5]" />
      {sameChain ? sourceLabel : `${sourceLabel} → ${targetLabel}`}
    </span>
  );
}

function ActiveBadge() {
  return (
    <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-cyan/35 bg-cyan/[0.08] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan">
      <Sparkles className="h-3 w-3" />
      Active
    </span>
  );
}

function EmptyState({
  title,
  body,
  cta,
  muted = false,
}: {
  title: string;
  body: string;
  cta?: { label: string; href: string };
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-white/[0.06] bg-black/30 px-5 py-8 text-center ${
        muted ? "opacity-70" : ""
      }`}
    >
      <div className="text-[14px] font-semibold text-white">{title}</div>
      <p className="mx-auto mt-1 max-w-[420px] text-[12px] leading-[1.55] text-white/55">
        {body}
      </p>
      {cta && (
        <Link
          href={cta.href}
          className="mt-4 inline-flex items-center rounded-lg bg-cyan px-4 py-2 text-[12px] font-semibold text-black transition-colors hover:bg-cyan-dim"
        >
          {cta.label} →
        </Link>
      )}
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

// Single-character avatar glyph. ARSt → "A", BRLt → "B", MXNt → "M", wARS
// → "A", USDC → "$". Lets us show the pair without bundling token SVGs
// for the demo. Real deploys would swap in 24x24 icons.
function symbolGlyph(symbol: string): string {
  if (symbol === "USDC") return "$";
  return symbol.replace(/^w/, "")[0]?.toUpperCase() ?? "?";
}

function chainLabel(chainId: number): string {
  if (chainId === 43113) return "Avalanche Fuji";
  if (chainId === 43114) return "Avalanche";
  if (chainId === 1) return "Ethereum";
  if (chainId === 8453) return "Base";
  if (chainId === 84532) return "Base Sepolia";
  return `Chain ${chainId}`;
}

// Ticks at the full-range boundaries are -887220 / 887220; show them as
// ±∞ in the UI because that's what they represent (the V4 price range
// extreme), not because the data is missing.
function formatTick(tick: number): string {
  if (tick <= -887220) return "−∞";
  if (tick >= 887220) return "+∞";
  return tick.toString();
}
