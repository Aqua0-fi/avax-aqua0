// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

/// @title Errors
/// @author Aqua0 Team
/// @notice Custom error definitions for Aqua0 protocol
library Errors {
    // ============================================
    // GENERAL ERRORS
    // ============================================

    /// @notice Thrown when address is zero
    error ZeroAddress();

    /// @notice Thrown when amount is zero
    error ZeroAmount();

    /// @notice Thrown when input is invalid
    error InvalidInput();

    /// @notice Thrown when caller is not the owner
    error NotOwner();

    /// @notice Thrown when caller is not authorized
    error NotAuthorized();

    /// @notice Thrown when caller is not the rebalancer
    error NotRebalancer();

    // ============================================
    // ACCOUNT ERRORS
    // ============================================

    /// @notice Thrown when account already exists
    error AccountAlreadyExists();

    /// @notice Thrown when account is not found
    error AccountNotFound();

    /// @notice Thrown when transfer fails
    error TransferFailed();

    /// @notice Thrown when balance is insufficient
    error InsufficientBalance();

    // ============================================
    // STRATEGY ERRORS
    // ============================================

    /// @notice Thrown when strategy bytes are invalid
    error InvalidStrategyBytes();

    /// @notice Thrown when strategy is invalid or not found
    error InvalidStrategy();

    /// @notice Thrown when dock() is called but no tokens were stored for the strategy
    error StrategyTokensNotFound();

    // ============================================
    // REBALANCE ERRORS
    // ============================================

    /// @notice Thrown when rebalance operation is not found
    error RebalanceOperationNotFound();

    // ============================================
    // BRIDGE ERRORS
    // ============================================

    /// @notice Thrown when no peer is set for destination
    error NoPeerSet();

    /// @notice Thrown when bridge fee is insufficient
    error InsufficientBridgeFee();

    /// @notice Thrown when a signature is invalid
    error InvalidSignature();

    // ============================================
    // BRIDGE REGISTRY ERRORS
    // ============================================

    /// @notice Thrown when no adapter is registered for the given key
    error AdapterNotRegistered();

    /// @notice Thrown when trying to add a composer that is already trusted
    error ComposerAlreadyTrusted();

    /// @notice Thrown when trying to remove a composer that is not trusted
    error ComposerNotTrusted();

    // ============================================
    // CCTP ERRORS
    // ============================================

    /// @notice Thrown when the CCTP relay (receiveMessage) fails
    error CCTPRelayFailed();

    /// @notice Thrown when the CCTP burn (depositForBurnWithHook) fails
    error CCTPBurnFailed();

    /// @notice Thrown when composePayload does not match hookData in the CCTP message
    error HookDataMismatch();

    /// @notice Thrown when the CCTP message is too short to contain hookData
    error CCTPMessageTooShort();

    // ============================================
    // POOL REGISTRY ERRORS
    // ============================================

    /// @notice Thrown when no pool is registered for the given token or Stargate pool
    error PoolNotRegistered();

    /// @notice Thrown when attempting to register a pool that is already registered
    error PoolAlreadyRegistered();

    // ============ SLP Errors ============

    /// @notice Thrown when SLP balance is insufficient for operation
    error InsufficientPoolBalance();

    /// @notice Thrown when attempting to deposit zero amount
    error DepositAmountZero();

    /// @notice Thrown when withdrawal exceeds free (unlocked) balance
    error WithdrawalExceedsFreeBalance();

    /// @notice Thrown when SLP is paused
    error PoolPaused();

    // ============ Intent Errors ============

    /// @notice Thrown when intent has expired past deadline
    error IntentExpired();

    /// @notice Thrown when intent has already been filled
    error IntentAlreadyFilled();

    /// @notice Thrown when intent signature is invalid
    error InvalidIntentSignature();

    /// @notice Thrown when LP backing is insufficient for intent
    error InsufficientLPBacking();

    /// @notice Thrown when intent is not in expected status
    error IntentNotOpen();

    /// @notice Thrown when intent is not found
    error IntentNotFound();

    /// @notice Thrown when swap has already been filled completely
    error SwapAlreadyFilled();

    /// @notice Thrown when nonce has already been used
    error NonceMismatch();

    // ============ Filler Errors ============

    /// @notice Thrown when filler is not registered in FillerRegistry
    error FillerNotRegistered();

    /// @notice Thrown when filler is not authorized by LP for this strategy
    error FillerNotAuthorized();

    /// @notice Thrown when filler stake is below minimum requirement
    error InsufficientCollateral();

    /// @notice Thrown when filler has active fills and cannot deregister
    error FillerHasActiveFills();

    // ============ Escrow Errors ============

    /// @notice Thrown when escrow not found for swap ID
    error EscrowNotFound();

    /// @notice Thrown when escrow already exists for this filler and swap ID
    error EscrowAlreadyExists();

    /// @notice Thrown when escrow timeout has not been reached for reclaim
    error EscrowNotExpired();

    /// @notice Thrown when escrow has already been released or reclaimed
    error EscrowAlreadyResolved();

    /// @notice Thrown when partial fill exceeds required amount
    error PartialFillExceedsRequired();

    // ============ Source Lock Errors ============

    /// @notice Thrown when source lock not found for swap ID
    error LockNotFound();

    /// @notice Thrown when source lock is not in active state
    error LockNotActive();

    /// @notice Thrown when source lock timeout has not been reached for expiry
    error LockNotExpired();

    /// @notice Thrown when source lock already exists for swap ID
    error LockAlreadyExists();

    // ============ Settlement Errors ============

    /// @notice Thrown when settlement proof is invalid
    error InvalidSettlementProof();

    /// @notice Thrown when swap has already been settled
    error SettlementAlreadyProcessed();

    /// @notice Thrown when settlement path is invalid for the given swap
    error InvalidSettlementPath();

    /// @notice Thrown when fill deadline has been exceeded
    error FillDeadlineExceeded();

    /// @notice Thrown when swap has not been fully filled yet
    error SwapNotFullyFilled();

    /// @notice Thrown when fill deadline has not been reached yet
    error FillDeadlineNotReached();

    /// @notice Thrown when a function is not yet implemented
    error NotImplemented();

    /// @notice Thrown when deregistration delay has not been met
    error DeregistrationDelayNotMet();

    /// @notice Thrown when no deregistration has been requested
    error DeregistrationNotRequested();

    /// @notice Thrown when there are no pending withdrawals to claim
    error NoPendingWithdrawal();

    /// @notice Thrown when settlement is not in pending bridge state
    error SettlementNotPendingBridge();

    /// @notice Thrown when origin data does not match the canonical intent data
    error OriginDataMismatch();

    /// @notice Thrown when reclaim is attempted after settlement has been initiated
    error SettlementAlreadyInitiated();

    /// @notice Thrown when too many fillers attempt to fill a single swap
    error TooManyFillers();

    /// @notice Thrown when there is no pending collateral to claim
    error NoPendingCollateral();
}
