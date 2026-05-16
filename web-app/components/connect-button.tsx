"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { Check, ChevronDown, Copy, ExternalLink, LogOut } from "lucide-react";
import { shortAddr } from "@/lib/utils";

const SNOWTRACE_FUJI = "https://testnet.snowtrace.io/address/";

// Disconnected state mirrors the production aqua0 navbar pill: rounded
// white button on dark, small lift on hover. Once connected, the trigger
// becomes a dark pill with a live-cyan dot + truncated address +
// chevron-down that opens a small menu (copy, view-on-explorer, disconnect)
// so a fat-finger on the address doesn't kick the user out of the demo.
export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click / escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen]);

  async function handleCopy() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard API can fail in restricted contexts — silently swallow */
    }
  }

  if (!isConnected) {
    return (
      <button
        onClick={() => connect({ connector: injected() })}
        disabled={isPending}
        className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-black transition-transform hover:-translate-y-px disabled:opacity-60"
      >
        {isPending ? "Connecting…" : "Connect wallet"}
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen((v) => !v)}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium text-white/80 transition-colors hover:border-white/30 hover:text-white"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-cyan shadow-[0_0_6px_#7FE5E5]" />
        {address ? shortAddr(address) : "…"}
        <ChevronDown
          className={
            "h-3 w-3 text-white/40 transition-transform " +
            (menuOpen ? "rotate-180" : "")
          }
        />
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 min-w-[210px] overflow-hidden rounded-xl border border-white/10 bg-card p-1 shadow-[0_8px_32px_rgba(0,0,0,0.6)] animate-zoom-in"
        >
          <button
            role="menuitem"
            onClick={() => void handleCopy()}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-white/80 transition-colors hover:bg-white/[0.04] hover:text-white"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-cyan" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-white/50" />
            )}
            <span>{copied ? "Copied" : "Copy address"}</span>
          </button>
          <a
            role="menuitem"
            href={`${SNOWTRACE_FUJI}${address}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-white/80 transition-colors hover:bg-white/[0.04] hover:text-white"
          >
            <ExternalLink className="h-3.5 w-3.5 text-white/50" />
            <span>View on Snowtrace</span>
          </a>
          <div className="my-1 border-t border-white/[0.06]" />
          <button
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              disconnect();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-red-300/85 transition-colors hover:bg-red-400/[0.06] hover:text-red-200"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Disconnect</span>
          </button>
        </div>
      )}
    </div>
  );
}
