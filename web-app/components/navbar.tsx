"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "./connect-button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/strategies", label: "Strategies" },
  { href: "/swap", label: "Swap" },
  { href: "/profile", label: "Profile" },
] as const;

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="relative z-10 mx-auto flex max-w-[1180px] items-center justify-between px-6 py-6 sm:px-10">
      <Link href="/" className="flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-sm font-bold text-cyan">
          A
        </span>
        <span className="text-[15px] font-semibold tracking-[0.02em]">
          Aqua0
        </span>
        <span className="ml-2 hidden text-[10px] uppercase tracking-[0.28em] text-cyan sm:inline">
          · Avalanche Edition
        </span>
      </Link>

      <div className="hidden items-center gap-7 sm:flex">
        {LINKS.map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm transition",
                active
                  ? "text-cyan"
                  : "text-white/70 hover:text-cyan",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/faucet"
          className="hidden text-xs uppercase tracking-[0.18em] text-white/50 transition hover:text-cyan sm:inline"
        >
          Faucet
        </Link>
        <ConnectButton />
      </div>
    </nav>
  );
}
