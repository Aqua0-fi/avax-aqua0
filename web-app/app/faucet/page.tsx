"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Check, ExternalLink } from "lucide-react";
import { useAccount } from "wagmi";
import { HeroWaves } from "@/components/aquatic-waves";
import { DotMark } from "@/components/dot-mark";
import { Navbar } from "@/components/navbar";
import { useMint } from "@/hooks/use-mint";
import { useWalletBalance } from "@/hooks/use-slp-balance";
import { TOKEN_LIST, type TokenMeta } from "@/lib/contracts";
import { cn, formatAmount } from "@/lib/utils";

const FAUCET_AMOUNT = "10000";
const SNOWTRACE_TX = "https://testnet.snowtrace.io/tx/";

export default function FaucetPage() {
  const { isConnected } = useAccount();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <HeroWaves className="pointer-events-none absolute -top-8 right-0 hidden h-[240px] w-[520px] opacity-80 md:block" />
      <Navbar />

      <div className="relative z-10 mx-auto max-w-3xl px-4 pt-12 pb-20 sm:px-6 lg:px-8">
        {/* ── Hero ───────────────────────────────────────────────────── */}
        <section className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.3em] text-white/60">
            <DotMark />
            Faucet · Avalanche Fuji
          </div>
          <h1 className="text-[clamp(32px,4.5vw,52px)] font-bold leading-none tracking-[-0.025em] text-white">
            Mock tokens
          </h1>
          <p className="mt-4 max-w-[560px] text-[14px] leading-[1.55] text-white/60">
            Mint 10,000 of each LATAM-themed mock stablecoin. Public mint, no
            rate limits — testnet only. The mainnet deploy will plug into{" "}
            <span className="border-b border-dotted border-cyan/60 text-white">
              Twin&apos;s actual ARSt / BRLt / MXNt
            </span>{" "}
            issuance on Avalanche, with Ripio (wARS / wBRL) kept as a
            cross-issuer baseline.
          </p>
        </section>

        {/* ── Token list ─────────────────────────────────────────────── */}
        <div className="space-y-2.5">
          {TOKEN_LIST.map((token) => (
            <FaucetRow
              key={token.address}
              token={token}
              isConnected={isConnected}
            />
          ))}
        </div>

        <Link
          href="/profile"
          className="mt-8 inline-flex items-center gap-2 text-[13px] text-white/60 transition-colors hover:text-cyan"
        >
          ← Back to profile
        </Link>
      </div>
    </div>
  );
}

