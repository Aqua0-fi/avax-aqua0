# 2-minute video script

> Word-for-word teleprompter. Time markers are targets, not strict. Pre-record screen captures of the demo flow so you can voice over them; live wallet popups break the pacing.

---

## 0:00–0:10 — Hook

> *"Ripio just launched local stablecoins for Argentina, Brazil, and Mexico. Two hundred thousand dollars of monthly volume on wARS alone. But LPs aren't deploying — because at fifty thousand dollars of pool TVL, the fees don't justify the impermanent-loss risk pair by pair."*

**On screen**: real Snowtrace screenshot of wARS/USDC pool with low TVL.

---

## 0:10–0:25 — Setup

> *"I'm Tomás, CEO of Aqua0. We won ETHGlobal Buenos Aires last year. We have a grant from 1inch and we're in the Founders Inc. Canopy batch. And we built a way to fix this — deployed live on Avalanche today."*

**On screen**: logo + brand bar with ETHGlobal / 1inch / Founders Inc. badges.

---

## 0:25–0:45 — Solution

> *"Aqua0 is cross-margin prime brokerage for DeFi. One deposit into our Shared Liquidity Pool serves multiple Uniswap V4 pools at the same time. Same capital, multiple markets, no fragmentation. We built it as a V4 hook — every swap pulls liquidity transient-style from the SLP, then settles back with the fees."*

**On screen**: architecture diagram from ARCHITECTURE.md (or a clean version of it).

---

## 0:45–1:30 — Demo

> *"Here's what that looks like."*

**(switch to screen capture of the demo app)**

> *"On the left, traditional V4 LP. Ten thousand dollars committed to wARS/USDC. Earns about eighty-seven dollars a month."*

**(pause, point at right card)**

> *"On the right — same ten thousand dollars, deposited into Aqua0's SLP. The hook makes the capital available to three pools at once: wARS, wBRL, wMXN. Two hundred and one dollars a month in fees from the same deposit. That's three times. No bridges, no cross-chain risk, atomic settlement."*

**(action panel)**

> *"Anyone can verify this themselves. Deposit, declare JIT preferences, run a swap from a second wallet. Everything is on-chain. There's no backend service — every authorization is signed by the LP's own wallet."*

---

## 1:30–1:50 — Roadmap

> *"Next step: mainnet on Avalanche, integration with Ripio's real wARS, wBRL, wMXN tokens, and Twin Finance's stablecoin rails. Q4: a permissioned Avalanche subnet for institutional access — custodial-grade, KYC'd validators, the same Aqua0 core underneath."*

**On screen**: timeline graphic — Q3 mainnet, Q4 Ripio + Twin, 2027 subnet.

---

## 1:50–2:00 — Ask

> *"We're looking for intros to Ripio and Twin teams for a TVL pilot. If you know Sebastián or Agustín, please reach out. Repo is public — github dot com slash Aqua0-fi slash avax-aqua0. Thanks for watching."*

**On screen**:
```
Aqua0 · Avalanche Edition
github.com/Aqua0-fi/avax-aqua0
tomas@aqua0.xyz · @AquaZero0
```

---

## Recording tips

- **Record early.** As soon as the demo works end-to-end *once*, lock that take. Don't try to perfect it — the first working take is the one judges see.
- **Pre-cap the screen captures.** Don't run wallets live in the video. Capture each step (mint, deposit, JIT, swap) as its own short clip, then sequence them in the edit.
- **Audio matters more than video.** Spend extra minutes on the mic. Re-record the voiceover until your pacing is calm and confident.
- **Subtitles.** Add SRT — many judges watch muted. ChatGPT or Whisper will transcribe a 2-min clip in seconds.
- **Loom over OBS.** Loom hosts directly + gives a sharing link. For a 2-min clip the encoding takes 30 seconds.
- **Don't show the deployer wallet's private key**, balance higher than necessary, or anything that reveals operational security. Use a fresh address if you need to.
