import { Navbar } from "@/components/navbar";
import { SwapForm } from "@/components/swap/swap-form";

// /swap — trade against the 6 aqua0 pools. The form on the left is the
// interactive surface; the panel on the right explains the routing model so
// a judge clicking around understands what's happening on-chain without
// reading docs. On-chain wiring (swap router + V4 quoter) lands in a
// follow-up commit — until then the form is a UI preview.
export default function SwapPage() {
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

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-[1180px] px-6 pt-8 pb-8 sm:px-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-black/40 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.3em] text-white/85 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan cyan-glow" />
          Routed through Aqua0 hook
        </div>

        <h1 className="mt-6 text-[clamp(32px,4.6vw,56px)] font-extrabold leading-[1.05] tracking-[-0.025em]">
          Swap
        </h1>
        <p className="mt-3 max-w-[640px] text-[14.5px] leading-relaxed text-white/60 sm:text-[15.5px]">
          Trade USDC against any of the six LATAM stablecoins. Every swap
          settles on a Uniswap V4 pool whose liquidity is amplified by the
          Aqua0 hook pulling from the Shared Liquidity Pool just in time.
        </p>
      </section>

      {/* ── Form + Route info ────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto grid max-w-[1180px] gap-5 px-6 pb-16 sm:px-10 lg:grid-cols-[1fr_1fr]">
        <SwapForm />
        <RouteInfo />
      </section>
    </main>
  );
}

// ─── Sidebar: how the swap routes ───────────────────────────────────────────
function RouteInfo() {
  return (
    <aside className="rounded-2xl border border-cyan/25 bg-cyan/[0.03] p-5 backdrop-blur-sm sm:p-6">
      <header className="mb-4">
        <div className="text-[10px] uppercase tracking-[0.28em] text-cyan">
          How this routes
        </div>
        <h2 className="mt-1 text-base font-bold">
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
          body="Fees credit the SLP balance per LP. Capital is released so the same deposit can back the next swap on any of the other 5 pools."
        />
      </ol>

      <div className="mt-5 rounded-xl border border-white/10 bg-black/40 p-3.5 text-[11.5px] leading-relaxed text-white/55">
        <span className="text-cyan">No backend signer.</span> JIT preferences
        are EIP-712 payloads signed by each LP&apos;s own wallet. Your capital
        never leaves the SLP without your signature.
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
        <div className="text-[13px] font-semibold">{title}</div>
        <div className="mt-0.5 text-[12px] text-white/55">{body}</div>
      </div>
    </li>
  );
}
