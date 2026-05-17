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
  // Deployed 2026-05-16 from script/DeployFuji.s.sol (v2 — Twin tickers
  // ARSt/BRLt/MXNt + second vanilla baseline pool). Deployer / owner =
  // 0x235713C4CA6A8cd2adc0333F64d1b453BfCdBbfd. There is no off-chain
  // service in this build — the SLP contract has a `backendSigner` slot
  // (legacy from the multi-chain build), pointed at the deployer here so
  // it never gates anything off-chain.
  //
  // SLP balance accounting: the contract does NOT store per-user balances
  // on-chain — it only emits Deposited / Withdrawn events. We compute
  // balances client-side via getLogs (see use-slp-balance.ts). Still 100 %
  // on-chain — no backend, no indexer.
  // Old v1 deployment lives at contracts/deployments/avalanche-fuji-v1.json.
  poolManager:     "0xa0E6d121Cb492E0F8A862109701FfC59CE9f2839" as Address,
  slp:             "0xd0508EAA61bEd6e31299d56d3cDf4Be8F53863D4" as Address,
  aqua0Hook:       "0x43EbC33AC48f3FDf9aeF56a40e31F02D880280C0" as Address,
  liquidityRouter: "0xa3e4EC3fcd8e854437E69570BA385fD172830a2D" as Address,
  // The block at which the v2 SLP went live. Used as the lower bound for
  // getLogs() when computing per-user SLP balances from Deposited /
  // Withdrawn events. Pulled from deployments/avalanche-fuji.json.
  slpDeployBlock: 55441210n,
  tokens: {
    usdc: "0xffd244F82765C12c689e47081fE5534f5395b87B" as Address,
    // Ripio family — live on Ethereum + Base + World today, Avalanche on roadmap.
    wars: "0x03B04eFAc7277a297Ff691C5a6d29C10084459BB" as Address,
    wbrl: "0x2880d49F24A6AA9689F07C2C128757EFB9694851" as Address,
    wmxn: "0x63885Ed2448aF937ef24adE249DA42e491210684" as Address,
    // Twin family (ex-Num) — Avalanche-native. Post-rebrand `t` suffix.
    arst: "0x33BC928d9adEb922a651ee6A7EA5Bc6f115f51DB" as Address,
    brlt: "0xAa2B6da0897Ae108227f298ee096Cd2e8441BC4a" as Address,
    mxnt: "0x4ffED179B94ebFBec4196E73F3823B2f23e44AF7" as Address,
  },
  pools: {
    // 6 Aqua0-enabled pools deployed on-chain — each swap routes through
    // Aqua0Hook, which pulls SLP liquidity into the pool transient-style
    // for the swap window. The frontend only surfaces the 3 Twin pools as
    // strategies; the 3 Ripio Aqua0 pools below remain live on-chain but
    // are hidden from /strategies for demo simplicity (one issuer story).
    //
    // Ripio family (Aqua0) — deployed but NOT surfaced in the frontend.
    warsUsdcAqua0: "0xd8f62c0306f283d672b02ba456ea739e652ec2814ff820934e5ac7596726b63b" as `0x${string}`,
    wbrlUsdcAqua0: "0x4db7dfe9bb5f6979f1f3841759016531770423faca70bdbca7d0fdcbcbb899a0" as `0x${string}`,
    wmxnUsdcAqua0: "0x183b8492182f25791c2a3198334eebeecc1a6f0fde24b4440dad3c2bc08beb7d" as `0x${string}`,
    // Twin family (Aqua0) — the 3 active demo strategies.
    arstUsdcAqua0: "0x2ac7b9eba1f29435f01c326ae77e0ae5ad08df54756c83cc8523de5a3f460f34" as `0x${string}`,
    brltUsdcAqua0: "0xaaaaacd61b32d5f528b3904d0586727090619e28823090bd64993e46624b8b26" as `0x${string}`,
    mxntUsdcAqua0: "0x047f5ebafb6764ff2a567a41980c910559bd941c64e4f2f389a7dfa1460f4fbb" as `0x${string}`,
    // 2 vanilla V4 pools (no hook) — baseline for the dashboard's comparison.
    // The pitch story: '20k split across these 2 traditional pools earns N
    // fees; the same 20k in the SLP backs all 3 Twin Aqua0 pools.' Vanillas
    // are kept on Ripio's wARS / wBRL to underline that Aqua0 is also
    // issuer-agnostic (compare across issuers).
    warsUsdcVanilla: "0x32539f5dd9519f3b61f2cbfde4dc99abaad98da15701ac751465ea1e7df7291e" as `0x${string}`,
    wbrlUsdcVanilla: "0x6ee5c37291fa20922dacf82bcb18ab4d33a4b2866e47f711ed44f2c129d53499" as `0x${string}`,
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
  arst: {
    address: FUJI_DEPLOYMENT.tokens.arst,
    symbol: "ARSt",
    name: "Twin Argentine Peso",
    decimals: 6,
    accent: "#9DBBE0", // Slightly desaturated AR blue
    issuer: "twin",
  },
  brlt: {
    address: FUJI_DEPLOYMENT.tokens.brlt,
    symbol: "BRLt",
    name: "Twin Brazilian Real",
    decimals: 6,
    accent: "#33B97A", // Slightly desaturated BR green
    issuer: "twin",
  },
  mxnt: {
    address: FUJI_DEPLOYMENT.tokens.mxnt,
    symbol: "MXNt",
    name: "Twin Mexican Peso",
    decimals: 6,
    accent: "#DC4458", // Slightly desaturated MX red
    issuer: "twin",
  },
};

