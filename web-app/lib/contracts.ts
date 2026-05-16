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
  // Deployed 2026-05-16 from script/DeployFuji.s.sol. Initial deployer
  // = SLP owner = backend signer = 0x235713C4CA6A8cd2adc0333F64d1b453BfCdBbfd
  poolManager:     "0xf834B15FfD886559da9811f15496bBDB2Af9830d" as Address,
  slp:             "0x347A8b1aD0CA5Fb3dAd5dA3D2DdEa50b23d07A15" as Address,
  aqua0Hook:       "0xC38167DE3989Fc85512A50EaB2F91fc5Ee1980C0" as Address,
  liquidityRouter: "0xe40cA809D78a84A08321Bb339DdFDEA5FeEe8dA7" as Address,
  tokens: {
    usdc:  "0x8137A1990f076c781384343FBd691E1dC924d9f6" as Address,
    // Ripio family — live on Ethereum + Base + World today, Avalanche on roadmap.
    wars:  "0x18557319e659F2E28893A0ac6b06722F04088A6A" as Address,
    wbrl:  "0x53f33805d01Fe67abC2CAc9a88A779131687F95E" as Address,
    wmxn:  "0xe97F0CEEBBd7889eC94b3C259284D51932cc7D0E" as Address,
    // Twin family (ex-Num) — Avalanche-native.
    nuars: "0xA1d694A0eC402C1aAEAc446E4D6CAa05fb38f20c" as Address,
    nubrl: "0x30C8EA542B635ffCC06005374aD4a6b2376296E0" as Address,
    numxn: "0xDAD6CEa7B8a6Bf791713bD7585A408c76a853d37" as Address,
  },
  pools: {
    // 6 Aqua0-enabled pools — every swap routes through Aqua0Hook, which
    // pulls SLP liquidity into the pool transient-style for the swap window.
    // Ripio family
    warsUsdcAqua0:  "0xf607a4f05160fb47d7dacf20bc3501f690c76d8fccfdc7b6ae4eeb49f41c53c0" as `0x${string}`,
    wbrlUsdcAqua0:  "0x233e4a9d031b1b1faebc35ecd96ea60010754424247d60d302b4a5c1f00ce1b0" as `0x${string}`,
    wmxnUsdcAqua0:  "0x80fd88bbc92a87dc5d8b8fb0fdd14bb3af75fbc3802fb90c68dc607c1bdabd06" as `0x${string}`,
    // Twin family
    nuarsUsdcAqua0: "0x5acd1f52ed4af4ca2c2b0af5779c71723d3b625626dafc12dd042d71858cc40a" as `0x${string}`,
    nubrlUsdcAqua0: "0xd67985e4011330efc242e939f6a4f8782f3bfd4de3886f531c864089fb41d51e" as `0x${string}`,
    numxnUsdcAqua0: "0xd07d5ab620afb35a92ebf3d740f6fa03923bcdcbf7066e5bafbde33e14eb9627" as `0x${string}`,
    // 1 vanilla V4 pool (no hook) — for the "look how much fewer fees a
    // traditional LP earns" comparison in the dashboard.
    warsUsdcVanilla: "0x73624a355b1887e248018b471c177c069747952e6cf7733a6d1154d9eb83a7b1" as `0x${string}`,
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
