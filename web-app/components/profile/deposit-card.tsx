"use client";

import { useMemo, useState } from "react";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";
import { TokenSelect } from "@/components/swap/token-select";
import { useDeposit } from "@/hooks/use-deposit";
import { useSLPBalance, useWalletBalance } from "@/hooks/use-slp-balance";
import { TOKEN_LIST, TOKENS, type TokenMeta } from "@/lib/contracts";
import { cn, formatAmount } from "@/lib/utils";

// DepositCard — the general-purpose 'move wallet → SLP' surface on /profile.
//
// JitActions has a one-click "Deposit all wallet balances" step for the
// demo's happy path; this card complements it for picking any single token
// at any amount. Reuses the TokenSelect dropdown from the swap surface so
// the UI stays consistent.

export function DepositCard() {
  const { isConnected } = useAccount();
  const [token, setToken] = useState<TokenMeta>(TOKENS.usdc);
  const [amount, setAmount] = useState<string>("");

  const wallet = useWalletBalance(token);
  const slp = useSLPBalance(token);
  const deposit = useDeposit();

  const amountRaw = useMemo(() => {
    if (!amount) return 0n;
    try {
      return parseUnits(amount, token.decimals);
    } catch {
      return 0n;
    }
  }, [amount, token.decimals]);

  const insufficient =
    isConnected &&
    amountRaw > 0n &&
    (wallet.balance ?? 0n) < amountRaw;

  const isRunning =
    deposit.step === "checking" ||
    deposit.step === "approving" ||
    deposit.step === "depositing";

  async function handleDeposit() {
    if (amountRaw === 0n) return;
    const hash = await deposit.deposit(token, amount);
    if (hash) {
      // Refresh wallet + SLP so the row above reflects the new state.
      wallet.refetch();
      slp.refetch();
      setAmount("");
    }
  }

  function handleMax() {
    if (!isConnected || wallet.balance === undefined) return;
    setAmount(formatAmount(wallet.balance, token.decimals, 6));
  }

  function handleSelectToken(t: TokenMeta) {
    setToken(t);
    setAmount(""); // Reset because the new token may have a different scale.
    deposit.reset();
  }

  const disabled = !isConnected || isRunning || amountRaw === 0n || insufficient;

  return (
    <div className="rounded-xl border border-white/10 bg-card p-5">
      <header className="mb-4">
        <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-white">
          Deposit to SLP
        </h2>
        <p className="mt-0.5 text-[12px] text-white/55">
          Move any token from your wallet into the Shared Liquidity Pool.
        </p>
      </header>

      <div className="rounded-lg border border-white/[0.06] bg-white/[0.015] px-4 py-3.5">
        <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-white/40">
          <span>Amount</span>
          <span>
            Wallet{" "}
            <span className="font-mono normal-case tracking-normal text-white/65">
              {isConnected
                ? formatAmount(wallet.balance, token.decimals, 2)
                : "—"}
            </span>
            <button
              type="button"
              onClick={handleMax}
              disabled={!isConnected || isRunning}
              className="ml-2 rounded-md border border-cyan/30 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.18em] text-cyan transition-colors hover:bg-cyan/10 disabled:opacity-40"
            >
              Max
            </button>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <input
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            disabled={isRunning}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "" || /^\d*\.?\d*$/.test(v)) setAmount(v);
            }}
            className="flex-1 bg-transparent text-[22px] font-bold tracking-[-0.02em] outline-none placeholder:text-white/20 disabled:opacity-50"
          />
          <TokenSelect
            selected={token}
            options={TOKEN_LIST}
            onSelect={handleSelectToken}
            disabled={isRunning}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px]">
        <span className="text-white/40">Currently in SLP</span>
        <span className="font-mono text-cyan/85">
          {isConnected
            ? formatAmount(slp.balance?.deposited, token.decimals, 2)
            : "—"}{" "}
          {token.symbol}
        </span>
      </div>

      <button
        type="button"
        onClick={() => void handleDeposit()}
        disabled={disabled}
        className={cn(
          "mt-4 w-full rounded-lg px-6 py-2.5 text-[13px] font-semibold transition-colors",
          disabled
            ? "cursor-not-allowed border border-white/10 bg-white/[0.03] text-white/40"
            : "bg-cyan text-black hover:bg-cyan-dim",
        )}
      >
        {ctaLabel({
          isConnected,
          insufficient,
          symbol: token.symbol,
          step: deposit.step,
        })}
      </button>

      {deposit.error && (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
          {deposit.error}
        </p>
      )}

      {deposit.step === "done" && (
        <p className="mt-3 text-[12px] leading-[1.55] text-cyan/85">
          ✓ Deposited. Your SLP balance updated.
        </p>
      )}

      {insufficient && (
        <p className="mt-3 text-[11.5px] leading-[1.55] text-white/55">
          Need more {token.symbol}? Drip from the{" "}
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

function ctaLabel({
  isConnected,
  insufficient,
  symbol,
  step,
}: {
  isConnected: boolean;
  insufficient: boolean;
  symbol: string;
  step: ReturnType<typeof useDeposit>["step"];
}): string {
  if (!isConnected) return "Connect wallet to deposit";
  if (insufficient) return `Need more ${symbol}`;
  if (step === "checking") return "Checking allowance…";
  if (step === "approving") return "Approving…";
  if (step === "depositing") return "Depositing…";
  if (step === "done") return "Deposit another";
  return "Deposit";
}