// 6 tokens surfaced in the frontend: USDC + 3 Twin (the Aqua0 strategies) +
// 2 Ripio (wARS / wBRL, kept so the user can interact with the vanilla
// baseline pools). wMXN is omitted — it has no corresponding strategy on
// /strategies and would only clutter the faucet / inventory.
export const TOKEN_LIST: TokenMeta[] = [
  TOKENS.usdc,
  TOKENS.arst,
  TOKENS.brlt,
  TOKENS.mxnt,
  TOKENS.wars,
  TOKENS.wbrl,
];

// The 3 Twin LATAM stables the LP backs via JIT preferences — i.e. the
// Aqua0 strategies the frontend exposes. USDC excluded (anchor side).
// Iteration target for the "back all markets" quick action.
export const LATAM_STABLES: TokenMeta[] = [
  TOKENS.arst,
  TOKENS.brlt,
  TOKENS.mxnt,
];

// ============================================================================
// Markets — one entry per FX market (ARS, BRL, MXN). After the Twin-only
// simplification each market has exactly one Aqua0 route (Twin's ARSt /
// BRLt / MXNt). The Ripio Aqua0 routes are still on-chain but not surfaced
// here, since the demo tells a single-issuer story.
// ============================================================================

export interface MarketRoute {
  /** Stable token on the non-USDC side of the pool. */
  token: TokenMeta;
  poolId: `0x${string}`;
}

export interface Market {
  /** Display label, e.g. "Argentine Peso". */
  label: string;
  /** Three-letter ISO code, e.g. "ARS". */
  code: "ARS" | "BRL" | "MXN";
  /** Flag emoji for the header. */
  flag: string;
  /** Twin-only route for this FX market. */
  routes: MarketRoute[];
}

export const MARKETS: Market[] = [
  {
    label: "Argentine Peso",
    code: "ARS",
    flag: "🇦🇷",
    routes: [
      { token: TOKENS.arst, poolId: FUJI_DEPLOYMENT.pools.arstUsdcAqua0 },
    ],
  },
  {
    label: "Brazilian Real",
    code: "BRL",
    flag: "🇧🇷",
    routes: [
      { token: TOKENS.brlt, poolId: FUJI_DEPLOYMENT.pools.brltUsdcAqua0 },
    ],
  },
  {
    label: "Mexican Peso",
    code: "MXN",
    flag: "🇲🇽",
    routes: [
      { token: TOKENS.mxnt, poolId: FUJI_DEPLOYMENT.pools.mxntUsdcAqua0 },
    ],
  },
];

export interface VanillaPool {
  token: TokenMeta;
  poolId: `0x${string}`;
}

export const VANILLA_POOLS: VanillaPool[] = [
  { token: TOKENS.wars, poolId: FUJI_DEPLOYMENT.pools.warsUsdcVanilla },
  { token: TOKENS.wbrl, poolId: FUJI_DEPLOYMENT.pools.wbrlUsdcVanilla },
];

