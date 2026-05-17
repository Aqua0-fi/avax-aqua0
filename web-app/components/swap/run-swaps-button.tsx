"use client";

import { useState } from "react";
import { ExternalLink, Sparkles } from "lucide-react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/connect-button";
import { useRunSwaps, type RunSwapsResult } from "@/hooks/use-run-swaps";
import { FUJI_DEPLOYMENT } from "@/lib/contracts";

// ────────────────────────────────────────────────────────────────────────────
// RunSwapsButton — interactive surface for the demo's "Run N swaps" call-
// to-action. The SwapSimulator contract holds its own token balance, so
// the user signs ONE tx, the contract loops `count` swaps internally, and
// every internal Swap event is captured by the fee-comparison panel below
// via getLogs.
//
// Choices are limited to multiples of 5 in [5, 25] so the per-pool count
// stays balanced (each pool = count/5 swaps both sides). That's enforced
// in the contract too — picking 7 would revert.
// ────────────────────────────────────────────────────────────────────────────

const SNOWTRACE_TX = "https://testnet.snowtrace.io/tx/";

const CHOICES = [5, 10, 15, 20, 25] as const;

export function RunSwapsButton() {
  const { isConnected } = useAccount();
  const { run, isPending, lastTx, error } = useRunSwaps();
  const [count, setCount] = useState<number>(10);
  const [history, setHistory] = useState<RunSwapsResult[]>([]);

  const simulatorDeployed =
    FUJI_DEPLOYMENT.swapSimulator !==
    "0x0000000000000000000000000000000000000000";

  async function onRun() {
    const result = await run(count);
    if (result) setHistory((h) => [result, ...h].slice(0, 8));
  }

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-cyan/25 bg-cyan/[0.03] p-5 sm:p-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.28em] text-cyan">
            <Sparkles className="h-3 w-3" />
            Trigger trading activity
          </div>
          <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.015em] text-white">
            Run live swaps on the 5 pools
          </h2>
          <p className="mt-1 max-w-[640px] text-[12.5px] leading-[1.5] text-white/55">
            One transaction. Distributes <strong>count / 5</strong> swaps to{" "}
            <em>each</em> of the 5 surfaced pools — symmetric across vanilla
            and Aqua0 sides. Every internal Swap event is emitted by the V4
            PoolManager and verifiable on Snowtrace.
          </p>
        </div>
      </header>

      {/* ── Chooser + CTA ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-white/10 bg-black/30 p-1">
          {CHOICES.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCount(n)}
              disabled={isPending}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                count === n
                  ? "bg-cyan/20 text-cyan"
                  : "text-white/55 hover:text-white"
              } disabled:opacity-40`}
            >
              {n} swaps
            </button>
          ))}
        </div>

        {!isConnected ? (
          <ConnectButton />
        ) : (
          <button
            type="button"
            onClick={onRun}
            disabled={isPending || !simulatorDeployed}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan px-4 py-2 text-[13px] font-semibold text-black transition-colors hover:bg-cyan-dim disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending
              ? `Running ${count} swaps…`
              : `Run ${count} swaps`}
          </button>
        )}

        <div className="ml-auto text-[11px] text-white/40">
          {count / 5} swaps × 5 pools · 1 wallet signature
        </div>
      </div>

      {/* ── Status / Error ─────────────────────────────────────────── */}
      {!simulatorDeployed && (
        <div className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/[0.04] px-3.5 py-2.5 text-[11.5px] text-amber-200/85">
          SwapSimulator not deployed yet. Run{" "}
          <code className="rounded bg-black/40 px-1 py-0.5 text-[11px] text-amber-100">
            forge script DeploySwapSimulator
          </code>{" "}
          then paste the printed address into{" "}
          <code className="rounded bg-black/40 px-1 py-0.5 text-[11px] text-amber-100">
            FUJI_DEPLOYMENT.swapSimulator
          </code>
          .
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/[0.04] px-3.5 py-2.5 text-[12px] text-rose-200/90">
          {error}
        </div>
      )}

      {/* ── Receipt history ────────────────────────────────────────── */}
      {history.length > 0 && (
        <div className="mt-5 border-t border-white/[0.06] pt-4">
          <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-white/40">
            Recent batches
          </div>
          <ul className="flex flex-col gap-1.5">
            {history.map((r) => (
              <ReceiptRow key={r.hash} receipt={r} latest={r === lastTx} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function ReceiptRow({
  receipt,
  latest,
}: {
  receipt: RunSwapsResult;
  latest: boolean;
}) {
  return (
    <li
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-3 py-2 text-[11.5px] transition-colors ${
        latest
          ? "border-cyan/30 bg-cyan/[0.05]"
          : "border-white/[0.06] bg-black/20"
      }`}
    >
      <span className="font-mono text-white/55">
        block {receipt.blockNumber.toString()}
      </span>
      <span
        className={`font-bold ${latest ? "text-cyan" : "text-white/80"}`}
      >
        {receipt.swapEventCount} Swap event
        {receipt.swapEventCount === 1 ? "" : "s"} emitted
      </span>
      <a
        href={`${SNOWTRACE_TX}${receipt.hash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="ml-auto inline-flex items-center gap-1 font-mono text-white/55 transition-colors hover:text-cyan"
        title="View tx on Snowtrace"
      >
        {receipt.hash.slice(0, 10)}…{receipt.hash.slice(-8)}
        <ExternalLink className="h-3 w-3" />
      </a>
    </li>
  );
}
