"use client";

import { useState } from "react";
import { parseUnits } from "viem";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { ERC20_ABI, type TokenMeta } from "@/lib/contracts";

// Public mint on the MockERC20s — anyone calls `mint(to, amount)` and gets
// tokens. This is the faucet, no backend, no rate limit (intentional for the
// hackathon demo). Real deploys would gate this.
export function useMint() {
  const { address } = useAccount();
  const { writeContractAsync, isPending: isWriting } = useWriteContract();
  const [pendingHash, setPendingHash] = useState<`0x${string}` | undefined>();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: pendingHash,
  });

  async function mint(token: TokenMeta, humanAmount: string) {
    if (!address) throw new Error("Connect a wallet first");
    const amount = parseUnits(humanAmount, token.decimals);
    const hash = await writeContractAsync({
      address: token.address,
      abi: ERC20_ABI,
      functionName: "mint",
      args: [address, amount],
    });
    setPendingHash(hash);
    return hash;
  }

  return {
    mint,
    isPending: isWriting || isConfirming,
    txHash: pendingHash,
  };
}
