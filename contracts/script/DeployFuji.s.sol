// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Script, console} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
// PoolManager is pinned to solc 0.8.26; this script uses ^0.8.34 to match the
// rest of Aqua0. We deploy PoolManager via vm.deployCode (artifact-based) so
// its source isn't pulled into our compilation unit. The handle is just an
// IPoolManager pointer afterwards.
import {IPoolManager} from "@uniswap/v4-core/interfaces/IPoolManager.sol";
import {IHooks} from "@uniswap/v4-core/interfaces/IHooks.sol";
import {PoolKey} from "@uniswap/v4-core/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/types/Currency.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/types/PoolId.sol";
import {ModifyLiquidityParams} from "@uniswap/v4-core/types/PoolOperation.sol";
import {IUnlockCallback} from "@uniswap/v4-core/interfaces/callback/IUnlockCallback.sol";
import {BalanceDelta} from "@uniswap/v4-core/types/BalanceDelta.sol";
import {Hooks} from "@uniswap/v4-core/libraries/Hooks.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import {SharedLiquidityPool} from "../src/slp/SharedLiquidityPool.sol";
import {Aqua0Hook} from "../src/slp/Aqua0Hook.sol";
import {MockERC20} from "../test/mocks/MockERC20.sol";
import {HookMiner} from "./HookMiner.sol";

// ────────────────────────────────────────────────────────────────────────────
// Helpers (copies of DeployTestnetFresh's helpers — V4 has no canonical Test
// router yet for liquidity ops, so we ship a minimal IUnlockCallback ourselves)
// ────────────────────────────────────────────────────────────────────────────

