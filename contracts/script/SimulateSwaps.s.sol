// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Script, console} from "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/interfaces/IPoolManager.sol";
import {IHooks} from "@uniswap/v4-core/interfaces/IHooks.sol";
import {PoolKey} from "@uniswap/v4-core/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/types/Currency.sol";
import {SwapParams} from "@uniswap/v4-core/types/PoolOperation.sol";
import {MockERC20} from "../test/mocks/MockERC20.sol";
import {FujiSwapRouter} from "./DeploySwapRouter.s.sol";

// ────────────────────────────────────────────────────────────────────────────
//                            SimulateSwaps
// ────────────────────────────────────────────────────────────────────────────
//
// Runs ~20 mixed-direction swaps across the 5 surfaced pools (3 Twin Aqua0 +
// 2 Ripio vanilla). The Swap events emitted by PoolManager are what the
// frontend's `use-pool-stats` hook reads to compute per-pool volume + fees,
// which `<FeeComparison>` then aggregates into the "traditional pools vs
// SLP pools" comparison panel on /swap.
//
// This is meant to be run ONCE pre-demo by the deployer wallet (which already
// has 10M of each mock token from DeployFuji). The deployer mints itself
// extra tokens if needed and approves the swap router for max uint on all 7.
//
// Usage:
//   forge script script/SimulateSwaps.s.sol:SimulateSwaps \
//     --rpc-url https://api.avax-test.network/ext/bc/C/rpc \
//     --private-key $DEPLOYER_PRIVATE_KEY \
//     --broadcast \
//     --slow \
//     -vvv
//
// Re-run to add more swap activity. Cumulative — each run adds events on top
// of the existing ones, the frontend reads ALL events since slpDeployBlock.
// ────────────────────────────────────────────────────────────────────────────

