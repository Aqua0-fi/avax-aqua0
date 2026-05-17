// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Script, console} from "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "@uniswap/v4-core/interfaces/callback/IUnlockCallback.sol";
import {PoolKey} from "@uniswap/v4-core/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/types/Currency.sol";
import {SwapParams} from "@uniswap/v4-core/types/PoolOperation.sol";
import {BalanceDelta} from "@uniswap/v4-core/types/BalanceDelta.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// ────────────────────────────────────────────────────────────────────────────
// FujiSwapRouter — mirror of FujiLiquidityRouter but for swaps.
//
// V4 ships PoolSwapTest in v4-core/test, but importing it across our
// ^0.8.34 build pulls in extra TestSettings struct + claims/burn paths we
// don't need. This 35-line router is the swap equivalent of our existing
// FujiLiquidityRouter: a single `swap(PoolKey, SwapParams)` entrypoint
// that takes ERC20 tokens from msg.sender, calls poolManager.unlock, and
// settles deltas with a sync/transferFrom/settle dance.
//
// All swaps go through this single router, regardless of which pool
// (Aqua0-hooked or vanilla) they target — so SimulateSwaps.s.sol just
// loops over pool keys.
// ────────────────────────────────────────────────────────────────────────────

contract FujiSwapRouter is IUnlockCallback {
    IPoolManager public immutable manager;
    constructor(IPoolManager _manager) { manager = _manager; }
    struct CallbackData { address sender; PoolKey key; SwapParams params; }

    function swap(PoolKey memory key, SwapParams memory params)
        external returns (BalanceDelta delta)
    {
        delta = abi.decode(
            manager.unlock(abi.encode(CallbackData(msg.sender, key, params))),
            (BalanceDelta)
        );
    }

    function unlockCallback(bytes calldata rawData) external returns (bytes memory) {
        require(msg.sender == address(manager), "only manager");
        CallbackData memory data = abi.decode(rawData, (CallbackData));
        BalanceDelta delta = manager.swap(data.key, data.params, new bytes(0));
        int256 d0 = delta.amount0();
        int256 d1 = delta.amount1();
        if (d0 < 0) {
            manager.sync(data.key.currency0);
            ERC20(Currency.unwrap(data.key.currency0)).transferFrom(data.sender, address(manager), uint256(-d0));
            manager.settle();
        }
        if (d1 < 0) {
            manager.sync(data.key.currency1);
            ERC20(Currency.unwrap(data.key.currency1)).transferFrom(data.sender, address(manager), uint256(-d1));
            manager.settle();
        }
        if (d0 > 0) manager.take(data.key.currency0, data.sender, uint256(d0));
        if (d1 > 0) manager.take(data.key.currency1, data.sender, uint256(d1));
        return abi.encode(delta);
    }
}

// ────────────────────────────────────────────────────────────────────────────
//                          DeploySwapRouter
// ────────────────────────────────────────────────────────────────────────────
//
// Standalone deploy of the swap router. The DeployFuji script doesn't include
// it because the swap router is only needed for the demo's "simulated trading
// activity" — it isn't part of the LP happy path (LPs deposit + setJIT, they
// never swap from the app). Keeping it separate lets us redeploy / iterate on
// the trader side without touching the main deployment.
//
// Usage:
//   forge script script/DeploySwapRouter.s.sol:DeploySwapRouter \
//     --rpc-url https://api.avax-test.network/ext/bc/C/rpc \
//     --private-key $DEPLOYER_PRIVATE_KEY \
//     --broadcast \
//     -vvv
//
// After running, paste the printed address into:
//   - contracts/deployments/avalanche-fuji.json  (swapRouter field)
//   - web-app/lib/contracts.ts                   (FUJI_DEPLOYMENT.swapRouter)
// ────────────────────────────────────────────────────────────────────────────

contract DeploySwapRouter is Script {
    uint256 constant FUJI_CHAIN_ID = 43113;

    // PoolManager address from contracts/deployments/avalanche-fuji.json.
    // Hardcoded so this script is self-contained (no JSON parsing).
    address constant POOL_MANAGER = 0xa0E6d121Cb492E0F8A862109701FfC59CE9f2839;

    function run() external {
        require(block.chainid == FUJI_CHAIN_ID, "DeploySwapRouter: must be on Avalanche Fuji (43113)");

        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("=========================================");
        console.log("Aqua0 - FujiSwapRouter deploy");
        console.log("=========================================");
        console.log("Deployer:    ", deployer);
        console.log("PoolManager: ", POOL_MANAGER);
        console.log("");

        vm.startBroadcast(deployerKey);
        FujiSwapRouter router = new FujiSwapRouter(IPoolManager(POOL_MANAGER));
        vm.stopBroadcast();

        console.log("FujiSwapRouter deployed at:", address(router));
        console.log("");
        console.log("Next steps:");
        console.log("  1. Add to deployments/avalanche-fuji.json:");
        console.log("     \"swapRouter\": \"%s\",", address(router));
        console.log("  2. Add to web-app/lib/contracts.ts FUJI_DEPLOYMENT.swapRouter");
        console.log("  3. Run SimulateSwaps.s.sol to seed swap activity");
    }
}
