import { http, createConfig } from "wagmi";
import { avalancheFuji } from "wagmi/chains";
import { injected } from "wagmi/connectors";

// Single-chain wagmi config. We only support Avalanche Fuji here. The injected
// connector picks up Core Wallet, MetaMask, Rabby, etc. — anything that
// implements EIP-1193. No WalletConnect / Privy / RainbowKit dependency,
// which keeps the bundle and the surface area minimal for the hackathon.
export const FUJI_RPC =
  process.env.NEXT_PUBLIC_FUJI_RPC_URL ??
  "https://api.avax-test.network/ext/bc/C/rpc";

export const wagmiConfig = createConfig({
  chains: [avalancheFuji],
  connectors: [injected()],
  transports: {
    [avalancheFuji.id]: http(FUJI_RPC),
  },
  ssr: true,
});

export const FUJI_CHAIN_ID = avalancheFuji.id; // 43113

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