// ============================================================================
// Strategies — flat list of every venue an LP can browse. A "strategy" here
// is a single pool (USDC ↔ one stablecoin), not a regional grouping. Three
// Twin Aqua0-hooked pools + two Ripio vanilla baselines = 5 total, each
// addressable via /strategies/[id].
//
// Why Twin-only Aqua0: the demo tells a single-issuer story (one cohesive
// LATAM-stable family). The 3 Ripio Aqua0 pools are still deployed on-chain
// but hidden from the UI. The vanilla pools stay on Ripio so the comparison
// also doubles as a cross-issuer baseline — visually reinforcing that Aqua0
// is issuer-agnostic.
// ============================================================================

export type StrategyKind = "aqua0" | "vanilla";

export interface Strategy {
  /** Stable slug for the URL — e.g. "twin-arst", "vanilla-wars". */
  id: string;
  kind: StrategyKind;
  /** The non-USDC side of the pair. */
  token: TokenMeta;
  poolId: `0x${string}`;
  marketCode: "ARS" | "BRL" | "MXN";
  marketLabel: string;
  marketFlag: string;
  /** Issuer family — only meaningful for aqua0 strategies. */
  issuer: "ripio" | "twin" | null;
}

export const STRATEGIES: Strategy[] = [
  // ─── Aqua0 · Twin ────────────────────────────────────────────────────
  {
    id: "twin-arst",
    kind: "aqua0",
    token: TOKENS.arst,
    poolId: FUJI_DEPLOYMENT.pools.arstUsdcAqua0,
    marketCode: "ARS",
    marketLabel: "Argentine Peso",
    marketFlag: "🇦🇷",
    issuer: "twin",
  },
  {
    id: "twin-brlt",
    kind: "aqua0",
    token: TOKENS.brlt,
    poolId: FUJI_DEPLOYMENT.pools.brltUsdcAqua0,
    marketCode: "BRL",
    marketLabel: "Brazilian Real",
    marketFlag: "🇧🇷",
    issuer: "twin",
  },
  {
    id: "twin-mxnt",
    kind: "aqua0",
    token: TOKENS.mxnt,
    poolId: FUJI_DEPLOYMENT.pools.mxntUsdcAqua0,
    marketCode: "MXN",
    marketLabel: "Mexican Peso",
    marketFlag: "🇲🇽",
    issuer: "twin",
  },
  // ─── Vanilla baselines (Ripio family — cross-issuer baseline) ───────
  {
    id: "vanilla-wars",
    kind: "vanilla",
    token: TOKENS.wars,
    poolId: FUJI_DEPLOYMENT.pools.warsUsdcVanilla,
    marketCode: "ARS",
    marketLabel: "Argentine Peso",
    marketFlag: "🇦🇷",
    issuer: null,
  },
  {
    id: "vanilla-wbrl",
    kind: "vanilla",
    token: TOKENS.wbrl,
    poolId: FUJI_DEPLOYMENT.pools.wbrlUsdcVanilla,
    marketCode: "BRL",
    marketLabel: "Brazilian Real",
    marketFlag: "🇧🇷",
    issuer: null,
  },
];

export const AQUA0_STRATEGIES = STRATEGIES.filter((s) => s.kind === "aqua0");
export const VANILLA_STRATEGIES = STRATEGIES.filter((s) => s.kind === "vanilla");

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

