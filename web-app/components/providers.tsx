"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { WagmiProvider, useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { wagmiConfig } from "@/lib/wagmi";

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={qc}>
        <AddressResetGuard />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

// Force a hard browser reload whenever the connected wallet's address
// changes (except the initial connect from a disconnected state). The
// soft cache wipe via `queryClient.clear()` wasn't enough — wagmi's
// internal account state, component-local useState values, and any
// derived selectors elsewhere could still surface data from the
// previous wallet briefly. A full reload is heavy-handed but it makes
// "switch wallet → demo starts at zero" 100 % reliable for the demo.
function AddressResetGuard() {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const prev = useRef<string | undefined>(undefined);

  useEffect(() => {
    const previous = prev.current;
    prev.current = address;

    // First mount (no previous address) → nothing to reset.
    if (previous === undefined) return;
    // Connect from disconnected → fresh data, no reload needed.
    if (previous === undefined && address) return;
    // Same address (re-render) → nothing to do.
    if (previous === address) return;

    // Either disconnect or switch between two real wallets — wipe cache
    // and reload. The reload is the belt; queryClient.clear() is the
    // suspenders for the brief moment before reload kicks in.
    queryClient.clear();
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, [address, queryClient]);

  return null;
}
