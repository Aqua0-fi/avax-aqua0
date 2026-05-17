"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useAccount } from "wagmi";
import { DotMark } from "@/components/dot-mark";
import { useJitPositions, type JitPosition } from "@/hooks/use-jit-positions";
import { TOKENS } from "@/lib/contracts";
import { formatAmount } from "@/lib/utils";

// ActivePositions — the centrepiece of /profile once the LP starts backing
// strategies. Reads the JITPositionSet event stream (via useJitPositions)
// and renders one card per (lp, poolId) latest declaration.
//
// Why this matters for the demo: the moment the LP backs a second
// strategy, this dashboard shows TWO cards backed by the SAME SLP
// balance. After backing all three Twin pools the LP sees three cards
// and the KpiStrip's "Total in SLP" hasn't moved. That's the pitch made
// visible.
//
// Empty state nudges first-timers towards /strategies. Disconnected
// state nudges them to connect.

const SNOWTRACE_TX = "https://testnet.snowtrace.io/tx/";

export function ActivePositions() {
  const { isConnected } = useAccount();
  const { positions, isLoading } = useJitPositions();

  return (
    <section className="rounded-xl border border-cyan/25 bg-cyan/[0.03] p-5 sm:p-6">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.28em] text-cyan">
            <DotMark />
            Active positions
          </div>
          <h2 className="text-[18px] font-semibold tracking-[-0.015em] text-white">
            Strategies you&apos;re backing
          </h2>
          <p className="mt-1 max-w-[640px] text-[12.5px] leading-[1.55] text-white/60">
            Each card is a{" "}
            <code className="font-mono text-cyan/85">setJITPosition</code>{" "}
            declaration on-chain — the Aqua0 hook draws on your SLP
            balance for these pools at swap time. Same capital, every
            position.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-cyan/30 bg-cyan/[0.06] px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.18em] text-cyan">
          {isConnected ? positions.length : 0} active
        </span>
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
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {positions.map((p) => (
            <PositionCard key={p.poolId} position={p} />
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── A single position card ────────────────────────────────────────────────

function PositionCard({ position }: { position: JitPosition }) {
  // Pick the non-USDC token for the headline avatar / accent so the card
  // visually reads as "{LATAM stable}-backed", not "USDC-paired-with-X".
  const latam =
    position.token0.address === TOKENS.usdc.address
      ? position.token1
      : position.token0;
  const usdc =
    position.token0.address === TOKENS.usdc.address
      ? position.token0
      : position.token1;
  const usdcAmount =
    position.token0.address === TOKENS.usdc.address
      ? position.amount0
      : position.amount1;
  const latamAmount =
    position.token0.address === TOKENS.usdc.address
      ? position.amount1
      : position.amount0;

  const issuerLabel =
    position.strategy?.issuer === "twin"
      ? "Twin"
      : position.strategy?.issuer === "ripio"
        ? "Ripio"
        : "Mock";
  const marketLabel = position.strategy?.marketLabel ?? "Unknown market";
  const marketFlag = position.strategy?.marketFlag ?? "";

  return (
    <li className="group flex h-full flex-col rounded-lg border border-white/10 bg-card p-4 transition-colors hover:border-cyan/40">
      {/* ── Header — token avatar + symbol + issuer chip ────────────── */}
      <header className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{
              background: latam.accent,
              boxShadow: `0 0 8px ${latam.accent}88`,
            }}
          />
          <div className="leading-tight">
            <div className="text-[13.5px] font-semibold tracking-[-0.01em] text-white">
              {latam.symbol} / {usdc.symbol}
            </div>
            <div className="mt-0.5 text-[10.5px] text-white/45">
              {marketFlag} {marketLabel} · {issuerLabel}
            </div>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-cyan/30 bg-cyan/10 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-cyan">
          Backing
        </span>
      </header>

      {/* ── Amounts declared ────────────────────────────────────────── */}
      <dl className="mb-3 grid grid-cols-2 gap-2">
        <AmountCell
          label={latam.symbol}
          value={formatAmount(latamAmount, latam.decimals, 0)}
          accent={latam.accent}
        />
        <AmountCell
          label={usdc.symbol}
          value={formatAmount(usdcAmount, usdc.decimals, 0)}
          accent={usdc.accent}
        />
      </dl>

      {/* ── Footer — detail link + Snowtrace ────────────────────────── */}
      <div className="mt-auto flex items-center justify-between border-t border-white/[0.06] pt-3 text-[11px]">
        {position.strategy ? (
          <Link
            href={`/strategies/${position.strategy.id}`}
            className="font-semibold text-cyan transition-colors hover:text-white"
          >
            Strategy →
          </Link>
        ) : (
          <span className="text-white/40">No strategy page</span>
        )}
        <a
          href={`${SNOWTRACE_TX}${position.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-mono text-white/50 transition-colors hover:text-white"
          title="View setJITPosition tx on Snowtrace"
        >
          {position.txHash.slice(0, 6)}…{position.txHash.slice(-4)}
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </li>
  );
}

function AmountCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-md border border-white/[0.06] bg-black/30 px-3 py-2">
      <div className="flex items-center gap-1.5">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: accent }}
        />
        <span className="text-[9.5px] uppercase tracking-[0.18em] text-white/40">
          {label}
        </span>
      </div>
      <div className="mt-0.5 font-mono text-[13.5px] font-semibold text-white">
        {value}
      </div>
    </div>
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
      className={`rounded-lg border border-white/[0.06] bg-black/30 px-5 py-6 text-center ${
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
