"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";
import { useDeposit } from "@/hooks/use-deposit";
import { useJitPreference } from "@/hooks/use-jit-preference";
import { useSLPBalance, useWalletBalance } from "@/hooks/use-slp-balance";
import { TOKENS, type Strategy } from "@/lib/contracts";
import { cn, formatAmount } from "@/lib/utils";

// DeployLiquidityCard — the per-strategy "add liquidity" action.
//
// LPing a V4 pool is pair-balanced: to back a USDC/wARS pool with $1k of
// depth on each side you need to commit 1,000 USDC + 1,000 wARS. This
// component runs the full sequence end-to-end:
//
//   1. Deposit `amount` USDC  into the SLP (approve if allowance < amount)
//   2. Deposit `amount` LATAM into the SLP (approve if allowance < amount)
//   3. Call SLP.setJITPosition(poolId, fullRange, amount, amount) to
//      authorise the Aqua0 hook to draw on those balances during swaps.
//
// All three steps run client-side via wagmi — no API, no signer service.
// Preset buttons (1k / 5k / 20k) let a judge deploy without typing.

type DeployStep =
  | "idle"
  | "depositing-usdc"
  | "depositing-latam"
  | "setting-jit"
  | "done"
  | "error";

const PRESETS = ["1000", "5000", "20000"] as const;

export function DeployLiquidityCard({ strategy }: { strategy: Strategy }) {
  const { isConnected } = useAccount();
  const usdcWallet = useWalletBalance(TOKENS.usdc);
  const usdcSlp = useSLPBalance(TOKENS.usdc);
  const latamWallet = useWalletBalance(strategy.token);
  const latamSlp = useSLPBalance(strategy.token);

  const deposit = useDeposit();
  const jit = useJitPreference();

  const [amount, setAmount] = useState<string>("");
  const [step, setStep] = useState<DeployStep>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const amountRaw = useMemo(() => {
    if (!amount) return 0n;
    try {
      return parseUnits(amount, TOKENS.usdc.decimals);
    } catch {
      return 0n;
    }
  }, [amount]);

  // Wallet must cover the deposit on BOTH sides — USDC and the LATAM stable.
  const usdcShort =
    isConnected &&
    amountRaw > 0n &&
    (usdcWallet.balance ?? 0n) < amountRaw;
  const latamShort =
    isConnected &&
    amountRaw > 0n &&
    (latamWallet.balance ?? 0n) < amountRaw;
  const isRunning =
    step === "depositing-usdc" ||
    step === "depositing-latam" ||
    step === "setting-jit";

  async function handleDeploy() {
    if (amountRaw === 0n) return;
    setErrorMsg(null);
    setStep("depositing-usdc");

    const usdcHash = await deposit.deposit(TOKENS.usdc, amount);
    if (!usdcHash) {
      setErrorMsg(deposit.error ?? "USDC deposit failed");
      setStep("error");
      return;
    }

    setStep("depositing-latam");
    const latamHash = await deposit.deposit(strategy.token, amount);
    if (!latamHash) {
      setErrorMsg(deposit.error ?? `${strategy.token.symbol} deposit failed`);
      setStep("error");
      return;
    }

    setStep("setting-jit");
    const jitHash = await jit.setPreference({
      poolId: strategy.poolId,
      amount0Human: amount,
      amount1Human: amount,
      decimals0: TOKENS.usdc.decimals,
      decimals1: strategy.token.decimals,
    });
    if (!jitHash) {
      setErrorMsg(jit.error ?? "setJITPosition failed");
      setStep("error");
      return;
    }

    // Refresh balances so the UI reflects the new state immediately.
    usdcWallet.refetch();
    usdcSlp.refetch();
    latamWallet.refetch();
    latamSlp.refetch();

    setStep("done");
  }

  const disabled =
    !isConnected ||
    isRunning ||
    amountRaw === 0n ||
    usdcShort ||
    latamShort;

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
          Provide both sides
        </h2>
        <p className="mt-1.5 text-[12.5px] leading-[1.55] text-white/65">
          LPing this pool means committing equal value of{" "}
          <span className="text-white">USDC</span> and{" "}
          <span className="text-cyan">{strategy.token.symbol}</span>. We
          deposit both into the SLP and authorise the hook to draw them
          just-in-time during swaps.
        </p>
      </header>

      {/* ── Amount input ───────────────────────────────────────────── */}
      <div className="relative mb-4">
        <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-white/40">
          <span>Amount per side</span>
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

      {/* ── Both sides — wallet + SLP balances ────────────────────── */}
      <div className="relative mb-4 grid grid-cols-2 gap-2">
        <SideBalance
          symbol={TOKENS.usdc.symbol}
          accent={TOKENS.usdc.accent}
          wallet={
            isConnected
              ? formatAmount(usdcWallet.balance, TOKENS.usdc.decimals, 0)
              : "—"
          }
          slp={
            isConnected
              ? formatAmount(usdcSlp.balance?.deposited, TOKENS.usdc.decimals, 0)
              : "—"
          }
          warn={usdcShort}
        />
        <SideBalance
          symbol={strategy.token.symbol}
          accent={strategy.token.accent}
          wallet={
            isConnected
              ? formatAmount(latamWallet.balance, strategy.token.decimals, 0)
              : "—"
          }
          slp={
            isConnected
              ? formatAmount(latamSlp.balance?.deposited, strategy.token.decimals, 0)
              : "—"
          }
          warn={latamShort}
        />
      </div>

      {/* ── Steps ──────────────────────────────────────────────────── */}
      <div className="relative mb-4 rounded-lg border border-white/[0.06] bg-black/30 px-3.5 py-3">
        <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-white/40">
          On-chain steps
        </div>
        <ol className="space-y-1.5">
          <StepRow
            n={1}
            label={`Deposit ${amount || "—"} USDC`}
            state={stepStateFor(step, "depositing-usdc")}
          />
          <StepRow
            n={2}
            label={`Deposit ${amount || "—"} ${strategy.token.symbol}`}
            state={stepStateFor(step, "depositing-latam")}
          />
          <StepRow
            n={3}
            label="Set JIT preference for this pool"
            state={stepStateFor(step, "setting-jit")}
          />
        </ol>
      </div>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => void handleDeploy()}
        disabled={disabled}
        className={cn(
          "relative w-full rounded-lg px-6 py-3 text-[13px] font-semibold transition-colors",
          disabled
            ? "cursor-not-allowed border border-white/10 bg-white/[0.03] text-white/40"
            : "bg-cyan text-black hover:bg-cyan-dim",
        )}
      >
        {ctaLabel(step, isConnected, usdcShort, latamShort, strategy.token.symbol)}
      </button>

      {errorMsg && (
        <p className="relative mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
          {errorMsg}
        </p>
      )}

      {step === "done" && (
        <p className="relative mt-3 text-[12px] leading-[1.55] text-cyan/85">
          ✓ Liquidity deployed. Your SLP capital now backs swaps on{" "}
          {strategy.token.symbol}/USDC.
        </p>
      )}

      {(usdcShort || latamShort) && !isRunning && (
        <p className="relative mt-3 text-[11.5px] leading-[1.55] text-white/55">
          Need more{" "}
          {usdcShort && latamShort
            ? `${TOKENS.usdc.symbol} + ${strategy.token.symbol}`
            : usdcShort
            ? TOKENS.usdc.symbol
            : strategy.token.symbol}
          ? Mint at the{" "}
          <a
            href="/faucet"
            className="underline decoration-cyan/40 underline-offset-4 hover:decoration-cyan"
          >
            faucet
          </a>
          .
        </p>
      )}
    </div>
  );
}

