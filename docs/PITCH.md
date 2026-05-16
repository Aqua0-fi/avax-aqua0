# Pitch Deck — 5 slides

> Copy-paste into Pitch.com, Google Slides, Figma, etc. Each `---` is a slide break.

---

## Slide 1 — Problem

# Local stablecoins are LATAM's killer app.
# Their liquidity is broken.

**Ripio launched wARS, wBRL, wMXN** in 2025.
**Twin (ex-Num) is doing the same** for Avalanche.
**$200k of monthly wARS volume.** Real adoption, real users.

But **$50–200k of pool TVL means 2–3% slippage on $5k trades**.
LPs don't deploy because the math doesn't work pair-by-pair.

The infrastructure exists. It doesn't scale.

---

## Slide 2 — Why now

# 2026 is the year of local stables.

- **Ripio CEO Sebastián Serrano**: *"we're entering the era of local stablecoins."*
- **Tether USDT0** live on Avalanche.
- **Circle CCTP V2** pushing into LATAM.
- **Mountain Protocol** scaling USDM.
- **Avalanche Foundation** funding LATAM-native builders (Crecimiento, Edge City).

The wave is arriving. **The LP economics need to be ready for it.**

---

## Slide 3 — Solution

# Aqua0 Prime: one deposit, every market.

A V4 hook + a Shared Liquidity Pool. **One LP deposit serves N pools simultaneously.**

- ✅ **Capital efficiency**: same $10k earns fees across wARS, wBRL, wMXN
- ✅ **Single counterparty**: institutions face one vault, full audit trail
- ✅ **No bridge risk**: single-chain, atomic settlement via V4 hook
- ✅ **Trust-minimized**: no off-chain signer, LP wallet signs every JIT auth
- ✅ **Composable**: works with any V4 pool, any stable pair

> *"Same capital. Same risk profile. 3× the fees."*

---

## Slide 4 — Demo

# Live on Avalanche Fuji.

**(walkthrough — see DEMO.md)**

- Deposit 10k USDC into SLP
- Declare JIT preferences for 3 LATAM pools
- Run swaps from a second wallet
- Dashboard shows fees from all 3 pools, sourced from one deposit
- Side-by-side: vanilla V4 pool earns $87/mo. Aqua0 SLP earns $201/mo from the same $10k.

**Repo**: `github.com/Aqua0-fi/avax-aqua0` (public, deployable in ~5 min)
**Demo**: `<deployment URL when live>`

---

## Slide 5 — Roadmap + Ask

# What's next.

**Q3 2026** — Avalanche **mainnet** deploy. V4 already lives there at `0x06380c…c85`.
**Q4 2026** — Integration with **Ripio's real wARS/wBRL/wMXN** + **Twin Finance** stables.
**2027** — **Avalanche L1 subnet** for permissioned, custodial-grade institutional access.

# Ask.

- Intros to **Ripio** (Sebastián Serrano) and **Twin Finance** (Agustín Liserra) for a TVL pilot
- Validation calls with **Avalanche Foundation** re: subnet roadmap
- 1-on-1 with LATAM stablecoin teams about plugging into Aqua0 as their default LP layer

---

### Footer for every slide (small)

> Aqua0 · ETHGlobal Buenos Aires winner · 1inch trading API grant · Founders Inc. Canopy batch
> tomas@aqua0.xyz · twitter.com/AquaZero0 · github.com/Aqua0-fi
