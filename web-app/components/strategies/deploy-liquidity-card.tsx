"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useJitPreference } from "@/hooks/use-jit-preference";
import { useSLPBalance } from "@/hooks/use-slp-balance";
import type { Strategy } from "@/lib/contracts";
import { TOKENS } from "@/lib/contracts";
import { cn, formatAmount } from "@/lib/utils";

// DeployLiquidityCard — the per-strategy "deploy" action.
//
// Mental model the user has: "deposit USDC into this pool's strategy."
// What it actually does on-chain: call SLP.setJITPosition(poolId, fullRange,
// amount0, amount1). The deposit step is decoupled (LP deposits into the
// SLP once via /profile; here they declare how much of that SLP balance
// can be drawn to back THIS specific pool).
//
// We expose preset amounts (1k / 5k / 20k) so a judge can deploy without
// typing. The button takes the user from a single click to a settled JIT
// authorisation in one transaction.

const PRESETS = ["1000", "5000", "20000"] as const;

export function DeployLiquidityCard({ strategy }: { strategy: Strategy }) {
  const { isConnected } = useAccount();
  const usdcSlp = useSLPBalance(TOKENS.usdc);
  const jit = useJitPreference();
  const [amount, setAmount] = useState<string>("");
  const [success, setSuccess] = useState(false);

  const slpUsdc = usdcSlp.balance?.deposited ?? 0n;
  const slpUsdcHuman = formatAmount(slpUsdc, TOKENS.usdc.decimals, 2);
  const hasAnyDeposit = slpUsdc > 0n;

  async function handleDeploy() {
    if (!amount) return;
    setSuccess(false);
    const hash = await jit.setPreference({
      poolId: strategy.poolId,
      amount0Human: amount,
      amount1Human: amount,
      // All seven mocks are 6 decimals, simplifies the maths here.
      decimals0: TOKENS.usdc.decimals,
      decimals1: strategy.token.decimals,
    });
    if (hash) setSuccess(true);
  }

  const disabled = !isConnected || jit.isPending || !amount;

  return (
    <div className="relative overflow-hidden rounded-xl border border-cyan/25 bg-cyan/[0.04] p-5 sm:p-6">
      <div
        className="pointer-events-none absolute -top-16 -right-12 h-40 w-40 rounded-full opacity-40 blur-3xl"
        style={{ backgroundColor: "rgba(127, 229, 229, 0.18)" }}
      />

      <header className="relative mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.28em] text-cyan">
            Deploy liquidity
          </div>
          <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.015em] text-white">
            Back this pool
          </h2>
          <p className="mt-1.5 max-w-[440px] text-[12.5px] leading-[1.55] text-white/65">
            Authorise the Aqua0 hook to draw from your SLP balance{" "}
            <span className="text-white">just-in-time</span> for every swap
            on{" "}
            <span className="text-cyan">
              {strategy.token.symbol}/USDC
            </span>
            . One signature.
          </p>
        </div>
      </header>

      {/* ── SLP balance hint ────────────────────────────────────────── */}
      <div className="relative mb-4 flex items-center justify-between rounded-lg border border-white/[0.06] bg-black/30 px-3.5 py-2.5">
        <span className="text-[10px] uppercase tracking-[0.22em] text-white/45">
          Your USDC in SLP
        </span>
        <span className="font-mono text-[12.5px] text-white/85">
          {isConnected ? slpUsdcHuman : "—"}
        </span>
      </div>

      {/* ── Amount input + presets ──────────────────────────────────── */}
      <div className="relative">
        <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-white/40">
          <span>Amount (USDC)</span>
          <span>per side · full range</span>
        </div>

        <input
          inputMode="decimal"
          placeholder="0"
          value={amount}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "" || /^\d*\.?\d*$/.test(v)) setAmount(v);
          }}
          className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-[22px] font-bold tracking-[-0.02em] outline-none placeholder:text-white/20 focus:border-cyan/60"
        />

        <div className="mt-2.5 flex gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(p)}
              className={cn(
                "flex-1 rounded-lg border px-3 py-1.5 text-[11.5px] font-semibold transition-colors",
                amount === p
                  ? "border-cyan/60 bg-cyan/[0.08] text-cyan"
                  : "border-white/10 bg-white/[0.02] text-white/70 hover:border-white/25",
              )}
            >
              {Number(p).toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* ── Deploy CTA ─────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => void handleDeploy()}
        disabled={disabled}
        className={cn(
          "relative mt-5 w-full rounded-lg px-6 py-3 text-[13px] font-semibold transition-colors",
          disabled
            ? "cursor-not-allowed border border-white/10 bg-white/[0.03] text-white/40"
            : "bg-cyan text-black hover:bg-cyan-dim",
        )}
      >
        {!isConnected
          ? "Connect wallet to deploy"
          : jit.isPending
          ? "Signing…"
          : success
          ? "Deployed ✓ — sign again to update"
          : "Deploy liquidity"}
      </button>

      {/* ── Feedback / hint ────────────────────────────────────────── */}
      {jit.error && (
        <p className="relative mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
          {jit.error}
        </p>
      )}

      {isConnected && !hasAnyDeposit && !success && (
        <p className="relative mt-3 text-[11.5px] leading-[1.55] text-white/55">
          Tip: deposit USDC in{" "}
          <a
            href="/profile"
            className="underline decoration-cyan/40 underline-offset-4 hover:decoration-cyan"
          >
            your profile
          </a>{" "}
          first — JIT auths fire against your SLP balance at swap time.
        </p>
      )}
    </div>
  );
}
