"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { HeroWaves } from "@/components/aquatic-waves";
import { DotMark } from "@/components/dot-mark";
import { Navbar } from "@/components/navbar";
import { useMint } from "@/hooks/use-mint";
import { useWalletBalance } from "@/hooks/use-slp-balance";
import { TOKEN_LIST, type TokenMeta } from "@/lib/contracts";
import { formatAmount } from "@/lib/utils";

const FAUCET_AMOUNT = "10000";

export default function FaucetPage() {
  const { isConnected } = useAccount();
  const { mint, isPending } = useMint();

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
              Ripio&apos;s actual wARS/wBRL/wMXN
            </span>{" "}
            and Twin&apos;s ARSt/BRLt/MXNt issuance.
          </p>
        </section>

        {/* ── Token list ─────────────────────────────────────────────── */}
        <div className="space-y-2.5">
          {TOKEN_LIST.map((token) => (
            <FaucetRow
              key={token.address}
              token={token}
              onMint={() => mint(token, FAUCET_AMOUNT)}
              isPending={isPending}
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

function FaucetRow({
  token,
  onMint,
  isPending,
  isConnected,
}: {
  token: TokenMeta;
  onMint: () => Promise<unknown>;
  isPending: boolean;
  isConnected: boolean;
}) {
  const { balance } = useWalletBalance(token);
  const issuerLabel =
    token.issuer === "anchor"
      ? "Anchor"
      : token.issuer === "ripio"
      ? "Ripio"
      : "Twin";

  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-card px-5 py-4 transition-colors hover:border-white/30">
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
            Balance {formatAmount(balance, token.decimals, 2)}
          </div>
        </div>
      </div>
      <button
        onClick={() => onMint()}
        disabled={!isConnected || isPending}
        className="rounded-lg bg-cyan px-4 py-2 text-[12px] font-semibold text-black transition-colors hover:bg-cyan-dim disabled:opacity-50 disabled:hover:bg-cyan"
      >
        {isConnected ? `Mint ${FAUCET_AMOUNT}` : "Connect"}
      </button>
    </div>
  );
}
