"use client";

import { useAccount } from "wagmi";
import { useSLPBalance } from "@/hooks/use-slp-balance";
import { LATAM_STABLES, TOKENS, type TokenMeta } from "@/lib/contracts";
import { formatAmount } from "@/lib/utils";

// The dashboard's centerpiece: side-by-side proof that the SAME 10k USDC
// works harder when deposited into the SLP than when LP'd into a single
// vanilla V4 pool. Visually: one capital pile → six markets (3 Ripio + 3
// Twin) vs one capital pile → one market.
export function ComparisonCards() {
  const { isConnected } = useAccount();
  const slpUsdc = useSLPBalance(TOKENS.usdc);

  // Pretend-fees so the visual works before any swaps happen. Once swaps
  // start running these get replaced by SwapSettled-event sums.
  const ripio = [
    { token: TOKENS.wars, fees: 87 },
    { token: TOKENS.wbrl, fees: 63 },
    { token: TOKENS.wmxn, fees: 51 },
  ];
  const twin = [
    { token: TOKENS.arst, fees: 79 },
    { token: TOKENS.brlt, fees: 58 },
    { token: TOKENS.mxnt, fees: 44 },
  ];
  const vanillaFees = ripio[0].fees;
  const aqua0Fees = [...ripio, ...twin].reduce((sum, m) => sum + m.fees, 0);

  const deposited = slpUsdc.balance ? slpUsdc.balance.deposited : 0n;
  const depositedHuman = formatAmount(deposited, TOKENS.usdc.decimals, 0);
  const multiplier = (aqua0Fees / vanillaFees).toFixed(1);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* ── LEFT: Traditional vanilla LP ───────────────────────────────────── */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm">
        <div className="mb-1 text-[10px] uppercase tracking-[0.28em] text-white/40">
          Traditional LP · Vanilla V4
        </div>
        <h2 className="mb-5 text-2xl font-bold tracking-tight">
          Capital stuck in one pool
        </h2>

        <DepositSummary
          label="Deployed"
          amountUsd={isConnected ? `$${depositedHuman}` : "$10,000"}
          subtitle="committed to wARS / USDC"
        />

        <div className="mt-5 space-y-2 text-sm">
          <MarketRow token={ripio[0].token} usd={ripio[0].fees} active />
          {[...ripio.slice(1), ...twin].map((m) => (
            <MarketRow key={m.token.address} token={m.token} usd={0} active={false} />
          ))}
        </div>

        <FooterStats
          label="Total fees · 30d"
          value={`$${vanillaFees}`}
          sub="1× multiplier on capital"
          theme="white"
        />
      </div>

      {/* ── RIGHT: Aqua0 SLP — Ripio + Twin both backed ─────────────────────── */}
      <div className="rounded-2xl border border-cyan/40 bg-cyan/[0.05] p-6 backdrop-blur-sm cyan-glow-soft">
        <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-cyan">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan cyan-glow" />
          Aqua0 SLP · V4 + Hooks
        </div>
        <h2 className="mb-5 text-2xl font-bold tracking-tight">
          One deposit. Every issuer.
        </h2>

        <DepositSummary
          label="Deposited to SLP"
          amountUsd={isConnected ? `$${depositedHuman}` : "$10,000"}
          subtitle="backing 6 LATAM-stable pools simultaneously"
          themed
        />

        <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-2">
          <IssuerGroup label="Ripio" markets={ripio} />
          <IssuerGroup label="Twin" markets={twin} />
        </div>

        <FooterStats
          label="Total fees · 30d"
          value={`$${aqua0Fees}`}
          sub={`${multiplier}× multiplier on capital`}
          theme="cyan"
        />
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function DepositSummary({
  label,
  amountUsd,
  subtitle,
  themed = false,
}: {
  label: string;
  amountUsd: string;
  subtitle: string;
  themed?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        themed ? "border-cyan/30 bg-black/40" : "border-white/10 bg-black/40"
      }`}
    >
      <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-white/40">
        {label}
      </div>
      <div className={`text-3xl font-extrabold ${themed ? "text-cyan" : ""}`}>
        {amountUsd}
      </div>
      <div className="mt-1 text-[12px] text-white/50">{subtitle}</div>
    </div>
  );
}

function IssuerGroup({
  label,
  markets,
}: {
  label: string;
  markets: { token: TokenMeta; fees: number }[];
}) {
  return (
    <div>
      <div className="mb-2 text-[9.5px] uppercase tracking-[0.32em] text-cyan/70">
        {label}
      </div>
      <div className="space-y-1.5">
        {markets.map((m) => (
          <MarketRow
            key={m.token.address}
            token={m.token}
            usd={m.fees}
            active
            highlighted
            compact
          />
        ))}
      </div>
    </div>
  );
}

function MarketRow({
  token,
  usd,
  active,
  highlighted = false,
  compact = false,
}: {
  token: TokenMeta;
  usd: number;
  active: boolean;
  highlighted?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-3 ${
        compact ? "py-1.5 text-[12px]" : "py-2.5 text-sm"
      } ${
        active
          ? highlighted
            ? "border-cyan/30 bg-cyan/[0.04]"
            : "border-white/10 bg-white/[0.02]"
          : "border-white/5 bg-white/[0.01] opacity-40"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{
            background: token.accent,
            boxShadow: active ? `0 0 5px ${token.accent}` : "none",
          }}
        />
        <span className="font-medium">{token.symbol}</span>
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

function FooterStats({
  label,
  value,
  sub,
  theme,
}: {
  label: string;
  value: string;
  sub: string;
  theme: "white" | "cyan";
}) {
  return (
    <div
      className={`mt-6 border-t pt-4 ${
        theme === "cyan" ? "border-cyan/30" : "border-white/10"
      }`}
    >
      <div className="flex items-baseline justify-between">
        <span
          className={`text-[10px] uppercase tracking-[0.28em] ${
            theme === "cyan" ? "text-cyan/70" : "text-white/40"
          }`}
        >
          {label}
        </span>
        <span
          className={`text-2xl font-bold ${
            theme === "cyan" ? "text-cyan" : "text-white/80"
          }`}
        >
          {value}
        </span>
      </div>
      <div
        className={`mt-1 text-[11px] ${
          theme === "cyan" ? "text-cyan/70" : "text-white/40"
        }`}
      >
        {sub}
      </div>
    </div>
  );
}
