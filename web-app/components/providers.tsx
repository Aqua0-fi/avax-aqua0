"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { WagmiProvider, useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { wagmiConfig } from "@/lib/wagmi";

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={qc}>
        {/* Wipes the React Query cache whenever the connected wallet
            changes. Every per-user hook (SLP balance, JIT positions,
            wallet balance, etc.) keys its queries off `address`, so
            old data wouldn't be visually shown — but TanStack still
            keeps it in the cache and a stale render or hover could
            briefly leak the previous wallet's numbers. Clearing on
            address change makes a fresh wallet connect look like a
            fresh visit. */}
        <AddressResetGuard />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

function AddressResetGuard() {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  useEffect(() => {
    queryClient.clear();
  }, [address, queryClient]);
  return null;
}
