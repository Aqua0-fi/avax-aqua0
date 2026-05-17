"use client";

import { useMemo, useState } from "react";
import { Check, ExternalLink } from "lucide-react";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";
import { useWalletBalance } from "@/hooks/use-slp-balance";
import { useVanillaDeposit, type VanillaDepositStep } from "@/hooks/use-vanilla-deposit";
import { TOKENS, type Strategy } from "@/lib/contracts";
import { cn, formatAmount } from "@/lib/utils";

// VanillaDepositCard — per-strategy "add liquidity" action for vanilla pools.
//
// Critically different from DeployLiquidityCard:
//   * Funds go straight from the user's wallet into the V4 pool via the
//     FujiLiquidityRouter — no SLP, no JIT preference.
//   * Two approves (currency0, currency1) + one modifyLiquidity tx. Up to
//     three signatures, depending on existing allowances.
//
// Lives here so the comparison reads honestly: vanilla LPs commit equal
// value of both sides and earn fees from this pair only. Aqua0 LPs commit
// once and the SLP backs every market.

const PRESETS = ["1000", "5000", "10000"] as const;
const SNOWTRACE_TX = "https://testnet.snowtrace.io/tx/";

export function VanillaDepositCard({ strategy }: { strategy: Strategy }) {
  const { isConnected } = useAccount();
  const usdcWallet = useWalletBalance(TOKENS.usdc);
  const tokenWallet = useWalletBalance(strategy.token);

  const vanilla = useVanillaDeposit();
  const [amount, setAmount] = useState<string>("");

  const amountRaw = useMemo(() => {
    if (!amount) return 0n;
    try {
      return parseUnits(amount, TOKENS.usdc.decimals);
    } catch {
      return 0n;
    }
  }, [amount]);

  const usdcShort =
    isConnected && amountRaw > 0n && (usdcWallet.balance ?? 0n) < amountRaw;
  const tokenShort =
    isConnected && amountRaw > 0n && (tokenWallet.balance ?? 0n) < amountRaw;
  const isRunning =
    vanilla.step === "approving-currency0" ||
    vanilla.step === "approving-currency1" ||
    vanilla.step === "depositing";

  async function handleDeposit() {
    if (amountRaw === 0n) return;
    if (vanilla.step === "done" || vanilla.step === "error") vanilla.reset();
    const hash = await vanilla.deposit(strategy, amount);
    if (hash) {
      usdcWallet.refetch();
      tokenWallet.refetch();
    }
  }

  const disabled =
    !isConnected ||
    isRunning ||
    amountRaw === 0n ||
    usdcShort ||
    tokenShort;

  return (
    <div
      id="deposit"
      className="relative scroll-mt-24 overflow-hidden rounded-xl border border-white/12 bg-card p-5 sm:p-6"
    >
      <header className="mb-4">
        <div className="text-[10px] uppercase tracking-[0.28em] text-white/45">
          Add liquidity · vanilla
        </div>
        <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.015em] text-white">
          Wallet → V4 pool
        </h2>
        <p className="mt-1.5 text-[12.5px] leading-[1.55] text-white/60">
          Funds go{" "}
          <span className="border-b border-dotted border-white/30 text-white/85">
            straight from your wallet
          </span>{" "}
          into the {strategy.token.symbol}/USDC pool via the V4 PoolManager.
          No SLP, no JIT — this is what a traditional LP looks like, and the
          control group for the Aqua0 comparison.
        </p>
      </header>

      {/* ── Amount input ───────────────────────────────────────────── */}
      <div className="mb-4">
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
          className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-[22px] font-bold tracking-[-0.02em] outline-none placeholder:text-white/20 focus:border-white/40 disabled:opacity-50"
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
                  ? "border-white/40 bg-white/[0.05] text-white"
                  : "border-white/10 bg-white/[0.02] text-white/70 hover:border-white/25",
                isRunning && "opacity-50",
              )}
            >
              {Number(p).toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* ── Both sides — wallet balances only (no SLP for vanilla) ── */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        <SideBalance
          symbol={TOKENS.usdc.symbol}
          accent={TOKENS.usdc.accent}
          wallet={
            isConnected
              ? formatAmount(usdcWallet.balance, TOKENS.usdc.decimals, 0)
              : "—"
          }
          warn={usdcShort}
        />
        <SideBalance
          symbol={strategy.token.symbol}
          accent={strategy.token.accent}
          wallet={
            isConnected
              ? formatAmount(tokenWallet.balance, strategy.token.decimals, 0)
              : "—"
          }
          warn={tokenShort}
        />
      </div>

      {/* ── On-chain steps ─────────────────────────────────────────── */}
      <div className="mb-4 rounded-lg border border-white/[0.06] bg-black/30 px-3.5 py-3">
        <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-white/40">
          On-chain steps
        </div>
        <ol className="space-y-1.5">
          <StepRow
            n={1}
            label="Approve USDC for the V4 router"
            state={stepStateFor(vanilla.step, "approving-currency0")}
          />
          <StepRow
            n={2}
            label={`Approve ${strategy.token.symbol} for the V4 router`}
            state={stepStateFor(vanilla.step, "approving-currency1")}
          />
          <StepRow
            n={3}
            label={`Add ${amount || "—"} per side to the pool`}
            state={stepStateFor(vanilla.step, "depositing")}
          />
        </ol>
        <p className="mt-2 text-[10.5px] leading-[1.45] text-white/40">
          Approvals are skipped automatically if the router already has
          allowance.
        </p>
      </div>

      {/* ── CTA ────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => void handleDeposit()}
        disabled={disabled}
        className={cn(
          "w-full rounded-lg px-6 py-3 text-[13px] font-semibold transition-colors",
          disabled
            ? "cursor-not-allowed border border-white/10 bg-white/[0.03] text-white/40"
            : "bg-white text-black hover:bg-white/85",
        )}
      >
        {ctaLabel(
          vanilla.step,
          isConnected,
          usdcShort,
          tokenShort,
          strategy.token.symbol,
        )}
      </button>

      {vanilla.error && (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
          {vanilla.error.slice(0, 240)}
        </p>
      )}

      {vanilla.step === "done" && vanilla.txHash && (
        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11.5px]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-white/80">
              ✓ Liquidity added to {strategy.token.symbol}/USDC.
            </span>
            <a
              href={`${SNOWTRACE_TX}${vanilla.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-white/65 transition-colors hover:text-white"
            >
              {vanilla.txHash.slice(0, 8)}…{vanilla.txHash.slice(-6)}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      {(usdcShort || tokenShort) && !isRunning && (
        <p className="mt-3 text-[11.5px] leading-[1.55] text-white/55">
          Need more{" "}
          {usdcShort && tokenShort
            ? `${TOKENS.usdc.symbol} + ${strategy.token.symbol}`
            : usdcShort
            ? TOKENS.usdc.symbol
            : strategy.token.symbol}
          ? Mint at the{" "}
          <a
            href="/faucet"
            className="underline decoration-white/40 underline-offset-4 hover:decoration-white"
          >
            faucet
          </a>
          .
        </p>
      )}
    </div>
  );
}

// ─── A wallet balance summary for one side of the pair ─────────────────────
function SideBalance({
  symbol,
  accent,
  wallet,
  warn,
}: {
  symbol: string;
  accent: string;
  wallet: string;
  warn: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-black/30 px-3.5 py-2.5 transition-colors",
        warn ? "border-amber-400/40" : "border-white/[0.06]",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: accent, boxShadow: `0 0 6px ${accent}88` }}
        />
        <span className="text-[12px] font-semibold text-white">{symbol}</span>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10.5px]">
        <span className="uppercase tracking-[0.18em] text-white/40">Wallet</span>
        <span
          className={cn(
            "font-mono",
            warn ? "text-amber-300" : "text-white/75",
          )}
        >
          {wallet}
        </span>
      </div>
    </div>
  );
}

// ─── A row in the on-chain steps list ───────────────────────────────────────

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
            ? "border-white bg-white text-black"
            : state === "active"
            ? "border-white text-white"
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
          <span className="ml-1.5 text-white/70">· signing</span>
        )}
      </span>
    </li>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function stepStateFor(
  current: VanillaDepositStep,
  target: VanillaDepositStep,
): StepState {
  if (current === "done") return "done";
  if (current === "error") return current === target ? "error" : "pending";
  const order: VanillaDepositStep[] = [
    "approving-currency0",
    "approving-currency1",
    "depositing",
  ];
  const ci = order.indexOf(current);
  const ti = order.indexOf(target);
  if (ci === -1 || ti === -1) return "pending";
  if (ti < ci) return "done";
  if (ti === ci) return "active";
  return "pending";
}

function ctaLabel(
  step: VanillaDepositStep,
  isConnected: boolean,
  usdcShort: boolean,
  tokenShort: boolean,
  tokenSymbol: string,
): string {
  if (!isConnected) return "Connect wallet to deposit";
  if (usdcShort && tokenShort) return `Need USDC + ${tokenSymbol}`;
  if (usdcShort) return "Need USDC in wallet";
  if (tokenShort) return `Need ${tokenSymbol} in wallet`;
  switch (step) {
    case "approving-currency0":
      return "Approving USDC…";
    case "approving-currency1":
      return `Approving ${tokenSymbol}…`;
    case "depositing":
      return "Adding liquidity…";
    case "done":
      return "Added ✓ — run again to top up";
    case "error":
      return "Retry";
    default:
      return "Add liquidity";
  }
}
