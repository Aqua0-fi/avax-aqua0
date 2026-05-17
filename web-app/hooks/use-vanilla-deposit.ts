"use client";

// @refresh reset — see use-slp-balance.ts for the full rationale. Custom
// hooks whose internal hook count changes between edits crash Fast Refresh
// with "Rendered more hooks than during the previous render"; this pragma
// forces a full remount of consumers when this file changes.

import { useState } from "react";
import { maxUint256, parseGwei, parseUnits } from "viem";
import { useAccount, useConfig } from "wagmi";
import {
  getTransactionCount,
  readContract,
  writeContract,
  waitForTransactionReceipt,
} from "@wagmi/core";
import { useQueryClient } from "@tanstack/react-query";
import {
  ERC20_ABI,
  FUJI_DEPLOYMENT,
  FULL_RANGE_TICKS,
  LIQUIDITY_ROUTER_ABI,
  ZERO_BYTES32,
  buildVanillaPoolKey,
  type Strategy,
} from "@/lib/contracts";
import { FUJI_CHAIN_ID } from "@/lib/wagmi";

// Force EIP-1559 fees high enough to clear Avalanche Fuji validator floors.
// Same note as use-mint.ts: Fuji idle reports baseFee 1 wei → MetaMask
// estimates 2 wei → validators won't include. 50 gwei is trivially cheap
// but actually lands on-chain.
const MAX_FEE_PER_GAS = parseGwei("50");
const MAX_PRIORITY_FEE_PER_GAS = parseGwei("2");

// V4's full-range liquidity math rounds the amount each side owes UP, so a
// liquidityDelta of L pulls "L + a few wei" of each token. Two consequences:
//
//   1. We approve max uint per token instead of trying to track the exact
//      slack — the router is trusted (it's a demo helper we deployed) and
//      max-uint approvals are standard practice (Uniswap router, 1inch, etc).
//   2. We shrink the liquidityDelta vs the human amount by 1% so the
//      ceiling-rounded token amount comfortably fits within the user's
//      balance. Without this, a user who minted exactly 10k via the faucet
//      and tries to deposit 10k hits ERC20InsufficientBalance for a single
//      rounding wei.
const LIQUIDITY_SHRINK_BPS = 100n; // -1 %

export type VanillaDepositStep =
  | "idle"
  | "approving-currency0"
  | "approving-currency1"
  | "depositing"
  | "done"
  | "error";

// Vanilla pool LP flow — entirely on-chain, no SLP in the path:
//
//   1. Read currency0 allowance for the FujiLiquidityRouter; approve if short.
//   2. Same for currency1.
//   3. Call router.modifyLiquidity(poolKey, {tickLower, tickUpper,
//      liquidityDelta, salt}). Inside its unlock callback, the router runs
//      poolManager.modifyLiquidity and transferFrom-s the required currency0
//      / currency1 amounts from msg.sender into the pool.
//
// All three steps use the same gas / nonce / chainId overrides as the SLP
// hooks (see use-deposit.ts) — Fuji's idle conditions otherwise leave txs
// stuck in the wallet queue forever.
export function useVanillaDeposit() {
  const { address } = useAccount();
  const config = useConfig();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<VanillaDepositStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  async function deposit(strategy: Strategy, humanAmount: string) {
    if (!address) {
      setStep("error");
      setError("Connect a wallet first");
      return;
    }
    if (strategy.kind !== "vanilla") {
      setStep("error");
      setError("useVanillaDeposit only handles vanilla strategies");
      return;
    }

    setError(null);
    setTxHash(undefined);

    // Full-range V4 at the seeded 1:1 price means liquidityDelta in raw
    // units ≈ raw amount of each token the router will pull. Both vanilla
    // tokens are 6-decimal mocks at 1:1 with USDC, so we can treat one
    // `humanAmount` as the deposit on each side.
    const amountRaw = parseUnits(humanAmount, strategy.token.decimals);
    if (amountRaw === 0n) {
      setStep("error");
      setError("Amount must be greater than zero");
      return;
    }
    // Liquidity passed to V4 is shrunk slightly so the rounded-up token
    // amounts each side actually owes fit inside the user's balance. See
    // LIQUIDITY_SHRINK_BPS rationale above.
    const liquidityDelta =
      amountRaw - (amountRaw * LIQUIDITY_SHRINK_BPS) / 10_000n;

    const key = buildVanillaPoolKey(strategy);
    const currencies: ReadonlyArray<{
      address: `0x${string}`;
      stepLabel: Extract<
        VanillaDepositStep,
        "approving-currency0" | "approving-currency1"
      >;
    }> = [
      { address: key.currency0, stepLabel: "approving-currency0" },
      { address: key.currency1, stepLabel: "approving-currency1" },
    ];

    try {
      // ── 1 & 2. Approve both currencies (max uint, skip if already done) ──
      // Half-uint as the threshold: any existing max-uint allowance comfortably
      // exceeds this; partial allowances from older code paths get re-approved.
      const APPROVE_THRESHOLD = maxUint256 / 2n;
      for (const { address: currency, stepLabel } of currencies) {
        setStep(stepLabel);
        const allowance = (await readContract(config, {
          address: currency,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, FUJI_DEPLOYMENT.liquidityRouter],
        })) as bigint;

        if (allowance < APPROVE_THRESHOLD) {
          const nonce = await getTransactionCount(config, {
            address,
            chainId: FUJI_CHAIN_ID,
            blockTag: "pending",
          });
          const approveHash = await writeContract(config, {
            chainId: FUJI_CHAIN_ID,
            nonce,
            address: currency,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [FUJI_DEPLOYMENT.liquidityRouter, maxUint256],
            maxFeePerGas: MAX_FEE_PER_GAS,
            maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
          });
          await waitForTransactionReceipt(config, { hash: approveHash });
        }
      }

      // ── 3. modifyLiquidity — full-range positive delta ──────────────
      setStep("depositing");
      const nonce = await getTransactionCount(config, {
        address,
        chainId: FUJI_CHAIN_ID,
        blockTag: "pending",
      });
      const hash = await writeContract(config, {
        chainId: FUJI_CHAIN_ID,
        nonce,
        address: FUJI_DEPLOYMENT.liquidityRouter,
        abi: LIQUIDITY_ROUTER_ABI,
        functionName: "modifyLiquidity",
        args: [
          key,
          {
            tickLower: FULL_RANGE_TICKS.tickLower,
            tickUpper: FULL_RANGE_TICKS.tickUpper,
            liquidityDelta,
            salt: ZERO_BYTES32,
          },
        ],
        maxFeePerGas: MAX_FEE_PER_GAS,
        maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
      });
      await waitForTransactionReceipt(config, { hash });

      // Refresh every wagmi readContract subscriber so wallet balances drop
      // immediately on the inventory + KPI strip without waiting for the
      // 5 s refetch tick.
      await queryClient.invalidateQueries();

      setTxHash(hash);
      setStep("done");
      return hash;
    } catch (err) {
      console.error("[useVanillaDeposit] failed:", err);
      setStep("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function reset() {
    setStep("idle");
    setError(null);
    setTxHash(undefined);
  }

  return { deposit, reset, step, error, txHash };
}
