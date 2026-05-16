// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {IPoolManager} from "@uniswap/v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/types/PoolId.sol";
import {
    BalanceDelta,
    BalanceDeltaLibrary
} from "@uniswap/v4-core/types/BalanceDelta.sol";
import {
    BeforeSwapDelta,
    BeforeSwapDeltaLibrary
} from "@uniswap/v4-core/types/BeforeSwapDelta.sol";
import {ModifyLiquidityParams} from "@uniswap/v4-core/types/PoolOperation.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/types/Currency.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    SafeERC20
} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IAqua0BaseHookMarker} from "./IAqua0BaseHookMarker.sol";
import {SharedLiquidityPool} from "./SharedLiquidityPool.sol";
import {
    TransientStateLibrary
} from "@uniswap/v4-core/libraries/TransientStateLibrary.sol";
import {StateLibrary} from "@uniswap/v4-core/libraries/StateLibrary.sol";

/// @title Aqua0BaseHook
/// @author Aqua0 Team
/// @notice Abstract base for Uniswap V4 hooks that integrate Aqua0's JIT shared liquidity.
///         Custom hook developers inherit this and call _addVirtualLiquidity / _removeVirtualLiquidity
///         / _settleVirtualLiquidityDeltas in their beforeSwap / afterSwap implementations.
abstract contract Aqua0BaseHook is IAqua0BaseHookMarker {
    using SafeERC20 for IERC20;
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;
    using BalanceDeltaLibrary for BalanceDelta;
    using TransientStateLibrary for IPoolManager;
    using StateLibrary for IPoolManager;

    // ─── Constants ────────────────────────────────────────────────────────────

    bytes32 constant AQUA0_MAGIC = keccak256("AQUA0_JIT_PAYLOAD");

    // ─── Transient state: survives between beforeSwap and afterSwap ───────────

    bytes32 transient activeSwapId;

    // ─── Immutables ───────────────────────────────────────────────────────────

    IPoolManager public immutable poolManager;
    SharedLiquidityPool public immutable sharedPool;

    // ─── Events ──────────────────────────────────────────────────────────────

    event VirtualLiquidityAdded(
        PoolId indexed poolId,
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity
    );
    event VirtualLiquidityRemoved(
        PoolId indexed poolId,
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity
    );

    // ─── Errors ──────────────────────────────────────────────────────────────

    error NotPoolManager();

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyPoolManager() {
        if (msg.sender != address(poolManager)) revert NotPoolManager();
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(
        IPoolManager _poolManager,
        SharedLiquidityPool _sharedPool
    ) {
        poolManager = _poolManager;
        sharedPool = _sharedPool;
    }

    // ─── ERC165 ──────────────────────────────────────────────────────────────

    function isAqua0BaseHook() external pure returns (bool) {
        return true;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual returns (bool) {
        return interfaceId == type(IAqua0BaseHookMarker).interfaceId;
    }

    // ─── Internal API for Custom Hooks ───────────────────────────────────────

    /// @notice Inject virtual JIT liquidity from Aqua0's shared pool.
    ///         Call this inside `beforeSwap` of your custom hook.
    /// @param key The pool key for the current swap
    /// @param hookData Raw hookData from the swap — may or may not contain Aqua0 JIT payload
    function _addVirtualLiquidity(
        PoolKey calldata key,
        bytes calldata hookData
    ) internal {
        if (hookData.length < 32) return;

        bytes32 magic;
        assembly {
            magic := calldataload(hookData.offset)
        }
        if (magic != AQUA0_MAGIC) return;

        (
            ,
            bytes memory aqua0Payload,
            SharedLiquidityPool.V4Range[] memory ranges,

        ) = abi.decode(
                hookData,
                (bytes32, bytes, SharedLiquidityPool.V4Range[], bytes)
            );
        if (aqua0Payload.length == 0 || ranges.length == 0) return;

        (bytes32 swapId, PoolId authPoolId) = sharedPool.verifyJIT(
            aqua0Payload,
            ranges
        );
        require(PoolId.unwrap(authPoolId) == PoolId.unwrap(key.toId()), "Aqua0: Pool ID mismatch");

        activeSwapId = swapId;

        PoolId poolId = key.toId();
        uint256 rangeCount = ranges.length;

        bytes32 ptrRangeCount = keccak256(abi.encode(poolId, "rangeCount"));
        assembly {
            tstore(ptrRangeCount, rangeCount)
        }

        for (uint256 i = 0; i < rangeCount; i++) {
            SharedLiquidityPool.V4Range memory r = ranges[i];

            poolManager.modifyLiquidity(
                key,
                ModifyLiquidityParams({
                    tickLower: r.tickLower,
                    tickUpper: r.tickUpper,
                    liquidityDelta: int256(uint256(r.liquidity)),
                    salt: bytes32(0)
                }),
                ""
            );

            bytes32 ptrLower = keccak256(abi.encode(poolId, "tickLower", i));
            bytes32 ptrUpper = keccak256(abi.encode(poolId, "tickUpper", i));
            bytes32 ptrLiq = keccak256(abi.encode(poolId, "liquidity", i));

            int256 tickLowerInt = int256(r.tickLower);
            int256 tickUpperInt = int256(r.tickUpper);
            uint256 liquidityUint = uint256(r.liquidity);

            assembly {
                tstore(ptrLower, tickLowerInt)
                tstore(ptrUpper, tickUpperInt)
                tstore(ptrLiq, liquidityUint)
            }
        }
    }

    /// @notice Remove the injected JIT liquidity.
    ///         Call this early inside `afterSwap` of your custom hook.
    /// @param key The pool key for the current swap
    /// @return hasJIT True if virtual liquidity was present and removed
    function _removeVirtualLiquidity(
        PoolKey calldata key
    ) internal returns (bool hasJIT) {
        PoolId poolId = key.toId();

        uint256 rangeCount;
        bytes32 ptrRangeCount = keccak256(abi.encode(poolId, "rangeCount"));
        assembly {
            rangeCount := tload(ptrRangeCount)
        }

        if (rangeCount == 0) return false;

        for (uint256 i = 0; i < rangeCount; i++) {
            bytes32 ptrLower = keccak256(abi.encode(poolId, "tickLower", i));
            bytes32 ptrUpper = keccak256(abi.encode(poolId, "tickUpper", i));
            bytes32 ptrLiq = keccak256(abi.encode(poolId, "liquidity", i));

            int256 tickLowerInt;
            int256 tickUpperInt;
            uint256 liquidityUint;

            assembly {
                tickLowerInt := tload(ptrLower)
                tickUpperInt := tload(ptrUpper)
                liquidityUint := tload(ptrLiq)
            }

            poolManager.modifyLiquidity(
                key,
                ModifyLiquidityParams({
                    tickLower: int24(tickLowerInt),
                    tickUpper: int24(tickUpperInt),
                    liquidityDelta: -int256(liquidityUint),
                    salt: bytes32(0)
                }),
                ""
            );
        }

        assembly {
            tstore(ptrRangeCount, 0)
        }
        return true;
    }

    /// @notice Settle the net token deltas with the V4 PoolManager, using the SLP as token source/sink.
    ///         Call this inside `afterSwap` ONLY if `_removeVirtualLiquidity` returned true.
    ///
    ///         Flow per currency:
    ///           hook owes PM (delta > 0) → SLP sends tokens to PM → hook calls sync+settle
    ///           PM owes hook (delta < 0) → hook calls take, directing tokens to SLP
    ///
    /// @param key The pool key for the current swap
    function _settleVirtualLiquidityDeltas(PoolKey calldata key) internal {
        int256 delta0 = int256(
            poolManager.currencyDelta(address(this), key.currency0)
        );
        int256 delta1 = int256(
            poolManager.currencyDelta(address(this), key.currency1)
        );

        if (delta0 != 0) _settleCurrency(key.currency0, delta0);
        if (delta1 != 0) _settleCurrency(key.currency1, delta1);

        if (delta0 != 0 || delta1 != 0) {
            sharedPool.recordSwapSettlement(
                activeSwapId,
                Currency.unwrap(key.currency0), delta0,
                Currency.unwrap(key.currency1), delta1
            );
        }
    }

    /// @dev Settle a single currency's delta with the V4 PoolManager.
    function _settleCurrency(Currency currency, int256 delta) private {
        address token = Currency.unwrap(currency);

        if (delta < 0) {
            // Hook owes PM (delta is negative): SLP sends tokens directly to PM, then we settle
            uint256 amount = uint256(-delta);
            poolManager.sync(currency);
            sharedPool.fundHookSettlement(token, address(poolManager), amount);
            poolManager.settle();
        } else {
            // PM owes Hook (delta is positive): take tokens, send directly to SLP
            uint256 amount = uint256(delta);
            poolManager.take(currency, address(sharedPool), amount);
        }
    }
}
