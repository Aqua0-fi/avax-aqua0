// ============================================================================
// Deployed contract addresses on Avalanche Fuji.
//
// Populate from contracts/deployments/avalanche-fuji.json AFTER running
// `forge script script/DeployFuji.s.sol --broadcast`. Until then the demo
// reads via these placeholders and every write throws — wallets refuse to
// sign a tx to the zero address, which is the safest failure mode.
// ============================================================================

import type { Address } from "viem";

export const FUJI_DEPLOYMENT = {
  chainId: 43113,
  poolManager: "0x0000000000000000000000000000000000000000" as Address,
  slp: "0x0000000000000000000000000000000000000000" as Address,
  aqua0Hook: "0x0000000000000000000000000000000000000000" as Address,
  liquidityRouter: "0x0000000000000000000000000000000000000000" as Address,
  tokens: {
    usdc: "0x0000000000000000000000000000000000000000" as Address,
    // Ripio family — live on Ethereum + Base + World today, Avalanche on roadmap.
    wars: "0x0000000000000000000000000000000000000000" as Address,
    wbrl: "0x0000000000000000000000000000000000000000" as Address,
    wmxn: "0x0000000000000000000000000000000000000000" as Address,
    // Twin family (ex-Num) — Avalanche-native.
    nuars: "0x0000000000000000000000000000000000000000" as Address,
    nubrl: "0x0000000000000000000000000000000000000000" as Address,
    numxn: "0x0000000000000000000000000000000000000000" as Address,
  },
  pools: {
    // 6 Aqua0-enabled pools — every swap routes through Aqua0Hook, which
    // pulls SLP liquidity into the pool transient-style for the swap window.
    // Ripio family
    warsUsdcAqua0:  "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
    wbrlUsdcAqua0:  "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
    wmxnUsdcAqua0:  "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
    // Twin family
    nuarsUsdcAqua0: "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
    nubrlUsdcAqua0: "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
    numxnUsdcAqua0: "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
    // 1 vanilla V4 pool (no hook) — for the "look how much fewer fees a
    // traditional LP earns" comparison in the dashboard.
    warsUsdcVanilla:
      "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
  },
} as const;

// ============================================================================
// Token metadata. The on-chain MockERC20.symbol() returns these same strings;
// duplicating here lets the UI render without an extra RPC roundtrip.
// ============================================================================

export type Issuer = "ripio" | "twin" | "anchor";

export interface TokenMeta {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  /** UI accent. Anchors the comparison split-screen so each token has a colour. */
  accent: string;
  /** Which stablecoin issuer this token represents (for UI grouping). */
  issuer: Issuer;
}

export const TOKENS: Record<keyof typeof FUJI_DEPLOYMENT.tokens, TokenMeta> = {
  usdc: {
    address: FUJI_DEPLOYMENT.tokens.usdc,
    symbol: "USDC",
    name: "Mock USD Coin",
    decimals: 6,
    accent: "#7FE5E5",
    issuer: "anchor",
  },
  // ─── Ripio family ────────────────────────────────────────────────────
  wars: {
    address: FUJI_DEPLOYMENT.tokens.wars,
    symbol: "wARS",
    name: "Ripio Argentine Peso",
    decimals: 6,
    accent: "#74ACDF", // Argentine flag light blue
    issuer: "ripio",
  },
  wbrl: {
    address: FUJI_DEPLOYMENT.tokens.wbrl,
    symbol: "wBRL",
    name: "Ripio Brazilian Real",
    decimals: 6,
    accent: "#00A859", // Brazilian flag green
    issuer: "ripio",
  },
  wmxn: {
    address: FUJI_DEPLOYMENT.tokens.wmxn,
    symbol: "wMXN",
    name: "Ripio Mexican Peso",
    decimals: 6,
    accent: "#CE1126", // Mexican flag red
    issuer: "ripio",
  },
  // ─── Twin family ─────────────────────────────────────────────────────
  nuars: {
    address: FUJI_DEPLOYMENT.tokens.nuars,
    symbol: "nuARS",
    name: "Twin Argentine Peso",
    decimals: 6,
    accent: "#9DBBE0", // Slightly desaturated AR blue
    issuer: "twin",
  },
  nubrl: {
    address: FUJI_DEPLOYMENT.tokens.nubrl,
    symbol: "nuBRL",
    name: "Twin Brazilian Real",
    decimals: 6,
    accent: "#33B97A", // Slightly desaturated BR green
    issuer: "twin",
  },
  numxn: {
    address: FUJI_DEPLOYMENT.tokens.numxn,
    symbol: "nuMXN",
    name: "Twin Mexican Peso",
    decimals: 6,
    accent: "#DC4458", // Slightly desaturated MX red
    issuer: "twin",
  },
};

