"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";
import { useJitPreference } from "@/hooks/use-jit-preference";
import { useSLPBalance } from "@/hooks/use-slp-balance";
import { TOKENS, type Strategy } from "@/lib/contracts";
import { cn, formatAmount } from "@/lib/utils";

// DeployLiquidityCard — the per-strategy "back this market" action.
//
// Conceptually: depositing into the SLP is a SEPARATE step that happens
// ONCE in /profile ("enter the system"). After that the LP's capital is
// eligible to back any Aqua0 strategy. This card is where the LP says
// "draw on my SLP balance for this specific pool" — that's it, one
// EIP-712 declaration on-chain, one signature.
//
// Critically: setJITPosition is DECLARATIVE — it does NOT transfer
// tokens. So an LP can back twin-arst with 20k, then back twin-brlt
// with the SAME 20k, then back twin-mxnt with the SAME 20k. The SLP
// balance never drops. The Aqua0 hook picks the min(declared,
// available) at swap time, so the capital is effectively shared across
// every strategy the LP backs. That's the magic moment the demo lives
// for — we surface the SLP balance prominently so the LP can SEE that
// it doesn't move between strategies.
//
// If the LP arrived here without depositing first, we don't try to be
// clever — we link them back to /profile to run the deposit flow. The
// happy path is meant to be sequential.

type BackStep = "idle" | "setting-jit" | "done" | "error";

// Default human amount when the LP opens the card. 20k matches the pitch
// number; the actual cap is `min(slpUsdc, slpLatam)`, surfaced inline.
const DEFAULT_AMOUNT = "20000";
const PRESETS = ["1000", "5000", "20000"] as const;

