// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Script, console} from "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/interfaces/IPoolManager.sol";
import {IHooks} from "@uniswap/v4-core/interfaces/IHooks.sol";
import {IUnlockCallback} from "@uniswap/v4-core/interfaces/callback/IUnlockCallback.sol";
import {PoolKey} from "@uniswap/v4-core/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/types/Currency.sol";
import {SwapParams} from "@uniswap/v4-core/types/PoolOperation.sol";
import {BalanceDelta} from "@uniswap/v4-core/types/BalanceDelta.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {MockERC20} from "../test/mocks/MockERC20.sol";

// ────────────────────────────────────────────────────────────────────────────
//                            SwapSimulator
// ────────────────────────────────────────────────────────────────────────────
//
// Demo helper that lets anyone (including a hackathon judge) trigger a
// batch of swaps with a single transaction. The contract holds its OWN
// balance of every token, so the caller doesn't need to faucet or approve
// anything — they just pay the gas for one tx, and the contract loops
// runBatch() internally.
//
// Why this exists: SimulateSwaps.s.sol works for us (deployer with a
// private key) but a judge clicking around the demo isn't going to set up
// Foundry. A contract-funded "Run 10 swaps" button gives them the same
// experience in a single MetaMask confirmation.
//
// Distribution: each batch runs the same number of swaps PER POOL on both
// sides — that's the only fair comparison. The Aqua0 side ends up with
// more total swaps because it backs one more market with the same capital,
// which is the whole point of the demo.
//
//   count=10 → 2 per pool → 6 Aqua0 + 4 vanilla = 10
//   count=15 → 3 per pool → 9 Aqua0 + 6 vanilla = 15
//   count=20 → 4 per pool → 12 Aqua0 + 8 vanilla = 20
//
// The owner funds this contract once, post-deploy, with a million of each
// token (auto-handled by the deploy script below).
// ────────────────────────────────────────────────────────────────────────────

contract SwapSimulator is IUnlockCallback {
    IPoolManager public immutable manager;
    address public immutable owner;

    // Pool config — must match DeployFuji.s.sol.
    uint24 constant POOL_FEE = 3000;
    int24 constant TICK_SPACING = 60;
    uint160 constant MIN_SQRT_PRICE_LIMIT = 4295128739 + 1;
    uint160 constant MAX_SQRT_PRICE_LIMIT = 1461446703485210103287273052203988822378723970342 - 1;

    // Token addresses (hardcoded from deployments/avalanche-fuji.json).
    address constant USDC = 0xffd244F82765C12c689e47081fE5534f5395b87B;
    address constant WARS = 0x03B04eFAc7277a297Ff691C5a6d29C10084459BB;
    address constant WBRL = 0x2880d49F24A6AA9689F07C2C128757EFB9694851;
    address constant ARST = 0x33BC928d9adEb922a651ee6A7EA5Bc6f115f51DB;
    address constant BRLT = 0xAa2B6da0897Ae108227f298ee096Cd2e8441BC4a;
    address constant MXNT = 0x4ffED179B94ebFBec4196E73F3823B2f23e44AF7;
    address constant AQUA0_HOOK = 0x43EbC33AC48f3FDf9aeF56a40e31F02D880280C0;

    // ─── Constants for the runBatch distribution ──────────────────────────
    // The 5 surfaced pools, in round-robin order. Each batch hits each
    // pool the same number of times.
    //   0 → ARSt/USDC (Aqua0, Twin)
    //   1 → BRLt/USDC (Aqua0, Twin)
    //   2 → MXNt/USDC (Aqua0, Twin)
    //   3 → wARS/USDC (vanilla, Ripio)
    //   4 → wBRL/USDC (vanilla, Ripio)
    uint8 constant NUM_POOLS = 5;

    // Sizes cycle through this table so the volume on each pool varies
    // realistically without us having to draw from chain randomness.
    // Stays well under the seeded pool liquidity (~100k both sides).
    uint256[4] private SIZES = [uint256(5_000), 10_000, 15_000, 25_000];

    // ─── Events ───────────────────────────────────────────────────────────
    event BatchStarted(address indexed caller, uint8 count, uint256 timestamp);
    event BatchFinished(address indexed caller, uint8 count);

    // ─── Errors ───────────────────────────────────────────────────────────
    error OnlyOwner();
    error OnlyManager();
    error InvalidCount();

    constructor(IPoolManager _manager) {
        manager = _manager;
        owner = msg.sender;
    }

    // ─── Funding ──────────────────────────────────────────────────────────

    /// @notice Owner pulls `perToken` of every surfaced token from their
    ///         wallet into this contract. Approve each token first.
    function fund(uint256 perToken) external {
        if (msg.sender != owner) revert OnlyOwner();
        address[6] memory tokens = [USDC, WARS, WBRL, ARST, BRLT, MXNT];
        for (uint256 i = 0; i < tokens.length; i++) {
            ERC20(tokens[i]).transferFrom(msg.sender, address(this), perToken);
        }
    }

    /// @notice Owner top-up via MockERC20.mint — convenient on testnets
    ///         where the deployer is also the token deployer.
    function mintAndFund(uint256 perToken) external {
        if (msg.sender != owner) revert OnlyOwner();
        address[6] memory tokens = [USDC, WARS, WBRL, ARST, BRLT, MXNT];
        for (uint256 i = 0; i < tokens.length; i++) {
            MockERC20(tokens[i]).mint(address(this), perToken);
        }
    }

    // ─── Batch entrypoint ─────────────────────────────────────────────────

    /// @notice Anyone can call. Runs `count` swaps distributed evenly
    ///         across the 5 surfaced pools. `count` must be a multiple
    ///         of 5 in [5, 25] so the per-pool count is balanced.
    function runBatch(uint8 count) external {
        if (count == 0 || count > 25 || count % NUM_POOLS != 0) {
            revert InvalidCount();
        }
        emit BatchStarted(msg.sender, count, block.timestamp);

        for (uint8 i = 0; i < count; i++) {
            (address latam, address hookAddr) = _pool(i % NUM_POOLS);
            uint256 size = SIZES[i % 4] * 1e6;
            bool usdcIn = (i % 2 == 0);
            _execute(latam, hookAddr, usdcIn, size);
        }

        emit BatchFinished(msg.sender, count);
    }

    // ─── Internal swap mechanics ──────────────────────────────────────────

    function _pool(uint8 idx) internal pure returns (address latam, address hookAddr) {
        if (idx == 0) return (ARST, AQUA0_HOOK);
        if (idx == 1) return (BRLT, AQUA0_HOOK);
        if (idx == 2) return (MXNT, AQUA0_HOOK);
        if (idx == 3) return (WARS, address(0));
        return (WBRL, address(0));
    }

    function _execute(address latam, address hookAddr, bool usdcIn, uint256 size) internal {
        (address t0, address t1) = latam < USDC ? (latam, USDC) : (USDC, latam);
        PoolKey memory key = PoolKey(
            Currency.wrap(t0),
            Currency.wrap(t1),
            POOL_FEE,
            TICK_SPACING,
            IHooks(hookAddr)
        );

        bool usdcIsToken0 = t0 == USDC;
        bool zeroForOne = usdcIn == usdcIsToken0;
        int256 amount = -int256(size);
        uint160 limit = zeroForOne ? MIN_SQRT_PRICE_LIMIT : MAX_SQRT_PRICE_LIMIT;

        manager.unlock(abi.encode(key, zeroForOne, amount, limit));
    }

    function unlockCallback(bytes calldata raw) external returns (bytes memory) {
        if (msg.sender != address(manager)) revert OnlyManager();
        (PoolKey memory key, bool zeroForOne, int256 amount, uint160 limit) =
            abi.decode(raw, (PoolKey, bool, int256, uint160));

        BalanceDelta delta = manager.swap(
            key,
            SwapParams({zeroForOne: zeroForOne, amountSpecified: amount, sqrtPriceLimitX96: limit}),
            new bytes(0)
        );
        int256 d0 = delta.amount0();
        int256 d1 = delta.amount1();

        // Hook owes PM → this contract sends tokens to PM.
        if (d0 < 0) {
            manager.sync(key.currency0);
            ERC20(Currency.unwrap(key.currency0)).transfer(address(manager), uint256(-d0));
            manager.settle();
        }
        if (d1 < 0) {
            manager.sync(key.currency1);
            ERC20(Currency.unwrap(key.currency1)).transfer(address(manager), uint256(-d1));
            manager.settle();
        }
        // PM owes hook → take to this contract.
        if (d0 > 0) manager.take(key.currency0, address(this), uint256(d0));
        if (d1 > 0) manager.take(key.currency1, address(this), uint256(d1));
        return abi.encode(delta);
    }
}

