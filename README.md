# Aqua0 — Avalanche Edition

> **Cross-margin prime brokerage for DeFi, purpose-built for LATAM stablecoin liquidity.**
> One deposit. Multiple pools. 3× the fees from the same capital.

Aqua0 lets one LP deposit serve **multiple Uniswap V4 pools simultaneously**. Same capital, multiple markets, no fragmentation. This repo is the standalone single-chain deployment on **Avalanche Fuji**, built for the Avalanche Institutional DeFi hackathon.

---

## Why Avalanche × Aqua0

Ripio is launching local stablecoins (`wARS`, `wBRL`, `wMXN`) and Twin (ex-Num Finance) is building the LATAM RWA infrastructure on Avalanche. Both face the same problem: **regional stablecoin pools have $50–200k TVL.** Slippage on $5k trades is 2–3%. LPs don't deploy because the economics of any single pair don't work.

Aqua0 fixes this by letting one $10k deposit back wARS/USDC + wBRL/USDC + wMXN/USDC at the same time. Same capital, same market risk (all stables vs USDC), 3× the fees. The LP economics now make sense.

This is the foundation for an institutional LATAM stablecoin liquidity layer.

---

## What's deployed

- **PoolManager** (Uniswap v4-core) — Uniswap hasn't published v4 on Fuji yet, so we ship it ourselves. Same battle-tested contract, deployed by us.
- **SharedLiquidityPool** (SLP) — the "dumb vault" where LPs deposit. Tracks balances, verifies JIT auths, settles deltas back from the hook.
- **Aqua0Hook** — V4 hook that intercepts `beforeSwap`/`afterSwap` to pull liquidity transient-style from the SLP into the pool at swap time, then settles back with fees.
- **3 mock LATAM stablecoins**: wARS, wBRL, wMXN (6 decimals each, matching Ripio's real format).
- **3 Aqua0-enabled V4 pools**: wARS/USDC, wBRL/USDC, wMXN/USDC — all using `Aqua0Hook`.
- **1 vanilla V4 pool**: wARS/USDC without the hook. Used for the side-by-side comparison in the demo dashboard.

---

## Structure

```
avax-aqua0/
├── contracts/        # Foundry project (SLP + Hook + mocks + deploy script)
├── web-app/          # Next.js demo app (single-chain, no backend)
├── docs/
│   ├── ARCHITECTURE.md
│   └── DEMO.md
└── README.md
```

The architecture is intentionally **trust-minimized**: no backend service. JIT authorizations are signed client-side by the LP's own wallet, so there's no centralised signer to compromise. State is read directly from chain via viem.

---

## Quickstart (contracts)

```bash
cd contracts
git submodule update --init --recursive
forge install        # (no-op if submodules already initialized)
cp .env.example .env
# Edit .env: paste your DEPLOYER_PRIVATE_KEY (get test AVAX from https://faucet.avax.network/)

# Compile
forge build

# Deploy to Avalanche Fuji (all-in-one)
forge script script/DeployFuji.s.sol:DeployFuji \
  --rpc-url avalanche-fuji \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --slow \
  -vvv

# Output: deployments/avalanche-fuji.json with all addresses + pool IDs
```

---

## Quickstart (web-app)

```bash
cd web-app
bun install
cp .env.example .env.local
# Edit .env.local with the addresses from contracts/deployments/avalanche-fuji.json
bun run dev
# http://localhost:3000
```

---

## Demo flow

1. Connect wallet (Avalanche Fuji) — same address you deployed with, so you're the LP.
2. Mint mock tokens from the faucet page.
3. Deposit 10,000 mockUSDC into SLP.
4. Declare your capital as JIT liquidity for the 3 LATAM pools (one transaction, on-chain).
5. Swap from another wallet (or the same one with a different token).
6. See fees accrue across all 3 pools, sourced from the same 10k deposit.
7. Compare against the vanilla pool: same capital, only 1 pool's fees.

---

## Roadmap (post-hackathon)

- Avalanche **mainnet** deploy (v4 already live there at `0x06380c0e0912312b5150364b9dc4542ba0dbbc85`)
- Integration with Ripio's real `wARS`, `wBRL`, `wMXN` deployments
- Avalanche **L1 subnet** (permissioned) for custodial-grade institutional access
- Cross-chain: Avalanche ↔ Base for wARS holders not yet bridged

---

## Built by

[@tomasmazz](https://x.com/tomasmazz) (CEO), [Yudhish](https://linkedin.com/in/yudhishthra/) (CTO), [Rithik](https://x.com/Proof_Of_Mind) (founding engineer).

Aqua0 is an ETHGlobal Buenos Aires winner ([showcase](https://ethglobal.com/showcase/aqua0-u2krx)), 1inch trading API grant recipient, and member of Founders Inc. Canopy batch.

**Looking for**: intros to Ripio and Twin Finance teams for a TVL pilot.
