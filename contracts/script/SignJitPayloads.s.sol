// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Script, console} from "forge-std/Script.sol";
import {SharedLiquidityPool} from "../src/slp/SharedLiquidityPool.sol";
import {SwapSimulatorJIT} from "./DeploySwapSimulatorJIT.s.sol";

// ────────────────────────────────────────────────────────────────────────────
//                          SignJitPayloads
// ────────────────────────────────────────────────────────────────────────────
//
// Off-chain helper: pre-signs JIT payloads using the SLP's backendSigner
// key (= DEPLOYER_PRIVATE_KEY on this deployment) and uploads them to
// SwapSimulatorJIT.payloads via `loadPayloads(...)`.
//
// Replicates SharedLiquidityPool.verifyJIT() byte-for-byte:
//   - EIP-712 domain: ("Aqua0", "1", chainId, SLP address)
//   - Struct hash: JIT_TYPEHASH on (swapId, poolId, nonce, deadline,
//                  keccak256(abi.encode(ranges)))
//   - signature = ECDSA over keccak256("\x19\x01" + domainSep + structHash)
//
// One mismatch in the bytes (struct field order, ranges encoding, ABI
// padding) and the on-chain `ECDSA.recover` will return the wrong
// address, the SLP will revert with "Invalid Signature", and we'll
// spend the rest of the day debugging encoder edge cases. So the
// ranges and the typehashes are all pulled from constants, not
// recomputed.
//
// Usage:
//   PAYLOADS_PER_POOL=20 \
//   SWAP_SIMULATOR_JIT=0x... \
//   forge script script/SignJitPayloads.s.sol:SignJitPayloads \
//     --rpc-url https://api.avax-test.network/ext/bc/C/rpc \
//     --private-key $DEPLOYER_PRIVATE_KEY \
//     --broadcast -vvv
// ────────────────────────────────────────────────────────────────────────────

contract SignJitPayloads is Script {
    uint256 constant FUJI_CHAIN_ID = 43113;

    // Pulled from contracts/deployments/avalanche-fuji.json.
    address constant SLP = 0xd0508EAA61bEd6e31299d56d3cDf4Be8F53863D4;

    // 3 Aqua0 pools — must match the order in SwapSimulatorJIT._pool(0..2):
    // ARST, BRLT, MXNT.
    bytes32 constant POOL_ARST = 0x2ac7b9eba1f29435f01c326ae77e0ae5ad08df54756c83cc8523de5a3f460f34;
    bytes32 constant POOL_BRLT = 0xaaaaacd61b32d5f528b3904d0586727090619e28823090bd64993e46624b8b26;
    bytes32 constant POOL_MXNT = 0x047f5ebafb6764ff2a567a41980c910559bd941c64e4f2f389a7dfa1460f4fbb;

    // EIP-712 constants — DO NOT EDIT, they must match SLP source exactly.
    bytes32 constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    bytes32 constant JIT_TYPEHASH = keccak256(
        "JITPayload(bytes32 swapId,bytes32 poolId,uint256 nonce,uint256 deadline,bytes32 rangesHash)"
    );

    // V4Range — MUST match SwapSimulatorJIT._ranges() byte-for-byte.
    int24 constant RANGE_TICK_LOWER = -887220;
    int24 constant RANGE_TICK_UPPER = 887220;
    uint128 constant RANGE_LIQUIDITY = 1e9;

    function run() external {
        require(block.chainid == FUJI_CHAIN_ID, "must be on Fuji (43113)");

        uint256 signerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address signer = vm.addr(signerKey);
        uint256 perPool = vm.envOr("PAYLOADS_PER_POOL", uint256(20));
        address simulator = vm.envAddress("SWAP_SIMULATOR_JIT");

        console.log("=========================================");
        console.log("Aqua0 - SignJitPayloads");
        console.log("=========================================");
        console.log("Signer (backend):", signer);
        console.log("Per pool        :", perPool);
        console.log("Simulator       :", simulator);
        console.log("");

        // Sanity check: confirm the signer is actually the SLP's backend.
        address onchainSigner = SharedLiquidityPool(payable(SLP)).backendSigner();
        require(onchainSigner == signer, "Signer != SLP.backendSigner");

        // Construct domain separator the same way the SLP does inside
        // its (mutable) `_domainSeparator()`.
        bytes32 domainSep = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256("Aqua0"),
                keccak256("1"),
                FUJI_CHAIN_ID,
                SLP
            )
        );
        console.log("Domain separator:", vm.toString(domainSep));

        // Pre-compute rangesHash from the canonical V4Range struct.
        SharedLiquidityPool.V4Range[] memory ranges = _ranges();
        bytes32 rangesHash = keccak256(abi.encode(ranges));
        console.log("Ranges hash     :", vm.toString(rangesHash));
        console.log("");

        // Generate `3 * perPool` payloads in round-robin order:
        // (ARST_0, BRLT_0, MXNT_0, ARST_1, BRLT_1, MXNT_1, ...).
        // This matches SwapSimulatorJIT.runBatch's consumption order.
        uint256 total = 3 * perPool;
        bytes[] memory payloadBuffer = new bytes[](total);

        // Nonces must be globally unique against `usedNonces` mapping.
        // Use a base derived from block.timestamp so re-runs don't
        // collide with earlier batches.
        uint256 nonceBase = block.timestamp * 1_000;
        uint256 deadline = block.timestamp + 30 days;

        for (uint256 i = 0; i < perPool; i++) {
            bytes32[3] memory pools = [POOL_ARST, POOL_BRLT, POOL_MXNT];
            for (uint256 p = 0; p < 3; p++) {
                uint256 idx = i * 3 + p;
                uint256 nonce = nonceBase + idx;
                bytes32 swapId = keccak256(abi.encodePacked("aqua0-demo", idx, block.timestamp));

                bytes32 structHash = keccak256(
                    abi.encode(JIT_TYPEHASH, swapId, pools[p], nonce, deadline, rangesHash)
                );
                bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSep, structHash));

                (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, digest);
                bytes memory sig = abi.encodePacked(r, s, v); // 65 bytes

                payloadBuffer[idx] = abi.encode(swapId, pools[p], nonce, deadline, sig);
            }
        }

        // Upload in chunks. Each `payloads.push(bytes)` is a storage
        // write of ~300k gas for our ~250-byte payloads — loading 60 at
        // once blows past Fuji's 15M block gas limit. Chunks of 10 land
        // around 3M gas each, comfortable headroom.
        uint256 CHUNK = 10;
        vm.startBroadcast(signerKey);
        for (uint256 start = 0; start < total; start += CHUNK) {
            uint256 end = start + CHUNK > total ? total : start + CHUNK;
            uint256 size = end - start;
            bytes[] memory chunk = new bytes[](size);
            for (uint256 j = 0; j < size; j++) chunk[j] = payloadBuffer[start + j];
            SwapSimulatorJIT(simulator).loadPayloads(chunk);
            console.log("  loaded chunk", start / CHUNK + 1);
        }
        vm.stopBroadcast();

        console.log("");
        console.log("Loaded %s payloads (%s per Aqua0 pool)", total, perPool);
        console.log("Buffer can serve runBatch(25) up to %s times", perPool / 5);
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
}