// Each row owns its own useMint instance so the button state (idle →
// signing → minting → ✓ minted) is per-token. The wallet balance hook
// refetches when the mint succeeds so the row immediately shows the new
// balance without a manual page refresh.
function FaucetRow({
  token,
  isConnected,
}: {
  token: TokenMeta;
  isConnected: boolean;
}) {
  const wallet = useWalletBalance(token);
  const mint = useMint();

  // Refetch the balance row when the receipt confirms. Depending on the
  // discrete success flag (not the whole wallet object) keeps this from
  // firing on every render.
  useEffect(() => {
    if (mint.isSuccess) {
      wallet.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mint.isSuccess]);

  const issuerLabel =
    token.issuer === "anchor"
      ? "Anchor"
      : token.issuer === "ripio"
      ? "Ripio"
      : "Twin";

  async function handleClick() {
    if (mint.isSuccess || mint.error) mint.reset();
    try {
      await mint.mint(token, FAUCET_AMOUNT);
    } catch {
      // Errors surface via mint.error — no need to rethrow here.
    }
  }

  const isBusy = mint.isWriting || mint.isConfirming;
  const showDone = mint.isSuccess;

  return (
    <div
      className={cn(
        "rounded-xl border bg-card transition-colors",
        showDone
          ? "border-cyan/40"
          : mint.error
          ? "border-red-400/40"
          : mint.isConfirming
          ? "border-cyan/25"
          : "border-white/10 hover:border-white/30",
      )}
    >
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-4">
          <span
            className="h-9 w-9 rounded-full"
            style={{
              background: token.accent,
              boxShadow: `0 0 12px ${token.accent}40`,
            }}
          />
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-semibold tracking-[-0.01em] text-white">
                {token.symbol}
              </span>
              <span className="text-[11px] text-white/40">{issuerLabel}</span>
            </div>
            <div className="mt-0.5 font-mono text-[12px] text-white/50">
              Balance {formatAmount(wallet.balance, token.decimals, 2)}
            </div>
          </div>
        </div>

        <button
          onClick={() => void handleClick()}
          disabled={!isConnected || isBusy}
          className={cn(
            "inline-flex min-w-[124px] items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold transition-colors",
            showDone
              ? "border border-cyan/40 bg-cyan/[0.08] text-cyan"
              : "bg-cyan text-black hover:bg-cyan-dim disabled:opacity-50 disabled:hover:bg-cyan",
          )}
        >
          {buttonLabel({
            isConnected,
            isWriting: mint.isWriting,
            isConfirming: mint.isConfirming,
            isSuccess: showDone,
            hasError: !!mint.error,
          })}
        </button>
      </div>

      {/* ── Live status strip — only when there's a hash to show ─────── */}
      {mint.txHash && (
        <div
          className={cn(
            "flex items-center justify-between gap-3 border-t px-5 py-2.5 text-[11px]",
            mint.isConfirming
              ? "border-cyan/10 bg-cyan/[0.02]"
              : showDone
              ? "border-cyan/15 bg-cyan/[0.04]"
              : "border-white/[0.06] bg-white/[0.015]",
          )}
        >
          <span
            className={cn(
              "uppercase tracking-[0.18em]",
              mint.isConfirming
                ? "text-cyan/85"
                : showDone
                ? "text-cyan"
                : "text-white/50",
            )}
          >
            {mint.isConfirming
              ? "Waiting for confirmation…"
              : showDone
              ? "Confirmed ✓"
              : "Tx submitted"}
          </span>
          <a
            href={`${SNOWTRACE_TX}${mint.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-white/65 transition-colors hover:text-cyan"
          >
            {mint.txHash.slice(0, 8)}…{mint.txHash.slice(-6)}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {mint.error && (
        <div className="border-t border-red-400/20 bg-red-500/[0.06] px-5 py-2.5 text-[11px] text-red-300">
          {String(mint.error.message ?? mint.error).slice(0, 200)}
        </div>
      )}

      {mint.isStuck && !mint.isSuccess && (
        <div className="border-t border-amber-400/25 bg-amber-500/[0.05] px-5 py-3 text-[11.5px] leading-[1.55] text-amber-100/90">
          <div className="mb-1.5 text-[10px] uppercase tracking-[0.22em] text-amber-300">
            Tx not landing on-chain
          </div>
          <p>
            The wallet returned a hash but Fuji nodes don&apos;t see the
            tx. This is a wallet-side broadcast issue. Two quick fixes:
          </p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
            <li>
              MetaMask · Settings · Advanced ·{" "}
              <span className="text-amber-200">Clear activity tab data</span>{" "}
              (resets nonce cache)
            </li>
            <li>
              MetaMask · Settings · Networks · Avalanche Fuji · replace RPC
              URL with{" "}
              <code className="font-mono text-amber-200">
                avalanche-fuji-c-chain.publicnode.com
              </code>
            </li>
          </ul>
          <button
            onClick={() => mint.reset()}
            className="mt-2.5 rounded-md border border-amber-300/40 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-amber-200 transition-colors hover:bg-amber-300/10"
          >
            Reset row
          </button>
        </div>
      )}
    </div>
  );
}

function buttonLabel({
  isConnected,
  isWriting,
  isConfirming,
  isSuccess,
  hasError,
}: {
  isConnected: boolean;
  isWriting: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  hasError: boolean;
}) {
  if (!isConnected) return <>Connect</>;
  if (isWriting) return <>Confirm in wallet…</>;
  if (isConfirming) return <>Minting…</>;
  if (isSuccess)
    return (
      <>
        <Check className="h-3.5 w-3.5" /> Minted
      </>
    );
  if (hasError) return <>Retry</>;
  return <>Mint {FAUCET_AMOUNT}</>;
}
