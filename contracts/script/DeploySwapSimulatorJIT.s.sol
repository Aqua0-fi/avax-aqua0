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
import {SharedLiquidityPool} from "../src/slp/SharedLiquidityPool.sol";

// ────────────────────────────────────────────────────────────────────────────
//                          SwapSimulatorJIT
// ────────────────────────────────────────────────────────────────────────────
//
// JIT-enabled cousin of SwapSimulator. Differences:
//
//  1. Holds a buffer of `signed JIT payloads` (one per Aqua0 swap), each
//     pre-signed off-chain by the SLP's backendSigner key. The buffer is
//     loaded by the owner via `loadPayloads(...)` after deployment.
//
//  2. For Aqua0 pool swaps, `runBatch` consumes the next payload from the
//     buffer and passes it as hookData to PoolManager. The Aqua0 hook
//     decodes hookData, verifies the signature via SLP, and pulls JIT
//     liquidity from the SLP transient-style for the swap window.
//
//  3. The V4Range[] used to compute every payload's `rangesHash` MUST
//     match `_ranges()` byte-for-byte at runtime — the SLP recomputes
//     `keccak256(abi.encode(ranges))` and compares against the signed
//     struct hash.
//
// Buffer accounting: for runBatch(count), the loop hits each of the 5
// pools `count/5` times (round-robin by `i % 5`). Pools 0..2 are Aqua0
// and consume payloads sequentially; pools 3..4 are vanilla and skip the
// buffer. So a batch of N consumes (3 * N / 5) payloads from the buffer.
//
// If the buffer is empty, runBatch reverts with `OutOfPayloads`. The owner
// can call `loadPayloads` again to top it up between demo sessions.
// ────────────────────────────────────────────────────────────────────────────

