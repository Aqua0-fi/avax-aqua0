// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {IERC20 as OZERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {PoolId} from "@uniswap/v4-core/types/PoolId.sol";
import {IAqua0BaseHookMarker} from "./IAqua0BaseHookMarker.sol";
import {Errors} from "../lib/Errors.sol";

// forgefmt: disable-start
//
//     ___                        ___
//    /   |  ____ ___  ______ _  / _ \
//   / /| | / __ `/ / / / __ `/ | | | |
//  / ___ |/ /_/ / /_/ / /_/ /  | |_| |
// /_/  |_|\__, /\__,_/\__,_/    \___/
//            /_/
//
// forgefmt: disable-end

/* ==============================================================================
   THE "DUMB VAULT" (CENTRALIZED BACKEND SOURCE OF TRUTH)

   This contract is strictly the "Muscle". All Brain logic lives in the
   off-chain Backend to ensure instant, up-to-date cross-chain accounting.

   - DEPOSITS: Accepts tokens and emits `Deposited`. The Backend indexes this
     and credits the user's off-chain balance.
   - WITHDRAWALS: Completely controlled by the Backend. To withdraw, a user
     requests a signature from the Backend API. The API verifies their off-chain
     balance, signs a `WithdrawPayload`, and the contract executes it.
   - JIT SWAPS: The Backend calculates exactly how much liquidity to provide
     based on aggregate off-chain balances. It signs a `JITPayload` containing
     the exact V4 tick ranges. The Hook executes this blindly.
   - SETTLEMENT: After a swap, the Hook calls `fundHookSettlement` to pull
     tokens for V4 settlement, then `recordSwapSettlement` to emit the event.
     The Backend indexes `SwapSettled` and calculates per-user PnL off-chain.
   ============================================================================== */