// SharedLiquidityPool ABI — matches src/slp/SharedLiquidityPool.sol exactly.
//
// Important: the contract does NOT expose a `balances(user, token)` getter.
// Per-user balances are not stored on-chain at all. The architecture relies
// on a backend indexing the Deposited / Withdrawn events and computing
// balances off-chain. For our zero-backend frontend we do the same thing
// client-side via publicClient.getLogs() — see hooks/use-slp-balance.ts.
//
// setJITPosition's signature is wider than you might expect because the
// contract was originally cross-chain: each declaration carries a
// `targetChainId` and explicit token0/token1 addresses so the Aqua0 hook
// on a remote chain can verify the source LP has matching backing.
export const SLP_ABI = [
  { type: "function", name: "deposit", stateMutability: "nonpayable", inputs: [{ name: "token", type: "address" }, { name: "amount", type: "uint256" }, { name: "beneficiary", type: "address" }], outputs: [] },
  { type: "function", name: "setJITPosition", stateMutability: "nonpayable", inputs: [
    { name: "poolId", type: "bytes32" },
    { name: "targetChainId", type: "uint256" },
    { name: "tickLower", type: "int24" },
    { name: "tickUpper", type: "int24" },
    { name: "amount0", type: "uint256" },
    { name: "amount1", type: "uint256" },
    { name: "token0", type: "address" },
    { name: "token1", type: "address" },
  ], outputs: [] },
  { type: "function", name: "removeJITPosition", stateMutability: "nonpayable", inputs: [{ name: "poolId", type: "bytes32" }], outputs: [] },
  { type: "event", name: "Deposited", inputs: [
    { name: "user", type: "address", indexed: true },
    { name: "token", type: "address", indexed: true },
    { name: "amount", type: "uint256", indexed: false },
  ], anonymous: false },
  { type: "event", name: "Withdrawn", inputs: [
    { name: "user", type: "address", indexed: true },
    { name: "token", type: "address", indexed: true },
    { name: "amount", type: "uint256", indexed: false },
    { name: "destination", type: "address", indexed: false },
  ], anonymous: false },
  { type: "event", name: "JITPositionSet", inputs: [
    { name: "lp", type: "address", indexed: true },
    { name: "poolId", type: "bytes32", indexed: true },
    { name: "sourceChainId", type: "uint256", indexed: true },
    { name: "targetChainId", type: "uint256", indexed: false },
    { name: "tickLower", type: "int24", indexed: false },
    { name: "tickUpper", type: "int24", indexed: false },
    { name: "amount0", type: "uint256", indexed: false },
    { name: "amount1", type: "uint256", indexed: false },
    { name: "token0", type: "address", indexed: false },
    { name: "token1", type: "address", indexed: false },
  ], anonymous: false },
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

// Pool config constants — mirror script/DeployFuji.s.sol exactly. Every pool
// on Fuji was initialised with these values, so any PoolKey we rebuild on the
// client must match or the V4 PoolId hashes won't line up.
export const POOL_FEE = 3000; // 0.30%
export const TICK_SPACING = 60;
export const ZERO_HOOK: Address = "0x0000000000000000000000000000000000000000";

/**
 * Build the V4 PoolKey for a vanilla strategy from its (USDC, latam-stable)
 * pair. V4 requires currency0.address < currency1.address — we sort here so
 * the resulting key hashes to the on-chain PoolId.
 */
export function buildVanillaPoolKey(strategy: Strategy): PoolKey {
  if (strategy.kind !== "vanilla") {
    throw new Error(`buildVanillaPoolKey: strategy "${strategy.id}" is not vanilla`);
  }
  const usdc = FUJI_DEPLOYMENT.tokens.usdc;
  const other = strategy.token.address;
  const [currency0, currency1] =
    usdc.toLowerCase() < other.toLowerCase() ? [usdc, other] : [other, usdc];
  return {
    currency0,
    currency1,
    fee: POOL_FEE,
    tickSpacing: TICK_SPACING,
    hooks: ZERO_HOOK,
  };
}

// FujiLiquidityRouter ABI — script/DeployFuji.s.sol ships a minimal
// IUnlockCallback router because V4 has no canonical liquidity router yet.
// `modifyLiquidity(key, params)` takes a PoolKey + ModifyLiquidityParams and
// pulls token0/token1 from msg.sender via transferFrom inside the unlock
// callback. Approve currency0 + currency1 first, then call.
export const LIQUIDITY_ROUTER_ABI = [
  {
    type: "function",
    name: "modifyLiquidity",
    stateMutability: "payable",
    inputs: [
      {
        name: "key",
        type: "tuple",
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tickLower", type: "int24" },
          { name: "tickUpper", type: "int24" },
          { name: "liquidityDelta", type: "int256" },
          { name: "salt", type: "bytes32" },
        ],
      },
    ],
    // BalanceDelta is packed (int128 amount0, int128 amount1) inside an int256
    // by v4-core. We don't decode the return value on the client.
    outputs: [{ name: "delta", type: "int256" }],
  },
] as const;

export const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as const;
