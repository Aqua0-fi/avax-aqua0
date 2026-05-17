"use client";

import { useState } from "react";
import { parseUnits } from "viem";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { ERC20_ABI, type TokenMeta } from "@/lib/contracts";
import { FUJI_CHAIN_ID } from "@/lib/wagmi";

// Public mint on the MockERC20s — anyone calls `mint(to, amount)` and gets
// tokens. No backend, no rate limit (intentional for the hackathon demo —
// real deploys would gate this). Designed to be instantiated once per row
// so each token's button has its own writing / confirming / success state
// instead of all sharing a single 'isPending' flag.
export function useMint() {
  const { address } = useAccount();
  const {
    writeContractAsync,
    isPending: isWriting,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const [pendingHash, setPendingHash] = useState<`0x${string}` | undefined>();
  const {
    isLoading: isConfirming,
    isSuccess,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash: pendingHash });

  async function mint(token: TokenMeta, humanAmount: string) {
    if (!address) throw new Error("Connect a wallet first");
    const amount = parseUnits(humanAmount, token.decimals);
    const hash = await writeContractAsync({
      // Pin the tx to Fuji. Without this, wagmi happily signs against
      // whichever chain the wallet is on — wallet returns a hash but
      // the broadcast either goes to the wrong network or fails silently,
      // and the receipt poll on Fuji never finds the tx. Passing chainId
      // forces wagmi to request a chain switch first if needed.
      chainId: FUJI_CHAIN_ID,
      address: token.address,
      abi: ERC20_ABI,
      functionName: "mint",
      args: [address, amount],
    });
    setPendingHash(hash);
    return hash;
  }

  // Lets a caller (e.g. the faucet row's 'mint again' click) clear the
  // success / error state without unmounting the hook.
  function reset() {
    setPendingHash(undefined);
    resetWrite();
  }

  return {
    mint,
    reset,
    /** Wallet is showing the signature popup. */
    isWriting,
    /** Tx submitted, waiting for inclusion. */
    isConfirming,
    /** Either of the above — convenience for disabled states. */
    isPending: isWriting || isConfirming,
    /** Receipt confirmed. */
    isSuccess,
    error: (writeError ?? receiptError) as Error | null | undefined,
    txHash: pendingHash,
  };
}
