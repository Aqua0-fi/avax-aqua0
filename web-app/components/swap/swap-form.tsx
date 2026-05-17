"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { useWalletBalance } from "@/hooks/use-slp-balance";
import {
  FUJI_DEPLOYMENT,
  TOKENS,
  type TokenMeta,
} from "@/lib/contracts";
import { cn, formatAmount } from "@/lib/utils";
import { TokenSelect } from "./token-select";

// ─────────────────────────────────────────────────────────────────────────────
// SwapForm — UI shell for the /swap surface.
//
// On-chain wiring is intentionally deferred (the deployed LiquidityRouter only
// supports modifyLiquidity, not swap — we'll deploy a dedicated SwapRouter +
// V4 quoter in a follow-up). For now this renders a complete, interactive
// preview: token selectors, amount input, client-side quote, slippage control,
// and route detection against the 3 Twin aqua0 pools.
//
// Twin-only by design: /strategies surfaces only the 3 Twin Aqua0 markets, so
// the swap UI mirrors that. The Ripio Aqua0 pools are still deployed but not
// exposed here. wARS / wBRL stay in TOKEN_LIST for the vanilla-baseline flow
// (faucet + SLP inventory + deposit card), but they're not swappable here.
//
// The "Swap" CTA shows a disabled state with a "Coming online next" label —
// honest signalling for a judge clicking around the demo.
// ─────────────────────────────────────────────────────────────────────────────

const FEE_BPS = 30; // 0.30% V4 pool fee (3000 ppm = 30 bps)
const BPS_DENOM = 10_000n;

// The 4 tokens the swap surface exposes: USDC + the 3 Twin LATAM stables.
const SWAP_TOKENS: TokenMeta[] = [
  TOKENS.usdc,
  TOKENS.arst,
  TOKENS.brlt,
  TOKENS.mxnt,
];

// Maps each Twin LATAM stablecoin symbol → its aqua0 pool ID. Explicit lookup
// instead of string-mashing from symbol to FUJI_DEPLOYMENT.pools keys.
const AQUA0_POOL_BY_LATAM: Record<string, `0x${string}`> = {
  ARSt: FUJI_DEPLOYMENT.pools.arstUsdcAqua0,
  BRLt: FUJI_DEPLOYMENT.pools.brltUsdcAqua0,
  MXNt: FUJI_DEPLOYMENT.pools.mxntUsdcAqua0,
};

const SLIPPAGE_PRESETS = [10, 50, 100] as const; // 0.10%, 0.50%, 1.00%

