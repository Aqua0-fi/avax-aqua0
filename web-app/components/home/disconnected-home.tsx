import Link from "next/link";
import { HeroWaves } from "@/components/aquatic-waves";
import { DotMark } from "@/components/dot-mark";
import { Comparison } from "@/components/home/comparison";
import { Founders } from "@/components/home/founders";
import { Navbar } from "@/components/navbar";

// DisconnectedHome — the marketing landing rendered to first-time judges /
// LPs who haven't connected a wallet. Long-form: hero + DemoCTA + 3-step
// explainer + Problem/Solution split + Founder bios + stats + footer.
//
// Mirrors the structure of aqua0.xyz so the Avalanche edition reads as a
// regional cousin of the same product. Once the user connects, page.tsx
// switches to ConnectedHome (compact dashboard hub).
export function DisconnectedHome() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <HeroWaves />
      <Navbar />

      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 lg:px-8">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="mb-14">
          <div className="mb-3 inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.3em] text-white/60">
            <DotMark />
            Live · Avalanche Fuji
          </div>
          <h1 className="max-w-[960px] text-[clamp(36px,5.4vw,72px)] font-bold leading-[0.98] tracking-[-0.03em] text-white">
            One deposit.
            <span className="block text-white/35">Every LATAM market.</span>
          </h1>
          <p className="mt-5 max-w-[680px] text-[15px] leading-[1.6] text-white/60">
            Aqua0 is cross-margin prime brokerage for DeFi. Deposit once into
            the Shared Liquidity Pool — the same capital backs{" "}
            <span className="border-b border-dotted border-cyan/60 text-white">
              Ripio&apos;s wARS, wBRL, wMXN and Twin&apos;s ARSt, BRLt, MXNt
            </span>{" "}
            simultaneously. Six markets, one deposit, no fragmentation. Built
            as a Uniswap V4 hook, deployed to Avalanche.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <Link
              href="/strategies"
              className="rounded-lg bg-cyan px-5 py-2.5 text-[13px] font-semibold text-black transition-colors hover:bg-cyan-dim"
            >
              See the strategies →
            </Link>
            <Link
              href="/profile"
              className="rounded-lg border border-white/20 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:border-white"
            >
              Connect wallet
            </Link>
          </div>
        </section>

        {/* ── Demo CTA card with corner cyan glow ──────────────────────── */}
        <DemoCTA />

        {/* ── 3-step explainer ──────────────────────────────────────────── */}
        <div className="mt-8">
          <PoolsExplainer />
        </div>

        {/* ── Problem / Solution comparison ──────────────────────────── */}
        <Comparison />

        {/* ── Founder bios ───────────────────────────────────────────── */}
        <Founders />

        {/* ── Quick stats strip ─────────────────────────────────────── */}
        <section className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] sm:grid-cols-4">
          <Stat value="6" label="Aqua0 pools" />
          <Stat value="2" label="Issuers" sub="Ripio + Twin" />
          <Stat value="$0" label="Backend signers" sub="LP signs JIT auths" />
          <Stat value="6×" label="Capital multiplier" sub="vs vanilla LPing" highlighted />
        </section>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="relative z-10 mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 border-t border-white/10 pt-6 text-[12px] text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Built for the Avalanche Institutional DeFi hackathon · LATAM
            stablecoin liquidity layer
          </span>
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

/* ────────────────────────────────────────────────────────────────────────────
   Demo CTA card — bold cyan-glow corner accent, paired with the two demo
   entrypoints (run the happy path + faucet).
   ─────────────────────────────────────────────────────────────────────────── */

function DemoCTA() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-card">
      <div
        className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full opacity-40 blur-3xl"
        style={{ backgroundColor: "rgba(127, 229, 229, 0.18)" }}
      />
      <div className="relative flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center">
        <div className="flex-1">
          <div className="mb-3 inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.3em] text-white/60">
            <DotMark />
            Drive the demo
          </div>
          <h2 className="text-[24px] font-bold tracking-[-0.02em] text-white">
            Three buttons. Six markets backed.
          </h2>
          <p className="mt-2 max-w-[640px] text-[13px] leading-[1.55] text-white/60">
            Mint mock LATAM stables, deposit 20k USDC into the SLP, and back
            all six aqua0 pools with one signature. No backend, no waitlist —
            the entire happy path is on the profile page.
          </p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row">
          <Link
            href="/profile"
            className="rounded-lg bg-cyan px-5 py-2.5 text-center text-[13px] font-semibold text-black transition-colors hover:bg-cyan-dim"
          >
            Run the happy path
          </Link>
          <Link
            href="/faucet"
            className="rounded-lg border border-white/20 px-5 py-2.5 text-center text-[13px] font-semibold text-white transition-colors hover:border-white"
          >
            Faucet →
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   3-step explainer — orients first-time visitors with chunky pixel-art SVGs.
   ─────────────────────────────────────────────────────────────────────────── */

