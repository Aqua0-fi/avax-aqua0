"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { ChainGuard } from "./chain-guard";
import { ConnectButton } from "./connect-button";
import { cn } from "@/lib/utils";

// Navbar — mirrors the production aqua0/web-app shell: sticky header with
// a subtle backdrop blur, brand-mark + Avalanche edition pill on the left,
// center pill-nav with active state inverted to white-on-black, connect
// pill on the right. Mobile collapses to a hamburger that slides a panel
// under the bar.

const NAV_LINKS = [
  { href: "/strategies", label: "Strategies" },
  { href: "/swap", label: "Swap" },
  { href: "/profile", label: "Profile" },
  { href: "/faucet", label: "Faucet" },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/40 backdrop-blur-md">
      <nav className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* ── Brand ─────────────────────────────────────────────────── */}
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-[13px] font-bold text-cyan">
            A
          </span>
          <span className="text-[16px] font-semibold tracking-[0.01em]">
            Aqua0
          </span>
          <span className="ml-1 rounded border border-cyan/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-cyan">
            Avalanche
          </span>
        </Link>

        {/* ── Center pill nav (md+) ────────────────────────────────── */}
        <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border border-white/10 bg-white/[0.02] p-1 md:flex">
          {NAV_LINKS.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-5 py-1.5 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-white text-black"
                    : "text-white/60 hover:text-white",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* ── Right: connect + mobile menu trigger ────────────────── */}
        <div className="flex items-center gap-2">
          <ConnectButton />
          <button
            className="rounded-lg border border-white/10 p-2 text-white/70 transition-colors hover:border-white/30 hover:text-white md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      {/* ── Mobile panel ────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-black/60 p-4 backdrop-blur-sm animate-slide-down md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "rounded-lg px-4 py-3 text-[14px] font-medium transition-colors",
                    active
                      ? "bg-white text-black"
                      : "text-white/70 hover:bg-white/[0.05] hover:text-white",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>

    {/* ── Wrong-network banner ─────────────────────────────────────────
        Sits in the flow right under the navbar so it composes naturally
        when sticky-positioned alongside it. Renders nothing when the
        wallet is disconnected or already on Fuji. */}
    <ChainGuard />
    </>
  );
}