// ─── A wallet / SLP balance summary for one side of the pair ────────────────
function SideBalance({
  symbol,
  accent,
  wallet,
  slp,
  warn,
}: {
  symbol: string;
  accent: string;
  wallet: string;
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
          <dt className="uppercase tracking-[0.18em] text-white/40">Wallet</dt>
          <dd
            className={cn(
              "font-mono",
              warn ? "text-amber-300" : "text-white/75",
            )}
          >
            {wallet}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="uppercase tracking-[0.18em] text-white/40">In SLP</dt>
          <dd className="font-mono text-cyan/85">{slp}</dd>
        </div>
      </dl>
    </div>
  );
}

// ─── A row in the on-chain steps list ──────────────────────────────────────

type StepState = "pending" | "active" | "done" | "skipped" | "error";

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

function stepStateFor(current: DeployStep, target: DeployStep): StepState {
  if (current === "done") return "done";
  if (current === "error") {
    // Surface the failing step; everything before it should already be done.
    return current === target ? "error" : "pending";
  }
  const order: DeployStep[] = [
    "depositing-usdc",
    "depositing-latam",
    "setting-jit",
  ];
  const ci = order.indexOf(current);
  const ti = order.indexOf(target);
  if (ti < ci) return "done";
  if (ti === ci) return "active";
  return "pending";
}

function ctaLabel(
  step: DeployStep,
  isConnected: boolean,
  usdcShort: boolean,
  latamShort: boolean,
  latamSymbol: string,
): string {
  if (!isConnected) return "Connect wallet to deploy";
  if (usdcShort && latamShort)
    return `Need USDC + ${latamSymbol} in wallet`;
  if (usdcShort) return "Need USDC in wallet";
  if (latamShort) return `Need ${latamSymbol} in wallet`;
  switch (step) {
    case "depositing-usdc":
      return "Depositing USDC…";
    case "depositing-latam":
      return `Depositing ${latamSymbol}…`;
    case "setting-jit":
      return "Setting JIT preference…";
    case "done":
      return "Deployed ✓ — run again to top up";
    case "error":
      return "Retry";
    default:
      return "Add liquidity";
  }
}
