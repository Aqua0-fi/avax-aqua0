"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/connect-button";
import { useMint } from "@/hooks/use-mint";
import { useWalletBalance } from "@/hooks/use-slp-balance";
import { TOKEN_LIST, type TokenMeta } from "@/lib/contracts";
import { formatAmount } from "@/lib/utils";

const FAUCET_AMOUNT = "10000";

export default function FaucetPage() {
  const { isConnected } = useAccount();
  const { mint, isPending } = useMint();

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-black text-white">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(127,229,229,0.10) 0%, rgba(0,0,0,0) 60%)",
        }}
      />

      <nav className="relative z-10 mx-auto flex max-w-[1180px] items-center justify-between px-6 py-6 sm:px-10">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-sm font-bold text-cyan">
            A
          </span>
          <span className="text-[15px] font-semibold tracking-[0.02em]">
            Aqua0
          </span>
          <span className="ml-2 hidden text-[10px] uppercase tracking-[0.28em] text-cyan sm:inline">
            · Faucet
          </span>
        </Link>
        <ConnectButton />
      </nav>

      <section className="relative z-10 mx-auto max-w-[720px] px-6 pt-10 pb-20 sm:px-10">
        <h1 className="text-[clamp(28px,4.2vw,44px)] font-extrabold tracking-[-0.025em]">
          Mock tokens
        </h1>
        <p className="mt-3 max-w-[520px] text-[14.5px] leading-relaxed text-white/60">
          Mint 10,000 of each LATAM-themed mock stablecoin. Public mint, no
          rate limits — this is testnet only. Real Avalanche deployment will
          plug into Ripio's actual wARS/wBRL/wMXN issuance.
        </p>

        <div className="mt-8 space-y-3">
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
          href="/"
          className="mt-8 inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-cyan"
        >
          ← Back to demo
        </Link>
      </section>
    </main>
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
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <span
          className="h-9 w-9 rounded-full ring-2 ring-black"
          style={{
            background: token.accent,
            boxShadow: `0 0 12px ${token.accent}40`,
          }}
        />
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold">{token.symbol}</span>
            <span className="text-[12px] text-white/40">{token.name}</span>
          </div>
          <div className="mt-0.5 text-[12px] text-white/50">
            Balance: {formatAmount(balance, token.decimals, 2)}
          </div>
        </div>
      </div>
      <button
        onClick={() => onMint()}
        disabled={!isConnected || isPending}
        className="rounded-full bg-cyan px-4 py-2 text-xs font-semibold text-black transition hover:bg-cyan-dim disabled:opacity-50"
      >
        {isConnected ? `Mint ${FAUCET_AMOUNT}` : "Connect"}
      </button>
    </div>
  );
}
