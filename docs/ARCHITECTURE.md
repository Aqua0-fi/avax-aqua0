# Architecture

> **TL;DR** — One SLP vault. One V4 hook. Three LATAM-stable pools + one vanilla pool for comparison. No backend. The same `$10k` deposit serves three markets at once.

---

## System map

```
┌────────────────────────────────────────────────────────────────────────┐
│  WEB-APP  (Next.js 15, single-chain Fuji)                              │
│  - wagmi injected connector (Core Wallet / MetaMask)                   │
│  - reads SLP state + token balances directly via viem                  │
│  - writes: mint → approve → deposit → setJITPosition → swap            │
└────────────────────────┬───────────────────────────────────────────────┘
                         │  user signs every action with their own wallet
                         ▼
┌────────────────────────────────────────────────────────────────────────┐
│  AVALANCHE FUJI (chain id 43113)                                       │
│                                                                        │
│   ┌──────────────────────────────────────────────────────────────┐    │
│   │  Uniswap v4-core PoolManager (deployed by us — Uniswap       │    │
│   │  hasn't published v4 on Fuji yet)                            │    │
│   └──────────────────────────────────────────────────────────────┘    │
│                                                                        │
│   ┌────────────────────────┐    ┌────────────────────────────────┐    │
│   │  SharedLiquidityPool   │◄───┤  Aqua0Hook (V4 hook)           │    │
│   │  (UUPS proxy, 347 LOC) │    │  - beforeSwap: pulls liquidity │    │
│   │  - deposit / withdraw  │    │    transient from SLP          │    │
│   │  - setJITPosition      │    │  - afterSwap: settles deltas   │    │
│   │  - verifyJIT (EIP-712) │    │    back, including fees        │    │
│   └────────────────────────┘    └────────────────────────────────┘    │
│                  │                              │                      │
│                  └──────────────┬───────────────┘                      │
│                                 ▼                                      │
│   ┌──────────────────────────────────────────────────────────────┐    │
│   │  V4 Pools (3 aqua0-enabled + 1 vanilla baseline)             │    │
│   │  ─ wARS / USDC  (hook attached, capital from SLP)            │    │
│   │  ─ wBRL / USDC  (hook attached, capital from SLP)            │    │
│   │  ─ wMXN / USDC  (hook attached, capital from SLP)            │    │
│   │  ─ wARS / USDC  (no hook — traditional LP baseline)          │    │
│   └──────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Why no backend

The production Aqua0 architecture runs a backend service that signs JIT authorisations (EIP-712 `JITPayload`) so the V4 hook can verify, in `beforeSwap`, that the LP authorised pulling capital from the SLP for that exact swap.

For the hackathon single-chain edition we collapsed this: **the deployer is the LP is the backend signer**. When the user connects with the deployer wallet, their browser signs JIT payloads in real time. No off-chain service. No centralised trust assumption to defend in a pitch deck slide.

This is not just a simplification — it's a step toward what an institutional client actually wants: *"no third-party signer touches our liquidity."*

---

## Why the comparison pool

The pitch is *"3× fees from the same capital"*. Without something to compare against, that's a number on a slide. With the vanilla wARS/USDC pool sitting next to the Aqua0 wARS/USDC pool **on the same chain, with the same tokens, initialised from the same deploy**, the comparison is operationally honest — a judge can put $1k of LP in each and watch what happens.

The dashboard's split-screen renders both side-by-side. Same capital, two outcomes.

---

## The "matryoshka" hook payload (for reference)

When a swap routes through an aqua0-enabled pool, the `hookData` passed to `PoolManager.swap` follows this structure:

```solidity
hookData = abi.encode(
    AQUA0_MAGIC,         // bytes32 sentinel — if absent, hook no-ops
    JITPayload,          // EIP-712 signed by backend / LP
    V4Range[],           // tick ranges + amounts to inject for this swap
    devCustomData        // bytes — opaque, optional
)
```

If `AQUA0_MAGIC` isn't present the hook reverts gracefully to a no-op, so the *same hook contract* can be safely shared between pools that want JIT-from-SLP and pools that don't.

---

## What's intentionally out of scope (vs. production Aqua0)

- **Cross-chain anything.** No LayerZero OFT, no Stargate, no CCTP, no repayment worker. Single-chain demo only.
- **Filler routing.** Every swap pulls from the LP that set the JIT preference directly. No off-chain auction.
- **Ponder indexer.** State is read on-demand from chain via viem RPC reads. No event-replay service.
- **SwapVM strategies.** Out-of-tree dependency on 1inch's `swapVMRouter`, not deployed on Fuji.
- **Withdraw locked.** Demo only exercises deposit + JIT preference + swap — backend-signed withdraw stays in the production roadmap.

What's here is the **load-bearing core**: SLP + Hook + V4 pools. That's enough to demonstrate the central thesis: *same deposit, multiple markets*.