contract SharedLiquidityPool is Initializable, Ownable, ReentrancyGuard, UUPSUpgradeable {
    using SafeERC20 for OZERC20;

    // ============ Structs ============

    struct V4Range {
        int24 tickLower;
        int24 tickUpper;
        uint128 liquidity;
    }

    struct JITPayload {
        bytes32 swapId;
        PoolId poolId;
        uint256 nonce;
        uint256 deadline;
        bytes signature;
    }

    struct WithdrawPayload {
        address user;
        address token;
        uint256 amount;
        address destination;
        uint256 nonce;
        uint256 deadline;
        bytes signature;
    }

    struct RepaymentWithdrawPayload {
        address sourceLp;
        address token;
        uint256 amount;
        address destination;
        uint256 targetChainId;
        bytes32 swapId;
        uint256 nonce;
        uint256 deadline;
        bytes signature;
    }

    // ============ Events ============

    event Deposited(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount, address destination);
    event SwapSettled(bytes32 indexed swapId, address indexed token0, int256 delta0, address indexed token1, int256 delta1);

    event JITPositionSet(
        address indexed lp,
        bytes32 indexed poolId,
        uint256 indexed sourceChainId,
        uint256 targetChainId,
        int24 tickLower,
        int24 tickUpper,
        uint256 amount0,
        uint256 amount1,
        address token0,
        address token1
    );

    event JITPositionRemoved(
        address indexed lp,
        bytes32 indexed poolId
    );

    event JITPositionPaused(
        address indexed lp,
        bytes32 indexed poolId,
        bool active
    );

    // ============ State ============

    address public backendSigner;
    address public repaymentWorker;
    bool public paused;
    mapping(uint256 => bool) public usedNonces;

    bytes32 private constant DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 private constant JIT_TYPEHASH = keccak256("JITPayload(bytes32 swapId,bytes32 poolId,uint256 nonce,uint256 deadline,bytes32 rangesHash)");
    bytes32 private constant WITHDRAW_TYPEHASH = keccak256("WithdrawPayload(address user,address token,uint256 amount,address destination,uint256 nonce,uint256 deadline)");
    bytes32 private constant REPAYMENT_WITHDRAW_TYPEHASH = keccak256(
        "RepaymentWithdrawPayload(address sourceLp,address token,uint256 amount,address destination,uint256 targetChainId,bytes32 swapId,uint256 nonce,uint256 deadline)"
    );

    uint256 private _cachedChainId;
    bytes32 private _cachedDomainSeparator;

    // ============ Modifiers ============

    modifier whenNotPaused() {
        require(!paused, "Pool Paused");
        _;
    }

    modifier onlyHook() {
        (bool success, bytes memory data) = msg.sender.staticcall(
            abi.encodeWithSelector(IAqua0BaseHookMarker.isAqua0BaseHook.selector)
        );
        require(success && data.length > 0 && abi.decode(data, (bool)), "Not Aqua0 Hook");
        _;
    }

    // ============ Init ============

    constructor() Ownable(address(1)) {
        _disableInitializers();
    }

    receive() external payable {}

    function initialize(address _owner, address _backendSigner) external initializer {
        require(_owner != address(0) && _backendSigner != address(0), "Zero Address");
        _transferOwnership(_owner);
        backendSigner = _backendSigner;
    }

    // ============ Admin ============

    function setBackendSigner(address _signer) external onlyOwner {
        require(_signer != address(0), "Zero Address");
        backendSigner = _signer;
    }

    function setRepaymentWorker(address _worker) external onlyOwner {
        require(_worker != address(0), "Zero Address");
        repaymentWorker = _worker;
    }

    function pause() external onlyOwner { paused = true; }
    function unpause() external onlyOwner { paused = false; }

    function _domainSeparator() internal returns (bytes32) {
        if (block.chainid != _cachedChainId) {
            _cachedDomainSeparator = keccak256(abi.encode(
                DOMAIN_TYPEHASH, keccak256("Aqua0"), keccak256("1"), block.chainid, address(this)
            ));
            _cachedChainId = block.chainid;
        }
        return _cachedDomainSeparator;
    }

    // ============ Core Vault Functions ============

    function deposit(address token, uint256 amount, address beneficiary) external nonReentrant whenNotPaused {
        require(token != address(0) && beneficiary != address(0), "Zero Address");
        require(amount > 0, "Zero Amount");

        uint256 balBefore = OZERC20(token).balanceOf(address(this));
        OZERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = OZERC20(token).balanceOf(address(this)) - balBefore;

        emit Deposited(beneficiary, token, received);
    }

    function withdraw(WithdrawPayload calldata p) external nonReentrant whenNotPaused {
        require(block.timestamp <= p.deadline, "Expired");
        require(!usedNonces[p.nonce], "Nonce Used");
        require(msg.sender == p.user, "Only user can broadcast");

        bytes32 structHash = keccak256(abi.encode(WITHDRAW_TYPEHASH, p.user, p.token, p.amount, p.destination, p.nonce, p.deadline));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _domainSeparator(), structHash));
        require(ECDSA.recover(digest, p.signature) == backendSigner, "Invalid Signature");

        usedNonces[p.nonce] = true;

        if (p.token == address(0)) {
            (bool success, ) = p.destination.call{value: p.amount}("");
            require(success, "ETH Transfer Failed");
        } else {
            OZERC20(p.token).safeTransfer(p.destination, p.amount);
        }

        emit Withdrawn(p.user, p.token, p.amount, p.destination);
    }

    function withdrawForRepayment(RepaymentWithdrawPayload calldata p) external nonReentrant whenNotPaused {
        require(repaymentWorker != address(0), "Repayment Worker Not Set");
        require(msg.sender == repaymentWorker, "Only repayment worker");
        require(block.timestamp <= p.deadline, "Expired");
        require(!usedNonces[p.nonce], "Nonce Used");

        bytes32 structHash = keccak256(
            abi.encode(
                REPAYMENT_WITHDRAW_TYPEHASH,
                p.sourceLp,
                p.token,
                p.amount,
                p.destination,
                p.targetChainId,
                p.swapId,
                p.nonce,
                p.deadline
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _domainSeparator(), structHash));
        require(ECDSA.recover(digest, p.signature) == backendSigner, "Invalid Signature");

        usedNonces[p.nonce] = true;

        if (p.token == address(0)) {
            (bool success, ) = p.destination.call{value: p.amount}("");
            require(success, "ETH Transfer Failed");
        } else {
            OZERC20(p.token).safeTransfer(p.destination, p.amount);
        }

        emit Withdrawn(p.sourceLp, p.token, p.amount, p.destination);
    }

    // ============ JIT Verification ============

    /// @notice Called by the Hook in `beforeSwap` to verify the backend's JIT authorization.
    ///         The ranges are passed separately and hashed on-the-fly for signature verification.
    ///         This ensures the ranges injected into V4 are exactly the ones the backend signed.
    /// @param encodedPayload ABI-encoded JITPayload (swapId, poolId, nonce, deadline, signature)
    /// @param ranges The V4 tick ranges the backend authorized for injection
    /// @return swapId Unique swap identifier for settlement tracking
    /// @return poolId The authorized pool — hook MUST check this matches the actual pool
    function verifyJIT(
        bytes calldata encodedPayload,
        V4Range[] calldata ranges
    ) external onlyHook returns (bytes32 swapId, PoolId poolId) {
        (bytes32 _swapId, bytes32 _poolId, uint256 _nonce, uint256 _deadline, bytes memory _sig) =
            abi.decode(encodedPayload, (bytes32, bytes32, uint256, uint256, bytes));

        require(block.timestamp <= _deadline, "Expired");
        require(!usedNonces[_nonce], "Nonce Used");

        bytes32 rangesHash = keccak256(abi.encode(ranges));
        bytes32 structHash = keccak256(abi.encode(
            JIT_TYPEHASH, _swapId, _poolId, _nonce, _deadline, rangesHash
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _domainSeparator(), structHash));

        require(ECDSA.recover(digest, _sig) == backendSigner, "Invalid Signature");

        usedNonces[_nonce] = true;
        return (_swapId, PoolId.wrap(_poolId));
    }

    // ============ Settlement (Hook → V4 PoolManager) ============

    /// @notice Hook calls this to have SLP send tokens to the V4 PoolManager for settlement.
    ///         When the hook owes the PM after JIT add/remove, the SLP provides the tokens.
    /// @param token ERC20 token address (WETH-only policy — no native ETH)
    /// @param to Recipient (typically the PoolManager address)
    /// @param amount Amount to transfer
    function fundHookSettlement(address token, address to, uint256 amount) external onlyHook {
        require(amount > 0 && token != address(0), "Invalid");
        OZERC20(token).safeTransfer(to, amount);
    }

    /// @notice Hook calls this after V4 settlement to emit the event the backend indexes for PnL.
    ///         The backend uses swapId to correlate this with the original JIT authorization.
    function recordSwapSettlement(
        bytes32 swapId,
        address token0, int256 delta0,
        address token1, int256 delta1
    ) external onlyHook {
        emit SwapSettled(swapId, token0, delta0, token1, delta1);
    }

    // ============ JIT Position Declarations (event-only, no storage) ============

    function setJITPosition(
        bytes32 poolId,
        uint256 targetChainId,
        int24 tickLower,
        int24 tickUpper,
        uint256 amount0,
        uint256 amount1,
        address token0,
        address token1
    ) external whenNotPaused {
        require(tickLower < tickUpper, "Invalid tick range");
        require(amount0 > 0 || amount1 > 0, "Zero amounts");
        require(token0 != address(0) && token1 != address(0), "Zero token");

        emit JITPositionSet(
            msg.sender,
            poolId,
            block.chainid,
            targetChainId,
            tickLower,
            tickUpper,
            amount0,
            amount1,
            token0,
            token1
        );
    }

    function removeJITPosition(bytes32 poolId) external {
        emit JITPositionRemoved(msg.sender, poolId);
    }

    function pauseJITPosition(bytes32 poolId, bool active) external {
        emit JITPositionPaused(msg.sender, poolId, active);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
