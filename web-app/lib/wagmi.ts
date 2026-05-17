import { createConfig, fallback, http } from "wagmi";
import { avalancheFuji } from "wagmi/chains";
import { injected } from "wagmi/connectors";

// Single-chain wagmi config. We only support Avalanche Fuji here. The injected
// connector picks up Core Wallet, MetaMask, Rabby, etc. — anything that
// implements EIP-1193. No WalletConnect / Privy / RainbowKit dependency.
//
// RPC redundancy: we used to ship a single publicnode transport which would
// occasionally lag on receipt reads (useWaitForTransactionReceipt would spin
// forever on a confirmed tx because the polled RPC kept returning null).
// fallback() tries each RPC in order — if one is slow / errors / returns
// nothing, the next one picks up. publicnode goes first because it returns
// unfinalized state (needed for read-after-write); api.avax-test.network is
// the official endpoint and a reliable backstop for confirmed-state reads
// like receipts.
const PRIMARY_RPC =
  process.env.NEXT_PUBLIC_FUJI_RPC_URL ??
  "https://avalanche-fuji-c-chain.publicnode.com";

const FALLBACK_RPCS = [
  PRIMARY_RPC,
  "https://api.avax-test.network/ext/bc/C/rpc",
  "https://avalanche-fuji.drpc.org",
];

// De-dupe in case NEXT_PUBLIC_FUJI_RPC_URL is set to publicnode.
const UNIQUE_RPCS = Array.from(new Set(FALLBACK_RPCS));

export const FUJI_RPC = PRIMARY_RPC;

export const wagmiConfig = createConfig({
  chains: [avalancheFuji],
  connectors: [injected()],
  transports: {
    [avalancheFuji.id]: fallback(
      UNIQUE_RPCS.map((url) => http(url)),
      // Drop to the next RPC if a single call doesn't return in 4s. Most
      // healthy Fuji nodes respond in <200ms — 4s catches both 'silently
      // hanging' and 'briefly slow' scenarios without trigger-happiness.
      { rank: false, retryCount: 0 },
    ),
  },
  ssr: true,
  // Poll for new blocks every 1.5s. Fuji block time is ~2s, so this keeps
  // useWaitForTransactionReceipt + balance reads tight without hammering
  // the RPC.
  pollingInterval: 1_500,
});

export const FUJI_CHAIN_ID = avalancheFuji.id; // 43113

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