export function DeployLiquidityCard({ strategy }: { strategy: Strategy }) {
  const { isConnected } = useAccount();
  const usdcSlp = useSLPBalance(TOKENS.usdc);
  const latamSlp = useSLPBalance(strategy.token);

  const jit = useJitPreference();

  const [amount, setAmount] = useState<string>(DEFAULT_AMOUNT);
  const [step, setStep] = useState<BackStep>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const amountRaw = useMemo(() => {
    if (!amount) return 0n;
    try {
      return parseUnits(amount, TOKENS.usdc.decimals);
    } catch {
      return 0n;
    }
  }, [amount]);

  // SLP must cover the declaration on BOTH sides — declaring 20k of USDC
  // depth needs 20k USDC sitting in the LP's SLP balance, and likewise
  // for the LATAM side. setJITPosition itself doesn't enforce this (it
  // just emits the event), but the Aqua0 hook would silently fall back
  // to min(declared, available), so the user-visible number on this
  // page should reflect what the hook will actually draw.
  const slpUsdc = usdcSlp.balance?.available ?? 0n;
  const slpLatam = latamSlp.balance?.available ?? 0n;
  const usdcShort = isConnected && amountRaw > 0n && slpUsdc < amountRaw;
  const latamShort = isConnected && amountRaw > 0n && slpLatam < amountRaw;
  const slpEmpty = isConnected && slpUsdc === 0n && slpLatam === 0n;

  const isRunning = step === "setting-jit";

  async function handleBack() {
    if (amountRaw === 0n) return;
    setErrorMsg(null);
    setStep("setting-jit");
    const jitHash = await jit.setPreference(strategy, amount);
    if (!jitHash) {
      setErrorMsg(jit.error ?? "setJITPosition failed");
      setStep("error");
      return;
    }
    // SLP balances don't change (setJIT is declarative) but the user
    // might top up + redeclare, so refresh anyway.
    usdcSlp.refetch();
    latamSlp.refetch();
    setStep("done");
  }

  const disabled =
    !isConnected ||
    isRunning ||
    amountRaw === 0n ||
    usdcShort ||
    latamShort ||
    slpEmpty;

  return (
    <div
      id="deploy"
      className="relative scroll-mt-24 overflow-hidden rounded-xl border border-cyan/25 bg-cyan/[0.04] p-5 sm:p-6"
    >
      <div
        className="pointer-events-none absolute -top-16 -right-12 h-40 w-40 rounded-full opacity-40 blur-3xl"
        style={{ backgroundColor: "rgba(127, 229, 229, 0.18)" }}
      />

      <header className="relative mb-4">
        <div className="text-[10px] uppercase tracking-[0.28em] text-cyan">
          Add liquidity
        </div>
        <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.015em] text-white">
          Back this strategy
        </h2>
        <p className="mt-1.5 text-[12.5px] leading-[1.55] text-white/65">
          Authorise the Aqua0 hook to draw on your{" "}
          <span className="text-white">SLP balance</span> for swaps on this
          pool. One signature.{" "}
          <span className="text-cyan">
            Your capital isn&apos;t moved or locked
          </span>
          {" "}— after this you can back the other Twin markets too without
          re-depositing.
        </p>
      </header>

      {/* ── Amount input ───────────────────────────────────────────── */}
      <div className="relative mb-4">
        <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-white/40">
          <span>JIT depth per side</span>
          <span>USDC + {strategy.token.symbol}</span>
        </div>
        <input
          inputMode="decimal"
          placeholder="0"
          value={amount}
          disabled={isRunning}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "" || /^\d*\.?\d*$/.test(v)) setAmount(v);
          }}
          className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-[22px] font-bold tracking-[-0.02em] outline-none placeholder:text-white/20 focus:border-cyan/60 disabled:opacity-50"
        />
        <div className="mt-2.5 flex gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(p)}
              disabled={isRunning}
              className={cn(
                "flex-1 rounded-lg border px-3 py-1.5 text-[11.5px] font-semibold transition-colors",
                amount === p
                  ? "border-cyan/60 bg-cyan/[0.08] text-cyan"
                  : "border-white/10 bg-white/[0.02] text-white/70 hover:border-white/25",
                isRunning && "opacity-50",
              )}
            >
              {Number(p).toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* ── SLP balance — what's actually backing this declaration ─── */}
      <div className="relative mb-4 grid grid-cols-2 gap-2">
        <SideBalance
          symbol={TOKENS.usdc.symbol}
          accent={TOKENS.usdc.accent}
          slp={
            isConnected
              ? formatAmount(slpUsdc, TOKENS.usdc.decimals, 0)
              : "—"
          }
          warn={usdcShort}
        />
        <SideBalance
          symbol={strategy.token.symbol}
          accent={strategy.token.accent}
          slp={
            isConnected
              ? formatAmount(slpLatam, strategy.token.decimals, 0)
              : "—"
          }
          warn={latamShort}
        />
      </div>

      {/* ── Single on-chain step ──────────────────────────────────── */}
      <div className="relative mb-4 rounded-lg border border-white/[0.06] bg-black/30 px-3.5 py-3">
        <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-white/40">
          On-chain step
        </div>
        <ol className="space-y-1.5">
          <StepRow
            n={1}
            label={`Declare ${amount || "—"} of JIT depth per side`}
            state={stepStateFor(step, "setting-jit")}
          />
        </ol>
        <p className="mt-2 text-[10.5px] leading-[1.45] text-white/40">
          setJITPosition emits an event — no tokens move. The same SLP
          balance can back every Twin market.
        </p>
      </div>

      {/* ── CTA ────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => void handleBack()}
        disabled={disabled}
        className={cn(
          "relative w-full rounded-lg px-6 py-3 text-[13px] font-semibold transition-colors",
          disabled
            ? "cursor-not-allowed border border-white/10 bg-white/[0.03] text-white/40"
            : "bg-cyan text-black hover:bg-cyan-dim",
        )}
      >
        {ctaLabel(step, {
          isConnected,
          slpEmpty,
          usdcShort,
          latamShort,
          latamSymbol: strategy.token.symbol,
        })}
      </button>

      {errorMsg && (
        <p className="relative mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
          {errorMsg}
        </p>
      )}

      {step === "done" && (
        <p className="relative mt-3 text-[12px] leading-[1.55] text-cyan/85">
          ✓ Backed. Same SLP balance — open another Twin market and back
          it too.
        </p>
      )}

      {slpEmpty && !isRunning && (
        <p className="relative mt-3 text-[11.5px] leading-[1.55] text-white/55">
          Your SLP balance is empty. Head to{" "}
          <Link
            href="/profile"
            className="underline decoration-cyan/40 underline-offset-4 hover:decoration-cyan"
          >
            /profile
          </Link>{" "}
          first to deposit USDC + {strategy.token.symbol} into the pool.
        </p>
      )}

      {(usdcShort || latamShort) && !slpEmpty && !isRunning && (
        <p className="relative mt-3 text-[11.5px] leading-[1.55] text-white/55">
          Need more{" "}
          {usdcShort && latamShort
            ? `${TOKENS.usdc.symbol} + ${strategy.token.symbol}`
            : usdcShort
            ? TOKENS.usdc.symbol
            : strategy.token.symbol}{" "}
          in the SLP? Top up at{" "}
          <Link
            href="/profile"
            className="underline decoration-cyan/40 underline-offset-4 hover:decoration-cyan"
          >
            /profile
          </Link>
          .
        </p>
      )}
    </div>
  );
}

// ─── SLP balance summary for one side of the pair ─────────────────────────
// We deliberately don't show the wallet balance here. The SLP balance is
// what the hook can actually pull from; the wallet balance is irrelevant
// to backing a strategy once the deposit step ran in /profile.
function SideBalance({
  symbol,
  accent,
  slp,
  warn,
}: {
  symbol: string;
  accent: string;
  slp: string;
  warn: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-black/30 px-3.5 py-2.5 transition-colors",
        warn
          ? "border-amber-400/40"
          : "border-white/[0.06]",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: accent, boxShadow: `0 0 6px ${accent}88` }}
        />
        <span className="text-[12px] font-semibold text-white">{symbol}</span>
      </div>
      <dl className="mt-1.5 space-y-0.5 text-[10.5px]">
        <div className="flex items-center justify-between">
          <dt className="uppercase tracking-[0.18em] text-white/40">In SLP</dt>
          <dd className="font-mono text-cyan/85">{slp}</dd>
        </div>
      </dl>
    </div>
  );
}

// ─── A row in the on-chain steps list ──────────────────────────────────────

type StepState = "pending" | "active" | "done" | "error";

function StepRow({
  n,
  label,
  state,
}: {
  n: number;
  label: string;
  state: StepState;
}) {
  const labelColor =
    state === "active" || state === "done"
      ? "text-white"
      : state === "error"
      ? "text-red-300"
      : "text-white/50";

  return (
    <li className="flex items-center gap-2.5">
      <div
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-colors",
          state === "done"
            ? "border-cyan bg-cyan text-black"
            : state === "active"
            ? "border-cyan text-cyan"
            : state === "error"
            ? "border-red-400/60 text-red-300"
            : "border-white/15 text-white/40",
        )}
      >
        {state === "done" ? <Check className="h-3 w-3" /> : n}
      </div>
      <span className={cn("text-[12px]", labelColor)}>
        {label}
        {state === "active" && (
          <span className="ml-1.5 text-cyan/70">· signing</span>
        )}
      </span>
    </li>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function stepStateFor(current: BackStep, target: BackStep): StepState {
  if (current === "done") return "done";
  if (current === "error") return current === target ? "error" : "pending";
  if (current === target) return "active";
  return "pending";
}

function ctaLabel(
  step: BackStep,
  flags: {
    isConnected: boolean;
    slpEmpty: boolean;
    usdcShort: boolean;
    latamShort: boolean;
    latamSymbol: string;
  },
): string {
  if (!flags.isConnected) return "Connect wallet to back";
  if (flags.slpEmpty) return "Deposit to SLP first";
  if (flags.usdcShort && flags.latamShort)
    return `Need USDC + ${flags.latamSymbol} in SLP`;
  if (flags.usdcShort) return "Need more USDC in SLP";
  if (flags.latamShort) return `Need more ${flags.latamSymbol} in SLP`;
  switch (step) {
    case "setting-jit":
      return "Signing setJITPosition…";
    case "done":
      return "Backed ✓ — open another market";
    case "error":
      return "Retry";
    default:
      return "Back this strategy";
  }
}
