"use client";

import { useEffect, useState } from "react";
import { parseGwei, parseUnits } from "viem";
import {
  useAccount,
  usePublicClient,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { ERC20_ABI, type TokenMeta } from "@/lib/contracts";
import { FUJI_CHAIN_ID } from "@/lib/wagmi";

// Avalanche Fuji's RPC reports a baseFeePerGas as low as 1 wei when the
// chain is idle, and MetaMask's estimator naively adds a 1-wei tip on top.
// The result is a maxFeePerGas of 2 wei (yes — literally two wei), which
// validators correctly refuse to include. The tx then sits in MetaMask's
// outbound queue forever and the user thinks the app is broken.
//
// We force EIP-1559 fees high enough to clear any validator floor, while
// staying trivially cheap (50 gwei × 50k gas ≈ 0.0000025 AVAX per mint).
const MAX_FEE_PER_GAS = parseGwei("50");
const MAX_PRIORITY_FEE_PER_GAS = parseGwei("2");

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
  const publicClient = usePublicClient({ chainId: FUJI_CHAIN_ID });
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
    if (!publicClient) throw new Error("RPC not ready yet — try again");
    const amount = parseUnits(humanAmount, token.decimals);

    // Bypass the wallet's internal nonce counter. We've seen MetaMask
    // drift +16 ahead of the real chain nonce — every new tx then waits
    // forever for phantom predecessors. Reading from our own RPC and
    // passing the value explicitly to writeContractAsync forces MM to
    // use a valid nonce regardless of its internal state.
    const nonce = await publicClient.getTransactionCount({
      address,
      blockTag: "pending",
    });

    const hash = await writeContractAsync({
      // Pin to Fuji (avoids cross-chain phantom signs) + force a sane
      // EIP-1559 fee (idle Fuji's wallet-suggested 2 wei never includes).
      chainId: FUJI_CHAIN_ID,
      nonce,
      address: token.address,
      abi: ERC20_ABI,
      functionName: "mint",
      args: [address, amount],
      maxFeePerGas: MAX_FEE_PER_GAS,
      maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
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
