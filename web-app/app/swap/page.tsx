import { HeroWaves } from "@/components/aquatic-waves";
import { DotMark } from "@/components/dot-mark";
import { Navbar } from "@/components/navbar";
import { SwapForm } from "@/components/swap/swap-form";

// /swap — trade against the 6 aqua0 pools. The form on the left is the
// interactive surface; the panel on the right explains the routing model
// so a judge clicking around understands what's happening on-chain without
// reading docs. On-chain wiring (swap router + V4 quoter) lands in a
// follow-up commit — until then the form is a UI preview.
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
            Routed through Aqua0 hook
          </div>
          <h1 className="text-[clamp(32px,4.5vw,52px)] font-bold leading-none tracking-[-0.025em] text-white">
            Swap
          </h1>
          <p className="mt-4 max-w-[680px] text-[14px] leading-[1.55] text-white/60">
            Trade USDC against any of the six LATAM stablecoins. Every swap
            settles on a Uniswap V4 pool whose liquidity is amplified by the
            Aqua0 hook pulling from the{" "}
            <span className="border-b border-dotted border-cyan/60 text-white">
              Shared Liquidity Pool just-in-time
            </span>
            .
          </p>
        </section>

        {/* ── Form + Route info ────────────────────────────────────────── */}
        <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <SwapForm />
          <RouteInfo />
        </section>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Sidebar — explains how a swap settles end-to-end on Aqua0 without forcing
   the user to read docs. Numbered steps mirror the on-chain execution path.
   ─────────────────────────────────────────────────────────────────────────── */

function RouteInfo() {
  return (
    <aside className="rounded-2xl border border-cyan/25 bg-cyan/[0.03] p-6 backdrop-blur-sm">
      <header className="mb-4">
        <div className="text-[10px] uppercase tracking-[0.28em] text-cyan">
          How this routes
        </div>
        <h2 className="mt-1 text-[18px] font-bold tracking-[-0.015em]">
          One pool. Six markets of depth.
        </h2>
      </header>

      <ol className="space-y-3.5 text-[13px] leading-relaxed text-white/75">
        <Step
          n={1}
          title="You sign one transaction"
          body="Standard V4 swap on the USDC ↔ LATAM stable pool you selected. No off-chain signer touches your trade."
        />
        <Step
          n={2}
          title="Aqua0Hook fires beforeSwap"
          body="The hook reads each LP's JIT preference and pulls SLP capital into the pool transient-style for this swap window only."
        />
        <Step
          n={3}
          title="Trade executes against amplified depth"
          body="Your swap routes against the seeded V4 liquidity plus the JIT capital — the same SLP deposit backs all 6 aqua0 pools."
        />
        <Step
          n={4}
          title="afterSwap settles the capital"
          body="Fees credit each LP's SLP balance. Capital is released so the same deposit can back the next swap on any of the other 5 pools."
        />
      </ol>

      <div className="mt-5 rounded-xl border border-white/10 bg-black/40 p-3.5 text-[11.5px] leading-relaxed text-white/55">
        <span className="text-cyan">No backend signer.</span> JIT preferences
        are EIP-712 payloads signed by each LP&apos;s own wallet. Your
        capital never leaves the SLP without your signature.
      </div>
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