contract SimulateSwaps is Script {
    uint256 constant FUJI_CHAIN_ID = 43113;

    // Pool config (matches DeployFuji.s.sol).
    uint24 constant POOL_FEE = 3000;
    int24 constant TICK_SPACING = 60;

    // sqrtPriceLimitX96 sentinels — widest valid range, so swaps never get
    // capped by the price limit (we let pool curve absorb whatever it can).
    uint160 constant MIN_SQRT_PRICE_LIMIT = 4295128739 + 1;
    uint160 constant MAX_SQRT_PRICE_LIMIT = 1461446703485210103287273052203988822378723970342 - 1;

    // ── Deployment addresses (from contracts/deployments/avalanche-fuji.json)
    address constant POOL_MANAGER = 0xa0E6d121Cb492E0F8A862109701FfC59CE9f2839;
    address constant AQUA0_HOOK   = 0x43EbC33AC48f3FDf9aeF56a40e31F02D880280C0;

    // Tokens.
    address constant USDC = 0xffd244F82765C12c689e47081fE5534f5395b87B;
    address constant WARS = 0x03B04eFAc7277a297Ff691C5a6d29C10084459BB;
    address constant WBRL = 0x2880d49F24A6AA9689F07C2C128757EFB9694851;
    address constant ARST = 0x33BC928d9adEb922a651ee6A7EA5Bc6f115f51DB;
    address constant BRLT = 0xAa2B6da0897Ae108227f298ee096Cd2e8441BC4a;
    address constant MXNT = 0x4ffED179B94ebFBec4196E73F3823B2f23e44AF7;

    // Deployed via DeploySwapRouter.s.sol on 2026-05-17, block 55463181,
    // tx 0xd3361e38c356dbeee5de0f1d601e2c5560a850a39d6ed99a12245c088b0995f6.
    address constant SWAP_ROUTER = 0xF267Faa603C41C3A4c644aCe91126a485caCE76D;

    // Pool keys reconstructed inline (cheaper than reading the JSON every run).
    // Each entry: (latam token, hook, label) — USDC pairing + sort handled in _key().
    struct PoolMeta { address latam; address hook; string label; }

    function run() external {
        require(block.chainid == FUJI_CHAIN_ID, "SimulateSwaps: must be on Avalanche Fuji (43113)");
        require(SWAP_ROUTER != address(0), "SimulateSwaps: paste FujiSwapRouter address into SWAP_ROUTER");

        uint256 traderKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address trader = vm.addr(traderKey);

        console.log("=========================================");
        console.log("Aqua0 - SimulateSwaps");
        console.log("=========================================");
        console.log("Trader:      ", trader);
        console.log("SwapRouter:  ", SWAP_ROUTER);
        console.log("");

        vm.startBroadcast(traderKey);

        _topUp(trader);
        _approveAll();
        _runSwaps();

        vm.stopBroadcast();

        console.log("");
        console.log("Done. The frontend should pick up the new Swap events");
        console.log("within ~5s (use-pool-stats refetchInterval).");
    }

    // ───────────────────────── Top-up trader balances ─────────────────────

    // Mint a generous batch so the trader can swap freely. MockERC20.mint
    // is permissionless on our deployment.
    function _topUp(address trader) internal {
        uint256 amt = 1_000_000 * 1e6; // 1M of each
        MockERC20(USDC).mint(trader, amt);
        MockERC20(WARS).mint(trader, amt);
        MockERC20(WBRL).mint(trader, amt);
        MockERC20(ARST).mint(trader, amt);
        MockERC20(BRLT).mint(trader, amt);
        MockERC20(MXNT).mint(trader, amt);
        console.log("[1/3] Topped up trader with 1M of each token");
    }

    function _approveAll() internal {
        address[6] memory tokens = [USDC, WARS, WBRL, ARST, BRLT, MXNT];
        for (uint256 i = 0; i < tokens.length; i++) {
            MockERC20(tokens[i]).approve(SWAP_ROUTER, type(uint256).max);
        }
        console.log("[2/3] Approved swap router for all 6 tokens");
    }

    // ───────────────────────── Swap loop ──────────────────────────────────

    function _runSwaps() internal {
        // 20 swaps mixed across the 5 surfaced pools.
        // Sizes vary 5k / 10k / 25k / 50k to create some volume realism
        // without draining liquidity (each pool was seeded with ~100k both
        // sides; biggest swap = 50k = 50% of one side, well within bounds).
        //
        // Twin Aqua0 pools get 12 swaps, Ripio vanilla pools get 8 — gives
        // the comparison panel some intentional asymmetry so the SLP side
        // looks busier than the vanilla side (which is the demo's point).

        // ─── Twin Aqua0 pools (12 swaps) ──────────────────────────────────
        _swap(ARST, AQUA0_HOOK, true,  10_000); // USDC -> ARSt
        _swap(BRLT, AQUA0_HOOK, true,  25_000);
        _swap(MXNT, AQUA0_HOOK, true,   5_000);
        _swap(ARST, AQUA0_HOOK, false, 15_000); // ARSt -> USDC
        _swap(BRLT, AQUA0_HOOK, false, 10_000);
        _swap(MXNT, AQUA0_HOOK, true,  20_000);
        _swap(ARST, AQUA0_HOOK, true,  50_000);
        _swap(BRLT, AQUA0_HOOK, true,  30_000);
        _swap(MXNT, AQUA0_HOOK, false,  8_000);
        _swap(ARST, AQUA0_HOOK, false, 12_000);
        _swap(BRLT, AQUA0_HOOK, true,   7_500);
        _swap(MXNT, AQUA0_HOOK, true,  18_000);

        // ─── Ripio vanilla pools (8 swaps) ────────────────────────────────
        _swap(WARS, address(0), true,  10_000); // USDC -> wARS
        _swap(WBRL, address(0), true,   8_000);
        _swap(WARS, address(0), false,  6_000); // wARS -> USDC
        _swap(WBRL, address(0), true,  15_000);
        _swap(WARS, address(0), true,  20_000);
        _swap(WBRL, address(0), false, 12_000);
        _swap(WARS, address(0), false,  5_000);
        _swap(WBRL, address(0), true,   9_500);

        console.log("[3/3] Executed 20 swaps (12 Aqua0 + 8 vanilla)");
    }

    // Internal helper. `latam` = LATAM stable token, `hookAddr` = Aqua0Hook
    // for Aqua0 pools or address(0) for vanilla. `usdcIn = true` means
    // USDC -> LATAM, `false` means LATAM -> USDC. `humanAmt` is in whole
    // dollars (e.g. 10_000 = $10k swap), converted to 6-decimal units below.
    function _swap(address latam, address hookAddr, bool usdcIn, uint256 humanAmt) internal {
        PoolKey memory key = _key(latam, hookAddr);

        // V4 currency0 < currency1 by address. We need to know if USDC is
        // token0 to set zeroForOne correctly.
        bool usdcIsToken0 = Currency.unwrap(key.currency0) == USDC;
        // zeroForOne = token0 -> token1. Want USDC -> LATAM:
        //   if USDC is token0, then zeroForOne = true
        //   if USDC is token1, then zeroForOne = false
        bool zeroForOne = usdcIn == usdcIsToken0;

        // exactIn — amountSpecified negative.
        int256 amount = -int256(humanAmt * 1e6);

        uint160 priceLimit = zeroForOne ? MIN_SQRT_PRICE_LIMIT : MAX_SQRT_PRICE_LIMIT;

        FujiSwapRouter(SWAP_ROUTER).swap(
            key,
            SwapParams({
                zeroForOne: zeroForOne,
                amountSpecified: amount,
                sqrtPriceLimitX96: priceLimit
            })
        );
    }

    function _key(address latam, address hookAddr) internal pure returns (PoolKey memory) {
        (address t0, address t1) = latam < USDC ? (latam, USDC) : (USDC, latam);
        return PoolKey(
            Currency.wrap(t0),
            Currency.wrap(t1),
            POOL_FEE,
            TICK_SPACING,
            IHooks(hookAddr)
        );
    }
}
