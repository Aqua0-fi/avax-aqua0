# Demo Walkthrough

This is the script for the 2-minute video demo and the live walkthrough during the pitch. Every step is reproducible from a clean wallet on Avalanche Fuji.

---

## Pre-flight (one-time, before recording)

1. **Wallet ready.** Use Core Wallet (recommended) or MetaMask switched to Avalanche Fuji (chain id 43113).
2. **AVAX in wallet.** Drip 2 AVAX from [https://faucet.avax.network](https://faucet.avax.network). One drip is enough for ~50 demo transactions.
3. **Contracts deployed.** Run `forge script script/DeployFuji.s.sol --broadcast` from `contracts/` (see [`README.md`](../README.md)).
4. **Addresses wired.** Paste `deployments/avalanche-fuji.json` values into `web-app/lib/contracts.ts`.
5. **App running.** `bun run dev` inside `web-app/`, navigate to `http://localhost:3000`.

---

## Live demo (≈ 2 minutes on camera)

### 0:00 — Open the page, walk the hero

> *"Aqua0 is cross-margin prime brokerage for DeFi. One deposit, every market. Today we're demoing on Avalanche Fuji."*

Point at the **Live · Avalanche Fuji** pill. Then read the headline: *"One deposit. Every LATAM market."*

### 0:20 — The comparison

Scroll just enough to show both cards.

> *"On the left: a traditional LP. They commit $10k to one pool — wARS/USDC. They earn $87 a month in fees, only from that pair."*
>
> *"On the right: the same LP deposits the same $10k into Aqua0's Shared Liquidity Pool. The hook makes the capital available to **three** Uniswap V4 pools simultaneously: wARS, wBRL, wMXN. Same capital. Three markets. Three times the fees."*

The visual asymmetry — vanilla pool with only one active market, Aqua0 pool with three glowing cyan rows — is the whole pitch in one screen.

### 0:50 — Run it live

Scroll to the **Demo flow** action panel and walk the 4 steps:

1. **Mint mock tokens** → one click, batched call. Show the wallet balances filling in.
2. **Deposit 10k USDC** → approve + deposit. The "SLP USDC" balance in the strip below flips from `—` to `10,000`.
3. **Back the LATAM pools** → one transaction per pool (or batched). The right card's three rows light up as preferences are declared.
4. **Watch fees accrue** → trigger a swap (via the swap UI or by running `cast send` against the PoolSwapTest router in a side terminal).

### 1:30 — Punchline + ask

> *"Same $10,000. Three markets. Three times the fees. Live on Avalanche."*
>
> *"This is the foundation for institutional LATAM stablecoin liquidity. Ripio just launched wARS, wBRL, wMXN. Twin is doing the same on Avalanche. Both face the same problem: regional stables have $50–200k of pool TVL because LP economics don't work pair-by-pair. Aqua0 fixes that."*
>
> *"DMs open for intros to Ripio and Twin. Thanks."*

---

## Failure-mode cheat sheet

- **MetaMask rejects the tx with "internal error: exceeds max transaction gas limit".** That's MetaMask's generic disguise for a revert. Usually means `allowance < amount` for the deposit step. Re-run step 2.
- **Swap fails with `verifyJIT` revert.** The `JITPayload.deadline` expired (5-minute window) — re-sign and re-submit.
- **Faucet rate-limited.** Use the alternate faucets in the README: Core (https://core.app/tools/testnet-faucet/) or Coinbase (https://coinbase.com/faucets/avalanche-fuji-c-chain-faucet).
- **Balances don't refresh.** wagmi caches reads for ~4s. Wait a beat, or hit the wallet balance row to force a refetch.

---

## Why "wARS / wBRL / wMXN" and not "DAI / USDC / WBTC"

These are the **actual symbols Ripio uses** for their Argentine, Brazilian, and Mexican peso stablecoins (live on Ethereum + Base + World Chain today, Avalanche on their roadmap). Using real symbols — even on mock tokens — frames the demo around a concrete, named, named-customer-shaped use case rather than abstract DeFi infrastructure.

The mocks are pure `MockERC20` (6 decimals, public mint, no real backing). The architecture works identically against Ripio's production tokens once they land on Avalanche.
