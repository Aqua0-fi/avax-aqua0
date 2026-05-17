"use client";

import { useEffect, useState } from "react";
import { parseUnits } from "viem";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { ERC20_ABI, type TokenMeta } from "@/lib/contracts";
import { FUJI_CHAIN_ID } from "@/lib/wagmi";

// Wallets occasionally return a tx hash but never actually broadcast (RPC
// misconfigured, nonce desync, etc.). 30s is well past Fuji's worst-case
// confirmation time, so anything still pending after this is almost
// certainly a wallet-side issue the user needs to fix manually.
const STUCK_TIMEOUT_MS = 30_000;

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
  const [isStuck, setIsStuck] = useState(false);

  const {
    isLoading: isConfirming,
    isSuccess,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash: pendingHash });

  // Watch for the wallet-broadcast-failed mode: hash exists, polling started,
  // but no receipt after STUCK_TIMEOUT_MS. Flip `isStuck` so the UI can
  // surface a 'this looks like a wallet-side issue' hint with concrete
  // remediation steps (reset MetaMask account, swap RPC URL, etc.).
  useEffect(() => {
    if (!pendingHash) {
      setIsStuck(false);
      return;
    }
    if (isSuccess) {
      setIsStuck(false);
      return;
    }
    if (!isConfirming) return;
    const id = setTimeout(() => setIsStuck(true), STUCK_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [pendingHash, isConfirming, isSuccess]);

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
    setIsStuck(false);
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
    /** True after STUCK_TIMEOUT_MS of polling with no receipt — almost
     *  certainly a wallet-side broadcast issue, not our app. */
    isStuck,
    error: (writeError ?? receiptError) as Error | null | undefined,
    txHash: pendingHash,
  };
}