export function SwapForm() {
  const { isConnected } = useAccount();

  // ── Form state ───────────────────────────────────────────────────────────
  const [fromToken, setFromToken] = useState<TokenMeta>(TOKENS.usdc);
  const [toToken, setToToken] = useState<TokenMeta>(TOKENS.arst);
  const [amountStr, setAmountStr] = useState<string>("");
  const [slippageBps, setSlippageBps] = useState<number>(50);

  // ── Pair validity + pool routing ─────────────────────────────────────────
  const route = useMemo(() => resolveRoute(fromToken, toToken), [fromToken, toToken]);

  // ── Amount parsing → bigint at fromToken.decimals precision ──────────────
  const amountInRaw = useMemo(
    () => parseAmount(amountStr, fromToken.decimals),
    [amountStr, fromToken.decimals],
  );

  // Client-side quote: 1:1 pools at 0.30% fee. Real V4Quoter wiring tightens
  // this once the on-chain swap router lands.
  const quotedOutRaw = useMemo(() => {
    if (!amountInRaw || !route) return 0n;
    return (amountInRaw * (BPS_DENOM - BigInt(FEE_BPS))) / BPS_DENOM;
  }, [amountInRaw, route]);

  const minReceivedRaw = useMemo(() => {
    if (!quotedOutRaw) return 0n;
    return (quotedOutRaw * (BPS_DENOM - BigInt(slippageBps))) / BPS_DENOM;
  }, [quotedOutRaw, slippageBps]);

  // ── Wallet balances ──────────────────────────────────────────────────────
  const fromBalance = useWalletBalance(fromToken);
  const toBalance = useWalletBalance(toToken);

  const hasInsufficientBalance =
    isConnected &&
    amountInRaw > 0n &&
    fromBalance.balance !== undefined &&
    amountInRaw > fromBalance.balance;

  function handleFlip() {
    setFromToken(toToken);
    setToToken(fromToken);
  }

  function handleFromSelect(token: TokenMeta) {
    setFromToken(token);
    if (token.address !== TOKENS.usdc.address && toToken.address !== TOKENS.usdc.address) {
      setToToken(TOKENS.usdc);
    } else if (token.address === toToken.address) {
      setToToken(token.address === TOKENS.usdc.address ? TOKENS.arst : TOKENS.usdc);
    }
  }

  function handleToSelect(token: TokenMeta) {
    setToToken(token);
    if (token.address !== TOKENS.usdc.address && fromToken.address !== TOKENS.usdc.address) {
      setFromToken(TOKENS.usdc);
    } else if (token.address === fromToken.address) {
      setFromToken(token.address === TOKENS.usdc.address ? TOKENS.arst : TOKENS.usdc);
    }
  }

  function handleMax() {
    if (!isConnected || fromBalance.balance === undefined) return;
    setAmountStr(formatAmount(fromBalance.balance, fromToken.decimals, 6));
  }

  // Filter dropdowns so users can't pick invalid pairs. Swap surface is
  // Twin-only — USDC ↔ {ARSt, BRLt, MXNt}.
  const toOptions = useMemo(() => {
    if (fromToken.address === TOKENS.usdc.address) {
      return SWAP_TOKENS.filter((t) => t.address !== TOKENS.usdc.address);
    }
    return [TOKENS.usdc];
  }, [fromToken]);

  const fromOptions = useMemo(() => {
    if (toToken.address === TOKENS.usdc.address) {
      return SWAP_TOKENS;
    }
    return [TOKENS.usdc];
  }, [toToken]);

  const cta = resolveCta({
    isConnected,
    route,
    amountInRaw,
    hasInsufficientBalance,
  });

  return (
    <div className="rounded-xl border border-white/10 bg-card p-5 sm:p-6">
      {/* ── From side ──────────────────────────────────────────────────── */}
      <Panel
        label="From"
        balance={
          isConnected
            ? formatAmount(fromBalance.balance, fromToken.decimals, 2)
            : "—"
        }
        showMax
        onMax={handleMax}
        token={fromToken}
        options={fromOptions}
        onSelectToken={handleFromSelect}
        amount={amountStr}
        onAmountChange={setAmountStr}
        readOnly={false}
      />

      {/* ── Flip button ───────────────────────────────────────────────── */}
      <div className="my-2 flex items-center justify-center">
        <button
          type="button"
          onClick={handleFlip}
          aria-label="Flip swap direction"
          className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-card text-white/70 transition-colors hover:border-cyan/50 hover:text-cyan"
        >
          ⇅
        </button>
      </div>

      {/* ── To side (estimated, read-only) ────────────────────────────── */}
      <Panel
        label="To (estimated)"
        balance={
          isConnected
            ? formatAmount(toBalance.balance, toToken.decimals, 2)
            : "—"
        }
        token={toToken}
        options={toOptions}
        onSelectToken={handleToSelect}
        amount={
          quotedOutRaw > 0n
            ? formatAmount(quotedOutRaw, toToken.decimals, 4)
            : ""
        }
        readOnly
      />

      {/* ── Slippage tolerance ────────────────────────────────────────── */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-white/40">
          <span>Slippage tolerance</span>
          <span className="font-mono text-white/70">
            {(slippageBps / 100).toFixed(2)}%
          </span>
        </div>
        <div className="flex gap-2">
          {SLIPPAGE_PRESETS.map((bps) => (
            <button
              key={bps}
              type="button"
              onClick={() => setSlippageBps(bps)}
              className={cn(
                "flex-1 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors",
                slippageBps === bps
                  ? "border-cyan/60 bg-cyan/[0.08] text-cyan"
                  : "border-white/10 bg-white/[0.02] text-white/70 hover:border-white/25",
              )}
            >
              {(bps / 100).toFixed(bps < 100 ? 2 : 1)}%
            </button>
          ))}
        </div>
      </div>

      {/* ── Quote breakdown ───────────────────────────────────────────── */}
      <dl className="mt-5 space-y-1.5 rounded-lg border border-white/[0.06] bg-white/[0.015] px-4 py-3 text-[12px]">
        <QuoteRow
          label="Route"
          value={
            route
              ? `Aqua0 pool · ${route.latamToken.symbol}/USDC`
              : "No direct pool"
          }
          tint={route ? "cyan" : "warn"}
        />
        <QuoteRow
          label="Rate"
          value={
            route
              ? `1 ${fromToken.symbol} ≈ ${(1 - FEE_BPS / 10_000).toFixed(3)} ${toToken.symbol}`
              : "—"
          }
        />
        <QuoteRow label="Pool fee" value="0.30% (V4)" />
        <QuoteRow
          label="Min received"
          value={
            route && minReceivedRaw > 0n
              ? `${formatAmount(minReceivedRaw, toToken.decimals, 4)} ${toToken.symbol}`
              : "—"
          }
        />
      </dl>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <button
        type="button"
        disabled={cta.disabled}
        onClick={() => undefined /* on-chain wiring lands in follow-up */}
        className={cn(
          "mt-5 w-full rounded-lg px-6 py-2.5 text-[13px] font-semibold transition-colors",
          cta.disabled
            ? "cursor-not-allowed border border-white/10 bg-white/[0.03] text-white/40"
            : "bg-cyan text-black hover:bg-cyan-dim",
        )}
      >
        {cta.label}
      </button>

      {cta.subnote && (
        <p className="mt-2.5 text-center text-[11px] leading-[1.55] text-white/45">
          {cta.subnote}
        </p>
      )}
    </div>
  );
}

// ─── A single "From" or "To" panel ──────────────────────────────────────────
function Panel({
  label,
  balance,
  token,
  options,
  onSelectToken,
  amount,
  onAmountChange,
  readOnly = false,
  showMax = false,
  onMax,
}: {
  label: string;
  balance: string;
  token: TokenMeta;
  options: TokenMeta[];
  onSelectToken: (t: TokenMeta) => void;
  amount: string;
  onAmountChange?: (s: string) => void;
  readOnly?: boolean;
  showMax?: boolean;
  onMax?: () => void;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.015] px-4 py-3.5">
      <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-white/40">
        <span>{label}</span>
        <span>
          Balance{" "}
          <span className="font-mono normal-case tracking-normal text-white/65">
            {balance}
          </span>
          {showMax && (
            <button
              type="button"
              onClick={onMax}
              className="ml-2 rounded-md border border-cyan/30 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.18em] text-cyan transition-colors hover:bg-cyan/10"
            >
              Max
            </button>
          )}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <input
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          readOnly={readOnly}
          onChange={(e) => {
            if (readOnly || !onAmountChange) return;
            const v = e.target.value;
            if (v === "" || /^\d*\.?\d*$/.test(v)) onAmountChange(v);
          }}
          className={cn(
            "flex-1 bg-transparent text-[24px] font-bold tracking-[-0.02em] outline-none placeholder:text-white/20",
            readOnly && "text-white/80",
          )}
        />
        <TokenSelect
          selected={token}
          options={options}
          onSelect={onSelectToken}
        />
      </div>
    </div>
  );
}

