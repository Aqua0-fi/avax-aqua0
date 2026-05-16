"use client";

import { useAccount } from "wagmi";
import { useSLPBalance } from "@/hooks/use-slp-balance";
import { LATAM_STABLES, TOKENS } from "@/lib/contracts";
import { formatAmount } from "@/lib/utils";

// Sum of USDC deposit + (for the LATAM stables) deposited treated 1:1 with
// USD. Demo accounting — fine because all our 1:1 pools assume parity.
//
// Layout mirrors the production aqua0 hero metrics row: solid card surface,
// 10px uppercase labels, 24px bold number, optional sub-label.
export function KpiStrip() {
  const { isConnected } = useAccount();
  const usdc = useSLPBalance(TOKENS.usdc);
  const wars = useSLPBalance(TOKENS.wars);
  const wbrl = useSLPBalance(TOKENS.wbrl);
  const wmxn = useSLPBalance(TOKENS.wmxn);
  const arst = useSLPBalance(TOKENS.arst);
  const brlt = useSLPBalance(TOKENS.brlt);
  const mxnt = useSLPBalance(TOKENS.mxnt);

  const balances = [usdc, wars, wbrl, wmxn, arst, brlt, mxnt];
  const totalDeposited = balances.reduce(
    (sum, b) => sum + (b.balance?.deposited ?? 0n),
    0n,
  );
  const totalAvailable = balances.reduce(
    (sum, b) => sum + (b.balance?.available ?? 0n),
    0n,
  );

  // All 7 mocks at 6 decimals so summing raw bigints + formatting once is OK.
  const totalDepositedHuman = formatAmount(totalDeposited, 6, 0);
  const totalAvailableHuman = formatAmount(totalAvailable, 6, 0);

  const placeholder = !isConnected;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Kpi
        label="Total deposited"
        value={placeholder ? "$0" : `$${totalDepositedHuman}`}
        tint="cyan"
      />
      <Kpi
        label="Available"
        value={placeholder ? "$0" : `$${totalAvailableHuman}`}
      />
      <Kpi
        label="Markets backed"
        value={placeholder ? "0" : `${LATAM_STABLES.length}`}
        sub="aqua0 pools"
      />
      <Kpi
        label="Capital multiplier"
        value={placeholder ? "0×" : "6×"}
        sub="vs vanilla LPing"
        tint="cyan"
      />
    </div>
  );
}

function Kpi({
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
    <div
      className={`rounded-xl border p-4 transition-colors ${
        tint === "cyan"
          ? "border-cyan/30 bg-cyan/[0.04]"
          : "border-white/10 bg-card hover:border-white/20"
      }`}
    >
      <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">
        {label}
      </div>
      <div
        className={`mt-1.5 text-[24px] font-bold tracking-[-0.02em] ${
          tint === "cyan" ? "text-cyan" : "text-white"
        }`}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-0.5 text-[11px] text-white/45">{sub}</div>
      )}
    </div>
  );
}
