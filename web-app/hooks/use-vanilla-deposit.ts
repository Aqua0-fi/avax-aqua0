"use client";

import { useState } from "react";
import { parseGwei, parseUnits } from "viem";
import { useAccount, useConfig } from "wagmi";
import {
  getTransactionCount,
  readContract,
  writeContract,
  waitForTransactionReceipt,
} from "@wagmi/core";
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

// The router pulls slightly more than `amount` per side due to V4 liquidity-
// math rounding at the full-range edge ticks. We approve with a 5% buffer so
// the modifyLiquidity call doesn't revert with ERC20InsufficientAllowance for
// a few wei of slack. Trivial cost; high resilience.
const APPROVE_SLACK_BPS = 500n; // +5%

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
    const approveAmount = amountRaw + (amountRaw * APPROVE_SLACK_BPS) / 10_000n;

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
      // ── 1 & 2. Approve both currencies (skip if allowance already covers) ──
      for (const { address: currency, stepLabel } of currencies) {
        setStep(stepLabel);
        const allowance = (await readContract(config, {
          address: currency,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, FUJI_DEPLOYMENT.liquidityRouter],
        })) as bigint;

        if (allowance < amountRaw) {
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
            args: [FUJI_DEPLOYMENT.liquidityRouter, approveAmount],
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
            liquidityDelta: amountRaw,
            salt: ZERO_BYTES32,
          },
        ],
        maxFeePerGas: MAX_FEE_PER_GAS,
        maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
      });
      await waitForTransactionReceipt(config, { hash });
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