contract FujiLiquidityRouter is IUnlockCallback {
    IPoolManager public immutable manager;
    constructor(IPoolManager _manager) { manager = _manager; }
    struct CallbackData { address sender; PoolKey key; ModifyLiquidityParams params; }

    function modifyLiquidity(PoolKey memory key, ModifyLiquidityParams memory params)
        external payable returns (BalanceDelta delta)
    {
        delta = abi.decode(
            manager.unlock(abi.encode(CallbackData(msg.sender, key, params))),
            (BalanceDelta)
        );
    }

    function unlockCallback(bytes calldata rawData) external returns (bytes memory) {
        require(msg.sender == address(manager), "only manager");
        CallbackData memory data = abi.decode(rawData, (CallbackData));
        (BalanceDelta delta, ) = manager.modifyLiquidity(data.key, data.params, new bytes(0));
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

contract FujiHookFactory {
    function deploy(bytes32 salt, bytes memory initCode) external returns (address addr) {
        assembly { addr := create2(0, add(initCode, 0x20), mload(initCode), salt) }
        require(addr != address(0), "CREATE2 failed");
    }
}

// ────────────────────────────────────────────────────────────────────────────
//                             DeployFuji
// ────────────────────────────────────────────────────────────────────────────
//
// All-in-one fresh deployment to Avalanche Fuji (43113).
//
// Unlike Base/Unichain Sepolia, Uniswap did NOT deploy v4-core on Fuji, so this
// script deploys PoolManager itself before everything else. The deployer also
// becomes the SLP owner + backend signer for demo purposes — for production
// the backend signer should be set separately via setBackendSigner.
//
// Tokens are 4 LATAM-themed mocks at 6 decimals each, matching the symbols of
// real-world Ripio stablecoins (wARS/wBRL/wMXN) and USDC. All 3 pools are 1:1
// for clean demo math; this is not a realistic ARS/USD ratio but it makes the
// swap math trivial to follow in the demo video.
//
// Usage:
//   forge script script/DeployFuji.s.sol:DeployFuji \
//     --rpc-url https://api.avax-test.network/ext/bc/C/rpc \
//     --private-key $DEPLOYER_PRIVATE_KEY \
//     --broadcast \
//     --slow \
//     -vvv
//
// The `--slow` flag is recommended because Fuji's default block time is ~2s
// and the deploy chains ~25 txs. Without it forge can race ahead of the chain.
//
// Outputs deployments/avalanche-fuji.json with all addresses + pool IDs, which
// the backend (addresses.ts, v4-pool.service KNOWN_POOLS) and frontend
// (lib/contracts.ts) consume.

contract DeployFuji is Script {
    using PoolIdLibrary for PoolKey;

    uint256 constant FUJI_CHAIN_ID = 43113;
    uint160 constant HOOK_FLAGS = uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG);

    // 1:1 sqrt price in X96 fixed-point. Both tokens at 6 decimals so the
    // human-readable rate is exactly 1.0.
    uint160 constant SQRT_PRICE_1_1 = 79228162514264337593543950336;

    // Pool config — V4 standard fee 0.30% and tick spacing 60.
    uint24 constant POOL_FEE = 3000;
    int24 constant TICK_SPACING = 60;
    int24 constant TICK_LOWER_FULL_RANGE = -887220; // floor(MIN_TICK / 60) * 60
    int24 constant TICK_UPPER_FULL_RANGE = 887220;

    // Liquidity to seed each pool. With 1:1 price and a full-range position,
    // L = sqrt(x * y). Targeting ~100k of each token per pool: sqrt(1e11 * 1e11) = 1e11.
    int256 constant SEED_LIQUIDITY = int256(1e11);

    // Mint amounts to deployer (to fund pool seeds + post-deploy testing).
    uint256 constant DEPLOYER_MINT_USDC  = 10_000_000 * 1e6; // 10M
    uint256 constant DEPLOYER_MINT_WARS  = 10_000_000 * 1e6;
    uint256 constant DEPLOYER_MINT_WBRL  = 10_000_000 * 1e6;
    uint256 constant DEPLOYER_MINT_WMXN  = 10_000_000 * 1e6;

    // Initial deployer deposit into SLP — so the demo dashboard renders
    // non-empty state on first connect, and so a JIT preference set against
    // these tokens immediately has backing capital.
    uint256 constant DEPOSITOR_SEED      = 100_000 * 1e6;    // 100k each

    // Runtime state — populated as the deploy chain progresses.
    IPoolManager poolManager;
    address slpProxy;
    address slpImpl;
    address hookAddr;
    address routerAddr;
    address factoryAddr;
    address usdc; address wars; address wbrl; address wmxn;
    bytes32 poolWarsUsdc;
    bytes32 poolWbrlUsdc;
    bytes32 poolWmxnUsdc;
    bytes32 poolWarsUsdcVanilla;

    function run() external {
        require(block.chainid == FUJI_CHAIN_ID, "DeployFuji: must be on Avalanche Fuji (43113)");

        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("=========================================");
        console.log("Aqua0 - Avalanche Fuji Deployment");
        console.log("=========================================");
        console.log("Deployer:", deployer);
        console.log("Balance: ", deployer.balance, "wei AVAX");
        console.log("");

        vm.startBroadcast(deployerKey);

        _deployV4Core(deployer);
        _deployTokens(deployer);
        _deploySLP(deployer);
        _deployHook();
        _deployRouter();
        _approveAll();
        _initPools();
        _seedSLP(deployer);

        vm.stopBroadcast();

        _writeDeploymentJson(deployer);

        console.log("");
        console.log("Deployment complete. Hand off to backend + frontend:");
        console.log("- backend: packages/shared/src/addresses.ts");
        console.log("- backend: packages/api/src/services/v4-pool.service.ts (KNOWN_POOLS)");
        console.log("- web-app: lib/contracts.ts (SLP_ADDRESSES, etc.)");
    }

    // ───────────────────────── 1. v4-core ─────────────────────────

    function _deployV4Core(address deployer) internal {
        // vm.deployCode compiles + deploys PoolManager from its artifact path,
        // sidestepping the 0.8.26 ↔ 0.8.34 pragma conflict that would arise
        // from `new PoolManager(...)` in this script.
        address pm = deployCode("PoolManager.sol:PoolManager", abi.encode(deployer));
        poolManager = IPoolManager(pm);
        console.log("[1/8] PoolManager:    ", pm);
    }

    // ───────────────────────── 2. Mock tokens ─────────────────────

    function _deployTokens(address deployer) internal {
        // All mocks at 6 decimals — matches Ripio's real wARS/wBRL/wMXN format.
        usdc = address(new MockERC20("Mock USD Coin",           "USDC", 6));
        wars = address(new MockERC20("Mock Ripio Argentine Peso", "wARS", 6));
        wbrl = address(new MockERC20("Mock Ripio Brazilian Real", "wBRL", 6));
        wmxn = address(new MockERC20("Mock Ripio Mexican Peso",   "wMXN", 6));

        MockERC20(usdc).mint(deployer, DEPLOYER_MINT_USDC);
        MockERC20(wars).mint(deployer, DEPLOYER_MINT_WARS);
        MockERC20(wbrl).mint(deployer, DEPLOYER_MINT_WBRL);
        MockERC20(wmxn).mint(deployer, DEPLOYER_MINT_WMXN);

        console.log("[2/8] USDC:           ", usdc);
        console.log("      wARS:           ", wars);
        console.log("      wBRL:           ", wbrl);
        console.log("      wMXN:           ", wmxn);
    }

    // ───────────────────────── 3. SLP ─────────────────────────────

    function _deploySLP(address deployer) internal {
        SharedLiquidityPool impl = new SharedLiquidityPool();
        slpImpl = address(impl);

        // owner = deployer, backendSigner = deployer (rotate post-deploy via
        // setBackendSigner once the backend's signer key is provisioned).
        ERC1967Proxy proxy = new ERC1967Proxy(
            slpImpl,
            abi.encodeCall(SharedLiquidityPool.initialize, (deployer, deployer))
        );
        slpProxy = address(proxy);

        console.log("[3/8] SLP impl:       ", slpImpl);
        console.log("      SLP proxy:      ", slpProxy);
    }

    // ───────────────────────── 4. Hook (CREATE2) ──────────────────

    function _deployHook() internal {
        FujiHookFactory factory = new FujiHookFactory();
        factoryAddr = address(factory);

        bytes memory initCode = abi.encodePacked(
            type(Aqua0Hook).creationCode,
            abi.encode(IPoolManager(address(poolManager)), SharedLiquidityPool(payable(slpProxy)))
        );

        (bytes32 salt, address expected) = HookMiner.find(
            factoryAddr,
            HOOK_FLAGS,
            keccak256(initCode),
            0
        );

        hookAddr = factory.deploy(salt, initCode);
        require(hookAddr == expected, "DeployFuji: hook addr mismatch");

        console.log("[4/8] HookFactory:    ", factoryAddr);
        console.log("      Aqua0Hook:      ", hookAddr);
        console.log("      Hook salt:      ", uint256(salt));
    }

    // ───────────────────────── 5. Liquidity router ────────────────

    function _deployRouter() internal {
        FujiLiquidityRouter router = new FujiLiquidityRouter(IPoolManager(address(poolManager)));
        routerAddr = address(router);
        console.log("[5/8] LiquidityRouter:", routerAddr);
    }

    // ───────────────────────── 6. Approvals ───────────────────────

    function _approveAll() internal {
        address[4] memory tokens = [usdc, wars, wbrl, wmxn];
        for (uint256 i = 0; i < tokens.length; i++) {
            MockERC20(tokens[i]).approve(routerAddr, type(uint256).max);
            MockERC20(tokens[i]).approve(slpProxy,   type(uint256).max);
        }
        console.log("[6/8] Approvals:       all 4 tokens to router + SLP");
    }

    // ───────────────────────── 7. Init pools + seed ───────────────

    function _initPools() internal {
        // 3 Aqua0-enabled pools — every swap calls Aqua0Hook, which pulls
        // SLP liquidity transient-style for the swap window.
        poolWarsUsdc = _initPool(wars, usdc, IHooks(hookAddr), "wARS/USDC (aqua0)");
        poolWbrlUsdc = _initPool(wbrl, usdc, IHooks(hookAddr), "wBRL/USDC (aqua0)");
        poolWmxnUsdc = _initPool(wmxn, usdc, IHooks(hookAddr), "wMXN/USDC (aqua0)");

        // 1 vanilla V4 pool — no hook. Used in the demo dashboard to show the
        // baseline: a traditional LP commits capital to one pair and earns
        // only that pair's fees, while the same capital deposited in the SLP
        // backs the 3 aqua0-enabled pools simultaneously.
        poolWarsUsdcVanilla = _initPool(wars, usdc, IHooks(address(0)), "wARS/USDC (vanilla)");

        console.log("[7/8] Pools initialized:  3 aqua0 + 1 vanilla baseline");
    }

    function _initPool(address tokenA, address tokenB, IHooks hook, string memory label)
        internal returns (bytes32 pid)
    {
        (address t0, address t1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        PoolKey memory pk = PoolKey(
            Currency.wrap(t0),
            Currency.wrap(t1),
            POOL_FEE,
            TICK_SPACING,
            hook
        );

        poolManager.initialize(pk, SQRT_PRICE_1_1);

        FujiLiquidityRouter(routerAddr).modifyLiquidity(
            pk,
            ModifyLiquidityParams({
                tickLower: TICK_LOWER_FULL_RANGE,
                tickUpper: TICK_UPPER_FULL_RANGE,
                liquidityDelta: SEED_LIQUIDITY,
                salt: 0
            })
        );

        pid = PoolId.unwrap(pk.toId());
        console.log(string.concat("      Pool ", label, ":"), vm.toString(pid));
    }

    // ───────────────────────── 8. Seed SLP ────────────────────────

    function _seedSLP(address deployer) internal {
        SharedLiquidityPool slp = SharedLiquidityPool(payable(slpProxy));
        // One 100k deposit per token. Same capital that just seeded the V4
        // pools is now also sitting in the SLP — this is the demo's central
        // promise visualised on-chain.
        slp.deposit(usdc, DEPOSITOR_SEED, deployer);
        slp.deposit(wars, DEPOSITOR_SEED, deployer);
        slp.deposit(wbrl, DEPOSITOR_SEED, deployer);
        slp.deposit(wmxn, DEPOSITOR_SEED, deployer);
        console.log("[8/8] SLP seeded:      100k each (USDC, wARS, wBRL, wMXN)");
    }

    // ───────────────────────── JSON output ────────────────────────

    function _writeDeploymentJson(address deployer) internal {
        string memory json = string.concat(
            "{\n",
            '  "chainId": ', vm.toString(block.chainid), ",\n",
            '  "chain": "avalanche-fuji",\n',
            '  "deployBlock": ', vm.toString(block.number), ",\n",
            '  "deployer": "', vm.toString(deployer), '",\n',
            '  "poolManager": "', vm.toString(address(poolManager)), '",\n',
            '  "slp": "', vm.toString(slpProxy), '",\n',
            '  "slpImpl": "', vm.toString(slpImpl), '",\n',
            '  "aqua0Hook": "', vm.toString(hookAddr), '",\n',
            '  "hookFactory": "', vm.toString(factoryAddr), '",\n',
            '  "liquidityRouter": "', vm.toString(routerAddr), '",\n',
            '  "backendSigner": "', vm.toString(deployer), '",\n'
        );
        json = string.concat(
            json,
            '  "tokens": {\n',
            '    "usdc": "', vm.toString(usdc), '",\n',
            '    "wars": "', vm.toString(wars), '",\n',
            '    "wbrl": "', vm.toString(wbrl), '",\n',
            '    "wmxn": "', vm.toString(wmxn), '"\n',
            "  },\n",
            '  "pools": {\n',
            '    "wars_usdc_aqua0": "', vm.toString(poolWarsUsdc), '",\n',
            '    "wbrl_usdc_aqua0": "', vm.toString(poolWbrlUsdc), '",\n',
            '    "wmxn_usdc_aqua0": "', vm.toString(poolWmxnUsdc), '",\n',
            '    "wars_usdc_vanilla": "', vm.toString(poolWarsUsdcVanilla), '"\n',
            "  }\n",
            "}"
        );

        vm.writeFile("deployments/avalanche-fuji.json", json);
        console.log("");
        console.log("Wrote deployments/avalanche-fuji.json");
    }
}
