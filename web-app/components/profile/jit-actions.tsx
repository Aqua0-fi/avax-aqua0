"use client";

import { useMemo } from "react";
import Link from "next/link";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { useDeposit } from "@/hooks/use-deposit";
import { useMint } from "@/hooks/use-mint";
import { useWalletBalance } from "@/hooks/use-slp-balance";
import { TOKEN_LIST, TOKENS, type TokenMeta } from "@/lib/contracts";

// Quick-action panel on /profile. Two buttons that prep the LP for the
// per-strategy backing flow:
//
//   1. Mint all faucet tokens into the wallet.
//   2. Deposit every wallet balance into the SLP. This is the "enter the
//      system" moment — capital becomes eligible to be drawn against by
//      ANY Aqua0 strategy simultaneously. The deposit doesn't pick a
//      strategy; it just makes the capital available.
//
// Critically there is NO "back all 3 markets" shortcut here. The demo's
// wow moment lives elsewhere: the LP heads to /strategies, backs the
// twin-arst pool, watches the SLP balance NOT drop, backs twin-brlt,
// watches it NOT drop again, backs twin-mxnt. Same capital, three
// markets, zero fragmentation. A "back all" button would collapse that
// beat into an invisible bulk action, so we route the LP to /strategies
// after step 2 instead and let them feel the redeclaration trick one
// click at a time.
//
// Why "deposit everything" instead of "deposit 20k USDC": the Aqua0 hook
// needs BOTH sides of the pair in the SLP (USDC + the Twin LATAM stable)
// to pull transient depth on swap. A USDC-only deposit silently breaks
// the JIT pulls.
export function JitActions() {
  const { isConnected } = useAccount();
  const { mint, isPending: mintBusy } = useMint();
  const deposit = useDeposit();

  // Read wallet balances for every token the SLP can usefully hold (USDC
  // + the 3 Twin LATAM stables). wARS / wBRL are excluded — they're part
  // of the vanilla baseline flow, not Aqua0 routing, so depositing them
  // into the SLP would do nothing.
  const depositableTokens: TokenMeta[] = useMemo(
    () => [TOKENS.usdc, TOKENS.arst, TOKENS.brlt, TOKENS.mxnt],
    [],
  );
  const wUsdc = useWalletBalance(TOKENS.usdc);
  const wArst = useWalletBalance(TOKENS.arst);
  const wBrlt = useWalletBalance(TOKENS.brlt);
  const wMxnt = useWalletBalance(TOKENS.mxnt);
  const walletReads = [wUsdc, wArst, wBrlt, wMxnt];

  // Sum of all balances we'll be depositing (preview number for the
  // subtitle). All four tokens are 6 decimals so summing raw bigints is
  // safe; the formatted total is purely cosmetic.
  const totalToDepositHuman = useMemo(() => {
    const total =
      (wUsdc.balance ?? 0n) +
      (wArst.balance ?? 0n) +
      (wBrlt.balance ?? 0n) +
      (wMxnt.balance ?? 0n);
    return total > 0n ? Number(formatUnits(total, 6)).toLocaleString() : "0";
  }, [wUsdc.balance, wArst.balance, wBrlt.balance, wMxnt.balance]);

  async function handleMintAll() {
    for (const token of TOKEN_LIST) {
      await mint(token, "10000");
    }
  }

  async function handleDepositAll() {
    for (let i = 0; i < depositableTokens.length; i++) {
      const token = depositableTokens[i];
      const balance = walletReads[i].balance;
      if (!balance || balance === 0n) continue;
      // formatUnits gives back the exact bigint when re-parsed at the
      // same decimals, so no precision is lost on the round-trip inside
      // useDeposit (parseUnits(formatUnits(x, d), d) === x).
      const human = formatUnits(balance, token.decimals);
      await deposit.deposit(token, human);
      walletReads[i].refetch();
    }
  }

  const disabled = !isConnected;

  return (
    <div className="rounded-xl border border-white/10 bg-card p-5">
      <header className="mb-4">
        <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-white">
          Quick actions
        </h2>
        <p className="mt-0.5 text-[12px] text-white/55">
          Get your capital into the SLP, then head to{" "}
          <Link
            href="/strategies"
            className="border-b border-dotted border-cyan/60 text-white hover:text-cyan"
          >
            Strategies
          </Link>{" "}
          to back each market individually.
        </p>
      </header>

      <div className="space-y-2">
        <Step
          n={1}
          title="Mint 10k of each LATAM stablecoin"
          subtitle={`Public mint, no rate limit. ${TOKEN_LIST.length} transactions in sequence.`}
          buttonLabel={mintBusy ? "Minting…" : "Mint all"}
          onClick={handleMintAll}
          disabled={disabled || mintBusy}
        />
        <Step
          n={2}
          title="Deposit everything in your wallet into the SLP"
          subtitle={
            isConnected
              ? `~${totalToDepositHuman} across USDC + ARSt + BRLt + MXNt. Approve + deposit per token, skipping zero balances.`
              : "USDC + the 3 Twin LATAM stables. Approve + deposit per token."
          }
          buttonLabel={
            deposit.step === "approving"
              ? "Approving…"
              : deposit.step === "depositing"
              ? "Depositing…"
              : deposit.step === "done"
              ? "Deposit more"
              : "Deposit all"
          }
          onClick={handleDepositAll}
          disabled={
            disabled ||
            (deposit.step !== "idle" &&
              deposit.step !== "done" &&
              deposit.step !== "error")
          }
        />
        <Step
          n={3}
          title="Back each strategy individually"
          subtitle="Open every Twin market and authorise the hook. The SLP balance stays put — the same capital backs all three."
          buttonLabel="Open strategies"
          href="/strategies"
          disabled={disabled}
        />
      </div>

      {deposit.error && (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
          {deposit.error}
        </p>
      )}
    </div>
  );
}

