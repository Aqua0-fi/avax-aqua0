"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useMint } from "@/hooks/use-mint";
import { useDeposit } from "@/hooks/use-deposit";
import { useJitPreference } from "@/hooks/use-jit-preference";
import { useSLPBalance, useWalletBalance } from "@/hooks/use-slp-balance";
import { TOKEN_LIST, TOKENS, type TokenMeta } from "@/lib/contracts";
import { formatAmount } from "@/lib/utils";

const DEMO_AMOUNT = "10000"; // 10,000 of each token — clean demo math
const STEPS = [
  { id: 1, title: "Mint mock tokens", body: "Get 10k of each LATAM stable from both Ripio and Twin." },
  { id: 2, title: "Deposit to SLP", body: "Drop 10k USDC into the shared liquidity pool." },
  { id: 3, title: "Back 6 pools at once", body: "Declare your capital as JIT liquidity for all 3 Ripio + 3 Twin markets." },
  { id: 4, title: "Watch fees accrue", body: "Same deposit, six markets, fees from all of them." },
] as const;

// The step-by-step action panel that walks a connected user through the demo
// in a deterministic order. Each step's button enables once the previous one
// has produced its on-chain effect — keeps the judge experience scripted.
export function ActionPanel() {
  const { isConnected } = useAccount();
  const [currentStep, setCurrentStep] = useState(1);

  const usdcWallet = useWalletBalance(TOKENS.usdc);
  const usdcSlp = useSLPBalance(TOKENS.usdc);

  const mint = useMint();
  const deposit = useDeposit();
  const jit = useJitPreference();

  const tokensMintedEnough =
    usdcWallet.balance !== undefined &&
    usdcWallet.balance >= BigInt(10_000) * 10n ** BigInt(TOKENS.usdc.decimals);
  const depositedEnough =
    usdcSlp.balance !== undefined &&
    usdcSlp.balance.deposited >=
      BigInt(10_000) * 10n ** BigInt(TOKENS.usdc.decimals);

  async function handleMintAll() {
    // Mint USDC + all 3 Ripio + all 3 Twin in sequence. Each call is a
    // separate tx — bundling would be nicer but adds an EIP-7702 / smart-
    // wallet dependency we don't need for the hackathon.
    for (const token of TOKEN_LIST) {
      await mint.mint(token, DEMO_AMOUNT);
    }
    await usdcWallet.refetch();
    setCurrentStep(2);
  }

  async function handleDeposit() {
    await deposit.deposit(TOKENS.usdc, DEMO_AMOUNT);
    await usdcSlp.refetch();
    setCurrentStep(3);
  }

  async function handleSetJitAll() {
    await jit.backAllLatamPools(DEMO_AMOUNT);
    setCurrentStep(4);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm">
      <div className="mb-1 text-[10px] uppercase tracking-[0.28em] text-white/40">
        Demo flow · {currentStep} of 4
      </div>
      <h3 className="mb-6 text-xl font-bold">Walk the judge through it</h3>

      <ol className="space-y-3">
        {STEPS.map((s) => {
          const done = s.id < currentStep;
          const active = s.id === currentStep;
          return (
            <li
              key={s.id}
              className={`flex items-start gap-4 rounded-xl border px-4 py-3.5 ${
                active
                  ? "border-cyan/50 bg-cyan/[0.04]"
                  : done
                  ? "border-white/10 bg-white/[0.02] opacity-60"
                  : "border-white/5 bg-white/[0.01] opacity-40"
              }`}
            >
              <div
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  done
                    ? "bg-cyan text-black"
                    : active
                    ? "border border-cyan text-cyan"
                    : "border border-white/15 text-white/40"
                }`}
              >
                {done ? "✓" : s.id}
              </div>
              <div className="flex-1">
                <div className={`font-semibold ${done || active ? "text-white" : "text-white/40"}`}>
                  {s.title}
                </div>
                <div className="mt-0.5 text-[12.5px] text-white/55">
                  {s.body}
                </div>
              </div>
              {active && isConnected && (
                <StepButton
                  step={s.id}
                  onMint={handleMintAll}
                  onDeposit={handleDeposit}
                  onSetJit={handleSetJitAll}
                  mintBusy={mint.isPending}
                  depositBusy={deposit.step !== "idle" && deposit.step !== "done" && deposit.step !== "error"}
                  jitBusy={jit.isPending}
                />
              )}
            </li>
          );
        })}
      </ol>

      <BalanceStrip
        token={TOKENS.usdc}
        walletBalance={usdcWallet.balance}
        slpDeposited={usdcSlp.balance?.deposited}
      />
    </div>
  );
}

function StepButton({
  step,
  onMint,
  onDeposit,
  onSetJit,
  mintBusy,
  depositBusy,
  jitBusy,
}: {
  step: number;
  onMint: () => Promise<void>;
  onDeposit: () => Promise<void>;
  onSetJit: () => Promise<void>;
  mintBusy: boolean;
  depositBusy: boolean;
  jitBusy: boolean;
}) {
  if (step === 1) {
    return (
      <button
        onClick={onMint}
        disabled={mintBusy}
        className="rounded-full bg-cyan px-4 py-2 text-xs font-semibold text-black transition hover:bg-cyan-dim disabled:opacity-60"
      >
        {mintBusy ? "Minting…" : "Mint all"}
      </button>
    );
  }
  if (step === 2) {
    return (
      <button
        onClick={onDeposit}
        disabled={depositBusy}
        className="rounded-full bg-cyan px-4 py-2 text-xs font-semibold text-black transition hover:bg-cyan-dim disabled:opacity-60"
      >
        {depositBusy ? "Depositing…" : "Deposit 10k"}
      </button>
    );
  }
  if (step === 3) {
    return (
      <button
        onClick={onSetJit}
        disabled={jitBusy}
        className="rounded-full bg-cyan px-4 py-2 text-xs font-semibold text-black transition hover:bg-cyan-dim disabled:opacity-60"
      >
        {jitBusy ? "Signing…" : "Back 6 pools"}
      </button>
    );
  }
  return (
    <span className="text-[11px] uppercase tracking-[0.22em] text-cyan">
      Live
    </span>
  );
}

function BalanceStrip({
  token,
  walletBalance,
  slpDeposited,
}: {
  token: TokenMeta;
  walletBalance: bigint | undefined;
  slpDeposited: bigint | undefined;
}) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-black/40 p-4 text-xs">
      <div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">
          Wallet {token.symbol}
        </div>
        <div className="mt-1 text-base font-bold">
          {formatAmount(walletBalance, token.decimals, 2)}
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-cyan/70">
          SLP {token.symbol}
        </div>
        <div className="mt-1 text-base font-bold text-cyan">
          {formatAmount(slpDeposited, token.decimals, 2)}
        </div>
      </div>
    </div>
  );
}