contract SwapSimulatorJIT is IUnlockCallback {
    IPoolManager public immutable manager;
    address public immutable owner;

    // Pool config — must match DeployFuji.s.sol.
    uint24 constant POOL_FEE = 3000;
    int24 constant TICK_SPACING = 60;
    uint160 constant MIN_SQRT_PRICE_LIMIT = 4295128739 + 1;
    uint160 constant MAX_SQRT_PRICE_LIMIT = 1461446703485210103287273052203988822378723970342 - 1;

    // Aqua0 hookData magic — must match Aqua0BaseHook.AQUA0_MAGIC.
    bytes32 constant AQUA0_MAGIC = keccak256("AQUA0_JIT_PAYLOAD");

    // V4Range used in EVERY signed payload (pre-signing script uses the
    // identical struct). Hard-coded full-range + 1e9 liquidity = ~1k
    // tokens on each side transiently per swap. SLP holds 100k of each
    // token after DeployFuji's `_seedSLP`, so the buffer can drain ~100
    // swaps' worth before the SLP needs a top-up.
    int24 constant RANGE_TICK_LOWER = -887220;
    int24 constant RANGE_TICK_UPPER = 887220;
    uint128 constant RANGE_LIQUIDITY = 1e9;

    // Token addresses (hardcoded from deployments/avalanche-fuji.json).
    address constant USDC = 0xffd244F82765C12c689e47081fE5534f5395b87B;
    address constant WARS = 0x03B04eFAc7277a297Ff691C5a6d29C10084459BB;
    address constant WBRL = 0x2880d49F24A6AA9689F07C2C128757EFB9694851;
    address constant ARST = 0x33BC928d9adEb922a651ee6A7EA5Bc6f115f51DB;
    address constant BRLT = 0xAa2B6da0897Ae108227f298ee096Cd2e8441BC4a;
    address constant MXNT = 0x4ffED179B94ebFBec4196E73F3823B2f23e44AF7;
    address constant AQUA0_HOOK = 0x43EbC33AC48f3FDf9aeF56a40e31F02D880280C0;

    uint8 constant NUM_POOLS = 5;

    uint256[4] private SIZES = [uint256(5_000), 10_000, 15_000, 25_000];

    // ─── JIT payload buffer ──────────────────────────────────────────────
    bytes[] public payloads;
    uint256 public cursor;

    // ─── Events ───────────────────────────────────────────────────────────
    event BatchStarted(address indexed caller, uint8 count, uint256 timestamp);
    event BatchFinished(address indexed caller, uint8 count);
    event PayloadsLoaded(uint256 count, uint256 totalInBuffer);

    // ─── Errors ───────────────────────────────────────────────────────────
    error OnlyOwner();
    error OnlyManager();
    error InvalidCount();
    error OutOfPayloads();

    constructor(IPoolManager _manager) {
        manager = _manager;
        owner = msg.sender;
    }

    // ─── Funding ──────────────────────────────────────────────────────────

    /// @notice Mint mocks straight into this contract. Permissionless mint
    ///         on the demo deployment.
    function mintAndFund(uint256 perToken) external {
        if (msg.sender != owner) revert OnlyOwner();
        address[6] memory tokens = [USDC, WARS, WBRL, ARST, BRLT, MXNT];
        for (uint256 i = 0; i < tokens.length; i++) {
            MockERC20(tokens[i]).mint(address(this), perToken);
        }
    }

    // ─── Payload buffer management ────────────────────────────────────────

    /// @notice Append `_payloads` to the buffer. Each entry is an
    ///         abi-encoded JITPayload (swapId, poolId, nonce, deadline,
    ///         signature) signed by the SLP's backendSigner.
    /// @dev    Pre-signed via `SignJitPayloads.s.sol`. Order MUST be
    ///         ARST, BRLT, MXNT, ARST, BRLT, MXNT, … (round-robin by
    ///         pool index 0..2 — matches the runBatch consumption order).
    function loadPayloads(bytes[] calldata _payloads) external {
        if (msg.sender != owner) revert OnlyOwner();
        for (uint256 i = 0; i < _payloads.length; i++) {
            payloads.push(_payloads[i]);
        }
        emit PayloadsLoaded(_payloads.length, payloads.length);
    }

    function payloadsAvailable() external view returns (uint256) {
        return payloads.length - cursor;
    }

    // ─── Batch entrypoint ─────────────────────────────────────────────────

    function runBatch(uint8 count) external {
        if (count == 0 || count > 25 || count % NUM_POOLS != 0) {
            revert InvalidCount();
        }
        uint8 perPool = count / NUM_POOLS;
        uint256 neededPayloads = 3 * uint256(perPool); // 3 Aqua0 pools
        if (cursor + neededPayloads > payloads.length) revert OutOfPayloads();

        emit BatchStarted(msg.sender, count, block.timestamp);

        for (uint8 i = 0; i < count; i++) {
            uint8 poolIdx = i % NUM_POOLS;
            (address latam, address hookAddr) = _pool(poolIdx);
            uint256 size = SIZES[i % 4] * 1e6;
            bool usdcIn = (i % 2 == 0);

            bytes memory hookData;
            if (hookAddr != address(0)) {
                // Aqua0 pool — consume next signed payload, build
                // hookData with magic + payload + ranges.
                bytes memory payload = payloads[cursor++];
                SharedLiquidityPool.V4Range[] memory ranges = _ranges();
                hookData = abi.encode(AQUA0_MAGIC, payload, ranges, bytes(""));
            } else {
                hookData = "";
            }

            _execute(latam, hookAddr, usdcIn, size, hookData);
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

    function _ranges() internal pure returns (SharedLiquidityPool.V4Range[] memory) {
        SharedLiquidityPool.V4Range[] memory r = new SharedLiquidityPool.V4Range[](1);
        r[0] = SharedLiquidityPool.V4Range({
            tickLower: RANGE_TICK_LOWER,
            tickUpper: RANGE_TICK_UPPER,
            liquidity: RANGE_LIQUIDITY
        });
        return r;
    }

    function _execute(
        address latam,
        address hookAddr,
        bool usdcIn,
        uint256 size,
        bytes memory hookData
    ) internal {
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

        manager.unlock(abi.encode(key, zeroForOne, amount, limit, hookData));
    }

    function unlockCallback(bytes calldata raw) external returns (bytes memory) {
        if (msg.sender != address(manager)) revert OnlyManager();
        (PoolKey memory key, bool zeroForOne, int256 amount, uint160 limit, bytes memory hookData) =
            abi.decode(raw, (PoolKey, bool, int256, uint160, bytes));

        BalanceDelta delta = manager.swap(
            key,
            SwapParams({zeroForOne: zeroForOne, amountSpecified: amount, sqrtPriceLimitX96: limit}),
            hookData
        );
        int256 d0 = delta.amount0();
        int256 d1 = delta.amount1();

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
        if (d0 > 0) manager.take(key.currency0, address(this), uint256(d0));
        if (d1 > 0) manager.take(key.currency1, address(this), uint256(d1));
        return abi.encode(delta);
    }
}

// ────────────────────────────────────────────────────────────────────────────
//                       DeploySwapSimulatorJIT
// ────────────────────────────────────────────────────────────────────────────
//
// Deploys + auto-funds. The payload buffer starts empty — run
// `SignJitPayloads.s.sol` afterwards to populate it.
// ────────────────────────────────────────────────────────────────────────────

contract DeploySwapSimulatorJIT is Script {
    uint256 constant FUJI_CHAIN_ID = 43113;
    address constant POOL_MANAGER = 0xa0E6d121Cb492E0F8A862109701FfC59CE9f2839;
    uint256 constant SEED_PER_TOKEN = 5_000_000 * 1e6;

    function run() external {
        require(block.chainid == FUJI_CHAIN_ID, "must be on Fuji (43113)");
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        console.log("Deploying SwapSimulatorJIT...");
        vm.startBroadcast(deployerKey);
        SwapSimulatorJIT sim = new SwapSimulatorJIT(IPoolManager(POOL_MANAGER));
        sim.mintAndFund(SEED_PER_TOKEN);
        vm.stopBroadcast();

        console.log("SwapSimulatorJIT deployed at:", address(sim));
        console.log("");
        console.log("Next: run SignJitPayloads to populate the payload buffer.");
        console.log("  SWAP_SIMULATOR_JIT=", address(sim));
    }
}
