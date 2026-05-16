"use client";

import { useAccount } from "wagmi";
import { useDeposit } from "@/hooks/use-deposit";
import { useJitPreference } from "@/hooks/use-jit-preference";
import { useMint } from "@/hooks/use-mint";
import { TOKEN_LIST, TOKENS } from "@/lib/contracts";

const DEPOSIT_AMOUNT = "20000"; // The pitch number — 20k that backs 6 markets.

// Quick-action panel on /profile. Three explicit buttons matching the demo's
// happy path: faucet all tokens, deposit 20k USDC into the SLP, declare JIT
// preferences across all six aqua0 markets. Aimed at a judge who lands here
// fresh and wants to drive the demo without reading docs.
export function JitActions() {
  const { isConnected } = useAccount();
  const { mint, isPending: mintBusy } = useMint();
  const deposit = useDeposit();
  const jit = useJitPreference();

  async function handleMintAll() {
    for (const token of TOKEN_LIST) {
      await mint(token, "10000");
    }
  }

  async function handleDeposit() {
    await deposit.deposit(TOKENS.usdc, DEPOSIT_AMOUNT);
  }

  async function handleBackAllMarkets() {
    await jit.backAllLatamPools(DEPOSIT_AMOUNT);
  }

  const disabled = !isConnected;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-sm">
      <header className="mb-4">
        <h2 className="text-base font-bold">Quick actions</h2>
        <p className="mt-0.5 text-[12px] text-white/55">
          The full demo flow in three buttons. Run in order.
        </p>
      </header>

      <div className="space-y-2.5">
        <Step
          n={1}
          title="Mint 10k of each LATAM stablecoin"
          subtitle="Public mint, no rate limit. 7 transactions in sequence."
          buttonLabel={mintBusy ? "Minting…" : "Mint all"}
          onClick={handleMintAll}
          disabled={disabled || mintBusy}
        />
        <Step
          n={2}
          title={`Deposit ${DEPOSIT_AMOUNT} USDC into the SLP`}
          subtitle="One approve + one deposit transaction."
          buttonLabel={
            deposit.step === "approving"
              ? "Approving…"
              : deposit.step === "depositing"
              ? "Depositing…"
              : deposit.step === "done"
              ? "Deposited"
              : "Deposit"
          }
          onClick={handleDeposit}
          disabled={
            disabled ||
            (deposit.step !== "idle" &&
              deposit.step !== "done" &&
              deposit.step !== "error")
          }
        />
        <Step
          n={3}
          title="Back all 6 aqua0 markets"
          subtitle="Declares JIT positions across Ripio + Twin pools. Same capital."
          buttonLabel={jit.isPending ? "Signing…" : "Back 6 markets"}
          onClick={handleBackAllMarkets}
          disabled={disabled || jit.isPending}
        />
      </div>

      {deposit.error && (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
          {deposit.error}
        </p>
      )}
      {jit.error && (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
          {jit.error}
        </p>
      )}
    </div>
  );
}

function Step({
  n,
  title,
  subtitle,
  buttonLabel,
  onClick,
  disabled,
}: {
  n: number;
  title: string;
  subtitle: string;
  buttonLabel: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-start gap-3.5 rounded-xl border border-white/8 bg-black/30 px-4 py-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan/40 text-[11px] font-bold text-cyan">
        {n}
      </div>
      <div className="flex-1">
        <div className="text-[13.5px] font-semibold">{title}</div>
        <div className="mt-0.5 text-[11.5px] text-white/50">{subtitle}</div>
      </div>
      <button
        onClick={onClick}
        disabled={disabled}
        className="shrink-0 rounded-full bg-cyan px-3.5 py-1.5 text-[11px] font-semibold text-black transition hover:bg-cyan-dim disabled:opacity-40"
      >
        {buttonLabel}
      </button>
    </div>
  );
}
