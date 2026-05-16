"use client";

import { useAccount } from "wagmi";
import { useSLPBalance } from "@/hooks/use-slp-balance";
import { TOKENS, TOKEN_LIST } from "@/lib/contracts";
import { formatAmount } from "@/lib/utils";

// The dashboard's centerpiece: side-by-side proof that the SAME 10k USDC
// works harder when deposited into the SLP than when LP'd into a single
// vanilla V4 pool. The visual asymmetry — one capital pile feeding three
// markets vs feeding one — is the whole pitch in one screen.
export function ComparisonCards() {
  const { isConnected } = useAccount();
  const slpUsdc = useSLPBalance(TOKENS.usdc);

  // Pretend-fees so the visual works before any swaps happen. Once swaps
  // start running these get replaced by SwapSettled-event sums (TODO when
  // hookData decoder lands).
  const vanillaFees = 87;
  const aqua0Fees = 87 + 63 + 51; // wARS + wBRL + wMXN
  const deposited = slpUsdc.balance ? slpUsdc.balance.deposited : 0n;
  const depositedHuman = formatAmount(deposited, TOKENS.usdc.decimals, 0);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* ── LEFT: Traditional vanilla LP ───────────────────────────────────── */}
      <div className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm">
        <div className="mb-1 text-[10px] uppercase tracking-[0.28em] text-white/40">
          Traditional LP · Vanilla V4
        </div>
        <h2 className="mb-5 text-2xl font-bold tracking-tight">
          Capital stuck in one pool
        </h2>

        <div className="mb-6 rounded-xl border border-white/10 bg-black/40 p-5">
          <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-white/40">
            Deployed
          </div>
          <div className="text-3xl font-extrabold">$10,000</div>
          <div className="mt-1 text-[12px] text-white/50">
            committed to wARS / USDC
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <MarketRow symbol="wARS" usd={vanillaFees} active />
          <MarketRow symbol="wBRL" usd={0} active={false} />
          <MarketRow symbol="wMXN" usd={0} active={false} />
        </div>

        <div className="mt-6 border-t border-white/10 pt-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-[0.28em] text-white/40">
              Total fees · 30d
            </span>
            <span className="text-2xl font-bold text-white/80">
              ${vanillaFees}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-white/40">
            1× multiplier on capital
          </div>
        </div>
      </div>

      {/* ── RIGHT: Aqua0 SLP ───────────────────────────────────────────────── */}
      <div className="relative rounded-2xl border border-cyan/40 bg-cyan/[0.05] p-6 backdrop-blur-sm cyan-glow-soft">
        <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-cyan">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan cyan-glow" />
          Aqua0 SLP · V4 + Hooks
        </div>
        <h2 className="mb-5 text-2xl font-bold tracking-tight">
          One deposit. Every market.
        </h2>

        <div className="mb-6 rounded-xl border border-cyan/30 bg-black/40 p-5">
          <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-white/40">
            Deposited to SLP
          </div>
          <div className="text-3xl font-extrabold text-cyan">
            {isConnected ? `$${depositedHuman}` : "$10,000"}
          </div>
          <div className="mt-1 text-[12px] text-white/50">
            backing 3 LATAM-stable pools simultaneously
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <MarketRow symbol="wARS" usd={87} active highlighted />
          <MarketRow symbol="wBRL" usd={63} active highlighted />
          <MarketRow symbol="wMXN" usd={51} active highlighted />
        </div>

        <div className="mt-6 border-t border-cyan/30 pt-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-[0.28em] text-cyan/70">
              Total fees · 30d
            </span>
            <span className="text-2xl font-bold text-cyan">${aqua0Fees}</span>
          </div>
          <div className="mt-1 text-[11px] text-cyan/70">
            {(aqua0Fees / vanillaFees).toFixed(1)}× multiplier on capital
          </div>
        </div>
      </div>
    </div>
  );
}

function MarketRow({
  symbol,
  usd,
  active,
  highlighted = false,
}: {
  symbol: string;
  usd: number;
  active: boolean;
  highlighted?: boolean;
}) {
  const token = TOKEN_LIST.find((t) => t.symbol === symbol);
  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm ${
        active
          ? highlighted
            ? "border-cyan/30 bg-cyan/[0.04]"
            : "border-white/10 bg-white/[0.02]"
          : "border-white/5 bg-white/[0.01] opacity-40"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{
            background: token?.accent ?? "#fff",
            boxShadow: active ? `0 0 6px ${token?.accent ?? "#fff"}` : "none",
          }}
        />
        <span className="font-medium">{symbol} / USDC</span>
      </div>
      <span
        className={
          active ? (highlighted ? "text-cyan" : "text-white") : "text-white/30"
        }
      >
        {active ? `$${usd}` : "—"}
      </span>
    </div>
  );
}
