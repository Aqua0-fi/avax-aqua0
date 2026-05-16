// SPDX-License-Identifier: MIT
pragma solidity =0.8.26;

// PoolManager is pinned to solc 0.8.26 while the rest of Aqua0 uses ^0.8.34,
// so DeployFuji.s.sol can't `import` it without breaking the version
// constraint. Instead, the deploy script uses `vm.deployCode("PoolManager.sol")`
// to reach the compiled artifact at runtime.
//
// But `vm.deployCode` only works if forge produced that artifact, which
// only happens if something somewhere imports PoolManager. This file exists
// purely as that "something" — it's compiled on its own 0.8.26 island,
// produces the PoolManager.json artifact, and is otherwise inert.
//
// Don't delete unless you're also rewiring the deploy to import PoolManager
// some other way.

import {PoolManager} from "@uniswap/v4-core/PoolManager.sol";

contract V4CompilationTrigger {
    function _ref() external pure returns (bytes memory) {
        return type(PoolManager).creationCode;
    }
}