function PoolsExplainer() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.015] p-8">
      <div className="grid gap-8 md:grid-cols-3">
        <ExplainerStep
          n="01"
          title="Deposit once"
          body="Add USDC + any LATAM stable to the Shared Liquidity Pool. Your tokens stay in one contract — no per-pool fragmentation."
          art={<ExplainerArt1 />}
        />
        <ExplainerStep
          n="02"
          title="Back every market"
          body={
            <>
              The Aqua0 V4 hook draws on your SLP balance{" "}
              <span className="border-b border-dotted border-white/40 text-white">
                just-in-time
              </span>
              , as each swap fires.
            </>
          }
          art={<ExplainerArt2 />}
        />
        <ExplainerStep
          n="03"
          title="Earn everywhere"
          body="Fees accrue from all six Ripio + Twin pools. The same 20k that would back one vanilla pair now backs six."
          art={<ExplainerArt3 />}
        />
      </div>
    </div>
  );
}

function ExplainerStep({
  n,
  title,
  body,
  art,
}: {
  n: string;
  title: string;
  body: React.ReactNode;
  art: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-[80px] items-center justify-center text-cyan">
        {art}
      </div>
      <div className="text-[11px] tracking-[0.1em] text-cyan">{n}</div>
      <div className="text-[16px] font-semibold tracking-[-0.01em] text-white">
        {title}
      </div>
      <div className="text-[13px] leading-[1.55] text-white/60">{body}</div>
    </div>
  );
}

function ExplainerArt1() {
  return (
    <svg viewBox="0 0 120 60" width="100%" height="100%" aria-hidden="true">
      <rect
        x="50"
        y="14"
        width="22"
        height="22"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.5"
      />
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={52 + (i % 2) * 8}
          y={18 + Math.floor(i / 2) * 8}
          width="3"
          height="3"
          fill="currentColor"
        />
      ))}
      <text
        x="60"
        y="48"
        fontSize="6"
        fill="currentColor"
        opacity="0.5"
        textAnchor="middle"
        letterSpacing="0.14em"
      >
        SLP
      </text>
    </svg>
  );
}

function ExplainerArt2() {
  return (
    <svg viewBox="0 0 120 60" width="100%" height="100%" aria-hidden="true">
      <rect x="50" y="20" width="20" height="20" rx="2" fill="none" stroke="currentColor" />
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={52 + (i % 2) * 8}
          y={22 + Math.floor(i / 2) * 8}
          width="3"
          height="3"
          fill="currentColor"
        />
      ))}
      {[
        [10, 10],
        [10, 40],
        [100, 25],
      ].map(([x, y], i) => (
        <g key={i}>
          <rect x={x} y={y} width="12" height="12" rx="1.5" fill="none" stroke="currentColor" strokeOpacity="0.6" />
          {[0, 1].map((j) => (
            <rect key={j} x={x + 2 + j * 4} y={y + 2} width="2" height="2" fill="currentColor" />
          ))}
        </g>
      ))}
      {[
        ...Array.from({ length: 5 }).map((_, k) => ({
          x: 22 + (50 - 22) * (k / 5),
          y: 16 + (26 - 16) * (k / 5),
        })),
        ...Array.from({ length: 5 }).map((_, k) => ({
          x: 22 + (50 - 22) * (k / 5),
          y: 46 + (34 - 46) * (k / 5),
        })),
        ...Array.from({ length: 5 }).map((_, k) => ({
          x: 70 + (100 - 70) * (k / 5),
          y: 30 + (31 - 30) * (k / 5),
        })),
      ].map((p, i) => (
        <rect key={i} x={p.x} y={p.y} width="1.6" height="1.6" fill="currentColor" opacity="0.4" />
      ))}
    </svg>
  );
}

function ExplainerArt3() {
  const bars: Array<[number, number]> = [
    [12, 4],
    [26, 8],
    [40, 14],
    [54, 12],
    [68, 20],
    [82, 26],
    [96, 32],
    [110, 38],
  ];
  return (
    <svg viewBox="0 0 120 60" width="100%" height="100%" aria-hidden="true">
      {bars.map(([x, h], i) => (
        <g key={i}>
          {Array.from({ length: Math.ceil(h / 3) }).map((_, j) => (
            <rect
              key={j}
              x={x}
              y={50 - j * 3}
              width="2.5"
              height="2.5"
              fill="currentColor"
              opacity={0.35 + j * 0.07}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

function Stat({
  value,
  label,
  sub,
  highlighted = false,
}: {
  value: string;
  label: string;
  sub?: string;
  highlighted?: boolean;
}) {
  return (
    <div className="bg-background px-5 py-6">
      <div
        className={`text-3xl font-bold tracking-tight ${
          highlighted ? "text-cyan" : "text-white"
        }`}
      >
        {value}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-white/45">
        {label}
      </div>
      {sub && (
        <div className="mt-0.5 text-[11px] text-white/40">{sub}</div>
      )}
    </div>
  );
}