// Each step can be either an on-click action button (mint / deposit) or
// a navigation link (back each strategy individually → /strategies). The
// last step is intentionally a link so the LP lands on the strategies
// grid and clicks into each one — that's where the "same SLP balance,
// three pools backed" beat plays out.
type StepProps = {
  n: number;
  title: string;
  subtitle: string;
  buttonLabel: string;
  disabled: boolean;
} & ({ onClick: () => void; href?: never } | { href: string; onClick?: never });

function Step({
  n,
  title,
  subtitle,
  buttonLabel,
  onClick,
  href,
  disabled,
}: StepProps) {
  return (
    <div className="flex items-start gap-3.5 rounded-lg border border-white/[0.06] bg-white/[0.015] px-4 py-3 transition-colors hover:border-white/15">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan/40 text-[11px] font-bold text-cyan">
        {n}
      </div>
      <div className="flex-1">
        <div className="text-[13.5px] font-semibold text-white">{title}</div>
        <div className="mt-0.5 text-[11.5px] text-white/50">{subtitle}</div>
      </div>
      {href ? (
        <Link
          href={href}
          aria-disabled={disabled}
          tabIndex={disabled ? -1 : undefined}
          className={`shrink-0 rounded-lg px-3.5 py-1.5 text-[11px] font-semibold transition-colors ${
            disabled
              ? "pointer-events-none border border-white/10 bg-white/[0.03] text-white/40"
              : "border border-cyan/40 bg-cyan/[0.08] text-cyan hover:bg-cyan/[0.12]"
          }`}
        >
          {buttonLabel} →
        </Link>
      ) : (
        <button
          onClick={onClick}
          disabled={disabled}
          className="shrink-0 rounded-lg bg-cyan px-3.5 py-1.5 text-[11px] font-semibold text-black transition-colors hover:bg-cyan-dim disabled:opacity-40 disabled:hover:bg-cyan"
        >
          {buttonLabel}
        </button>
      )}
    </div>
  );
}