// ────────────────────────────────────────────────────────────────────────────
//                          DeploySwapSimulator
// ────────────────────────────────────────────────────────────────────────────
//
// Deploys + funds the SwapSimulator in one shot.
//
// Usage:
//   forge script script/DeploySwapSimulator.s.sol:DeploySwapSimulator \
//     --rpc-url https://api.avax-test.network/ext/bc/C/rpc \
//     --private-key $DEPLOYER_PRIVATE_KEY \
//     --broadcast -vvv
//
// After it runs, paste the printed address into:
//   - contracts/deployments/avalanche-fuji.json  (swapSimulator field)
//   - web-app/lib/contracts.ts                   (FUJI_DEPLOYMENT.swapSimulator)
// ────────────────────────────────────────────────────────────────────────────

contract DeploySwapSimulator is Script {
    uint256 constant FUJI_CHAIN_ID = 43113;
    address constant POOL_MANAGER = 0xa0E6d121Cb492E0F8A862109701FfC59CE9f2839;

    // Generous reserve: 5M of each token = 100 batches of 25 swaps × 25k each
    // before any single side runs dry.
    uint256 constant SEED_PER_TOKEN = 5_000_000 * 1e6;

    function run() external {
        require(block.chainid == FUJI_CHAIN_ID, "DeploySwapSimulator: must be on Fuji (43113)");

        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("=========================================");
        console.log("Aqua0 - SwapSimulator deploy + fund");
        console.log("=========================================");
        console.log("Deployer:    ", deployer);
        console.log("Seed/token:  ", SEED_PER_TOKEN);
        console.log("");

        vm.startBroadcast(deployerKey);

        SwapSimulator sim = new SwapSimulator(IPoolManager(POOL_MANAGER));
        // mintAndFund pulls fresh MockERC20 supply into the simulator
        // directly — no allowance dance needed.
        sim.mintAndFund(SEED_PER_TOKEN);

        vm.stopBroadcast();

        console.log("SwapSimulator deployed at:", address(sim));
        console.log("");
        console.log("Next steps:");
        console.log("  1. Add to deployments/avalanche-fuji.json:");
        console.log("     \"swapSimulator\": \"%s\",", address(sim));
        console.log("  2. Add to web-app/lib/contracts.ts FUJI_DEPLOYMENT.swapSimulator");
        console.log("  3. Reload /swap and click 'Run 10 swaps'");
    }
}
