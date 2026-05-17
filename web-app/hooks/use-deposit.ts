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
import { useQueryClient } from "@tanstack/react-query";
import { ERC20_ABI, FUJI_DEPLOYMENT, SLP_ABI, type TokenMeta } from "@/lib/contracts";
import { FUJI_CHAIN_ID } from "@/lib/wagmi";

// Force EIP-1559 fees high enough to clear Avalanche Fuji validator floors.
// Fuji's reported baseFeePerGas drops to 1 wei when idle, and MetaMask's
// estimator faithfully suggests 2 wei — which then gets ignored by every
// validator and the tx sits in the wallet's queue forever. 50 gwei is
// ~0.0000025 AVAX per simple call: trivially cheap, but actually included.
const MAX_FEE_PER_GAS = parseGwei("50");
const MAX_PRIORITY_FEE_PER_GAS = parseGwei("2");

export type DepositStep =
  | "idle"
  | "checking"
  | "approving"
  | "depositing"
  | "done"
  | "error";

// Deposit flow — entirely on-chain, no server in the path:
//   1. read allowance directly from the ERC20
//   2. approve if needed
//   3. call SLP.deposit(token, amount, beneficiary)
//
// All calldata is constructed client-side with viem. There is no API,
// no signer service, no off-chain orchestrator — wallet → RPC → SLP.
export function useDeposit() {
  const { address } = useAccount();
  const config = useConfig();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<DepositStep>("idle");
  const [error, setError] = useState<string | null>(null);

  async function deposit(token: TokenMeta, humanAmount: string) {
    if (!address) {
      setStep("error");
      setError("Connect a wallet first");
      return;
    }
    setError(null);
    const amount = parseUnits(humanAmount, token.decimals);

    try {
      setStep("checking");
      const allowance = (await readContract(config, {
        address: token.address,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, FUJI_DEPLOYMENT.slp],
      })) as bigint;

      if (allowance < amount) {
        setStep("approving");
        // Bypass the wallet's internal nonce — read the real on-chain
        // nonce so we sign at a value the chain will actually accept.
        const approveNonce = await getTransactionCount(config, {
          address,
          chainId: FUJI_CHAIN_ID,
          blockTag: "pending",
        });
        const approveHash = await writeContract(config, {
          chainId: FUJI_CHAIN_ID,
          nonce: approveNonce,
          address: token.address,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [FUJI_DEPLOYMENT.slp, amount],
          maxFeePerGas: MAX_FEE_PER_GAS,
          maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
        });
        await waitForTransactionReceipt(config, { hash: approveHash });
      }

      setStep("depositing");
      // Re-read nonce — if approve fired above the chain nonce has
      // advanced; if not, this still returns the next free slot.
      const depositNonce = await getTransactionCount(config, {
        address,
        chainId: FUJI_CHAIN_ID,
        blockTag: "pending",
      });
      const depositHash = await writeContract(config, {
        chainId: FUJI_CHAIN_ID,
        nonce: depositNonce,
        address: FUJI_DEPLOYMENT.slp,
        abi: SLP_ABI,
        functionName: "deposit",
        args: [token.address, amount, address],
        maxFeePerGas: MAX_FEE_PER_GAS,
        maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
      });
      await waitForTransactionReceipt(config, { hash: depositHash });

      // Force every wagmi readContract subscriber on the page (SLPInventory,
      // KpiStrip, every DeployLiquidityCard sibling…) to refresh now instead
      // of waiting for the 5 s refetch tick.
      await queryClient.invalidateQueries();

      setStep("done");
      return depositHash;
    } catch (err) {
      console.error("[useDeposit] failed:", err);
      setStep("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function reset() {
    setStep("idle");
    setError(null);
  }

  return { deposit, reset, step, error };
}