function QuoteRow({
  label,
  value,
  tint = "white",
}: {
  label: string;
  value: string;
  tint?: "cyan" | "white" | "warn";
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-[10.5px] uppercase tracking-[0.18em] text-white/40">
        {label}
      </dt>
      <dd
        className={cn(
          "font-mono text-[12px]",
          tint === "cyan" && "text-cyan",
          tint === "white" && "text-white/85",
          tint === "warn" && "text-amber-300",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

interface Route {
  poolId: `0x${string}`;
  latamToken: TokenMeta;
  /** True if user is swapping LATAM → USDC, false if USDC → LATAM. */
  fromIsLatam: boolean;
}

function resolveRoute(from: TokenMeta, to: TokenMeta): Route | null {
  const isUsdc = (t: TokenMeta) => t.address === TOKENS.usdc.address;
  if (isUsdc(from) === isUsdc(to)) return null;
  const latam = isUsdc(from) ? to : from;
  const poolId = AQUA0_POOL_BY_LATAM[latam.symbol];
  if (!poolId) return null;
  return { poolId, latamToken: latam, fromIsLatam: isUsdc(to) };
}

function parseAmount(input: string, decimals: number): bigint {
  if (!input) return 0n;
  const [whole, frac = ""] = input.split(".");
  if (!/^\d*$/.test(whole) || !/^\d*$/.test(frac)) return 0n;
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  try {
    return BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(fracPadded || "0");
  } catch {
    return 0n;
  }
}

function resolveCta(args: {
  isConnected: boolean;
  route: Route | null;
  amountInRaw: bigint;
  hasInsufficientBalance: boolean;
}): { label: string; disabled: boolean; subnote?: string } {
  if (!args.isConnected) {
    return { label: "Connect wallet to swap", disabled: true };
  }
  if (!args.route) {
    return {
      label: "Pick a USDC pair",
      disabled: true,
      subnote: "Aqua0 routes USDC ↔ each Twin LATAM stablecoin. No direct LATAM ↔ LATAM hop yet.",
    };
  }
  if (args.amountInRaw === 0n) {
    return { label: "Enter an amount", disabled: true };
  }
  if (args.hasInsufficientBalance) {
    return { label: "Insufficient balance", disabled: true };
  }
  return {
    label: "Swap (coming online next)",
    disabled: true,
    subnote: "On-chain swap router + V4 quoter land in the next deploy. UI is preview-only for now.",
  };
}
