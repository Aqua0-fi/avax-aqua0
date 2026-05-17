import Link from "next/link";
import { HeroWaves } from "@/components/aquatic-waves";
import { DotMark } from "@/components/dot-mark";
import { Navbar } from "@/components/navbar";
import { FeeComparison } from "@/components/swap/fee-comparison";

// /swap — the demo's quantitative panel. We don't render a swap form here
// any more (the previous build had one as a UI preview only). The page is
// dedicated to one thing: showing how many fees Aqua0 pools earned vs the
// vanilla baselines under the same simulated trading activity.
//
// Data flow: a `forge script SimulateSwaps` run seeds Swap events across all
// 5 pools. `usePoolStats` reads them from PoolManager and groups them into
// Aqua0 vs vanilla. `FeeComparison` renders the side-by-side comparison.
export default function SwapPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <HeroWaves />
      <Navbar />

      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 lg:px-8">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.3em] text-white/60">
            <DotMark />
            Trading activity · simulated on Fuji
          </div>
          <h1 className="text-[clamp(32px,4.5vw,52px)] font-bold leading-none tracking-[-0.025em] text-white">
            Where the fees go
          </h1>
          <p className="mt-4 max-w-[680px] text-[14px] leading-[1.55] text-white/60">
            We ran the same batch of trades through every pool on this
            deployment — two vanilla V4 pools and three Aqua0-hooked pools.
            Same fee tier, same total volume. The Aqua0 LP earns from{" "}
            <span className="border-b border-dotted border-cyan/60 text-white">
              three Twin markets at once
            </span>
            ; the vanilla LP earns from the two pools their capital is split
            across.
          </p>
        </section>

        {/* ── Comparison panel ─────────────────────────────────────────── */}
        <FeeComparison />

        {/* ── How the data lands here ──────────────────────────────────── */}
        <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.015] p-5 sm:p-6">
          <div className="mb-3 inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.28em] text-white/55">
            <DotMark />
            How the numbers got here
          </div>
          <ol className="grid gap-3 text-[13px] leading-relaxed text-white/70 md:grid-cols-3">
            <Step
              n={1}
              title="SimulateSwaps script"
              body="A Forge script signs 20 mixed swaps from the deployer wallet — 12 against the Twin Aqua0 pools, 8 against the Ripio vanilla pools."
            />
            <Step
              n={2}
              title="V4 PoolManager emits"
              body="Each settlement emits a Swap log with amount0, amount1 and the realised fee tier — exactly the shape we'd read in production."
            />
            <Step
              n={3}
              title="Frontend aggregates"
              body="usePoolStats reads logs via publicClient.getLogs, groups by poolId, and totals fees + volume per side. Refetches every 10s."
            />
          </ol>
          <div className="mt-4 text-[11.5px] text-white/40">
            Open a strategy detail in{" "}
            <Link
              href="/strategies"
              className="underline decoration-cyan/40 underline-offset-4 hover:decoration-cyan hover:text-cyan/90"
            >
              /strategies
            </Link>{" "}
            to back your own Twin market and start earning from this same
            event stream.
          </div>
        </section>
      </div>
    </div>
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
