"use client";

import { useState } from "react";
import { parseUnits } from "viem";
import { useAccount, useConfig } from "wagmi";
import {
  readContract,
  writeContract,
  waitForTransactionReceipt,
} from "@wagmi/core";
import { ERC20_ABI, FUJI_DEPLOYMENT, SLP_ABI, type TokenMeta } from "@/lib/contracts";
import { FUJI_CHAIN_ID } from "@/lib/wagmi";

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
        const approveHash = await writeContract(config, {
          chainId: FUJI_CHAIN_ID,
          address: token.address,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [FUJI_DEPLOYMENT.slp, amount],
        });
        await waitForTransactionReceipt(config, { hash: approveHash });
      }

      setStep("depositing");
      const depositHash = await writeContract(config, {
        chainId: FUJI_CHAIN_ID,
        address: FUJI_DEPLOYMENT.slp,
        abi: SLP_ABI,
        functionName: "deposit",
        args: [token.address, amount, address],
      });
      await waitForTransactionReceipt(config, { hash: depositHash });

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