export const TOKEN_LIST: TokenMeta[] = [
  TOKENS.usdc,
  TOKENS.wars,
  TOKENS.wbrl,
  TOKENS.wmxn,
  TOKENS.nuars,
  TOKENS.nubrl,
  TOKENS.numxn,
];

// Just the 6 aqua0-pool tokens, USDC excluded — what the LP "backs" via
// JIT preferences. Useful when iterating over the comparison-card rows.
export const LATAM_STABLES: TokenMeta[] = [
  TOKENS.wars,
  TOKENS.wbrl,
  TOKENS.wmxn,
  TOKENS.nuars,
  TOKENS.nubrl,
  TOKENS.numxn,
];

// ============================================================================
// ABIs — kept inline (vs imported JSON) so the bundle stays one self-contained
// module and there's nothing for a future developer to wire up wrong.
// ============================================================================

export const ERC20_ABI = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
] as const;

export const SLP_ABI = [
  { type: "function", name: "deposit", stateMutability: "nonpayable", inputs: [{ name: "token", type: "address" }, { name: "amount", type: "uint256" }, { name: "beneficiary", type: "address" }], outputs: [] },
  { type: "function", name: "balances", stateMutability: "view", inputs: [{ name: "user", type: "address" }, { name: "token", type: "address" }], outputs: [{ name: "deposited", type: "uint256" }, { name: "withdrawn", type: "uint256" }, { name: "pnlCredit", type: "uint256" }, { name: "pnlDebit", type: "uint256" }] },
  { type: "function", name: "nonces", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "backendSigner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "setJITPosition", stateMutability: "nonpayable", inputs: [{ name: "poolId", type: "bytes32" }, { name: "tickLower", type: "int24" }, { name: "tickUpper", type: "int24" }, { name: "amount0", type: "uint256" }, { name: "amount1", type: "uint256" }], outputs: [] },
  { type: "event", name: "Deposited", inputs: [{ name: "beneficiary", type: "address", indexed: true }, { name: "token", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }, { name: "depositor", type: "address", indexed: false }], anonymous: false },
  { type: "event", name: "Withdrawn", inputs: [{ name: "owner", type: "address", indexed: true }, { name: "token", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }, { name: "recipient", type: "address", indexed: false }], anonymous: false },
  { type: "event", name: "JITPositionSet", inputs: [{ name: "owner", type: "address", indexed: true }, { name: "poolId", type: "bytes32", indexed: true }, { name: "tickLower", type: "int24", indexed: false }, { name: "tickUpper", type: "int24", indexed: false }, { name: "amount0", type: "uint256", indexed: false }, { name: "amount1", type: "uint256", indexed: false }], anonymous: false },
  { type: "event", name: "SwapSettled", inputs: [{ name: "swapId", type: "bytes32", indexed: true }, { name: "poolId", type: "bytes32", indexed: true }, { name: "feesUsd", type: "uint256", indexed: false }], anonymous: false },
] as const;

// PoolKey — used both for `poolManager.swap` and for deriving the on-chain
// PoolId. Mirrors v4-core's struct exactly so we can hash it client-side.
export interface PoolKey {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
}

// Helper: full-range tick boundaries for tick spacing = 60 (matches the deploy
// script's pool init). Hardcoded because we don't want to import the entire
// v4-core libraries just to compute these two ints.
export const FULL_RANGE_TICKS = {
  tickLower: -887220,
  tickUpper: 887220,
} as const;
