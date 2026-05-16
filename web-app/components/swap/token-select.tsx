"use client";

import { useEffect, useRef, useState } from "react";
import { type TokenMeta } from "@/lib/contracts";
import { cn } from "@/lib/utils";

// Token picker dropdown — opens on click, closes on outside click + escape.
// Renders the issuer pill under each token so the user understands which
// LATAM stablecoin family (Ripio vs Twin) they're picking. The selected
// token's accent dot is reused inline.
export function TokenSelect({
  selected,
  options,
  onSelect,
  disabled = false,
}: {
  selected: TokenMeta;
  options: TokenMeta[];
  onSelect: (token: TokenMeta) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click / escape.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-2 text-sm font-semibold text-white transition",
          !disabled && "hover:border-cyan/50 hover:text-cyan",
          disabled && "opacity-50",
        )}
      >
        <span
          className="h-3 w-3 rounded-full"
          style={{
            background: selected.accent,
            boxShadow: `0 0 8px ${selected.accent}88`,
          }}
        />
        <span>{selected.symbol}</span>
        <span
          className={cn(
            "text-white/40 transition",
            open && "rotate-180",
          )}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-[260px] overflow-hidden rounded-xl border border-white/10 bg-card p-1 shadow-[0_10px_40px_rgba(0,0,0,0.6)] animate-zoom-in">
          <div className="border-b border-white/[0.06] px-3 py-2 text-[9.5px] uppercase tracking-[0.22em] text-white/40">
            Select token
          </div>
          <ul className="max-h-[320px] overflow-y-auto py-1">
            {options.map((token) => {
              const isActive = token.address === selected.address;
              return (
                <li key={token.address}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(token);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-left transition",
                      isActive
                        ? "bg-cyan/[0.06]"
                        : "hover:bg-white/[0.04]",
                    )}
                  >
                    <span
                      className="h-3.5 w-3.5 shrink-0 rounded-full"
                      style={{
                        background: token.accent,
                        boxShadow: `0 0 8px ${token.accent}66`,
                      }}
                    />
                    <div className="flex-1">
                      <div className="text-[13.5px] font-semibold leading-tight">
                        {token.symbol}
                      </div>
                      <div className="text-[10.5px] text-white/40">
                        {token.issuer === "anchor"
                          ? "Anchor"
                          : token.issuer === "ripio"
                          ? "Ripio"
                          : "Twin"}
                      </div>
                    </div>
                    {isActive && (
                      <span className="text-[10px] uppercase tracking-[0.22em] text-cyan">
                        ✓
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
