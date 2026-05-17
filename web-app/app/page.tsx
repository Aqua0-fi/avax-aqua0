"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectedHome } from "@/components/home/connected-home";
import { DisconnectedHome } from "@/components/home/disconnected-home";

// /  — thin auth-aware shell.
//
// Two surfaces:
//   - DisconnectedHome: full marketing landing (hero, comparison split,
//     founder bios, footer). What a first-time judge / LP sees.
//   - ConnectedHome:    compact dashboard hub. What returning users land
//     on — KpiStrip snapshot + 3 surface cards (Strategies / Swap / Profile)
//     so they can pick their next move without re-pitching the product.
//
// Both share Navbar + HeroWaves + AlphaBackground (via layout) so the
// transition between states feels like the same site, not a re-route.
//
// The `mounted` gate keeps SSR + first client paint deterministic
// (always DisconnectedHome). wagmi's `isConnected` flips true post-mount
// once the injected connector finishes reconnecting — flipping then is
// safe because we're past hydration.
export default function Home() {
  const { isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <DisconnectedHome />;
  return isConnected ? <ConnectedHome /> : <DisconnectedHome />;
}
