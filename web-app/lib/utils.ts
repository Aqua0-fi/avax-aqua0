import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortAddr(addr: string | undefined): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function formatAmount(
  raw: bigint | undefined,
  decimals: number,
  maxFrac = 4,
): string {
  if (raw === undefined) return "—";
  const negative = raw < 0n;
  const value = negative ? -raw : raw;
  const denom = 10n ** BigInt(decimals);
  const whole = value / denom;
  const frac = value % denom;
  if (frac === 0n) return `${negative ? "-" : ""}${whole.toString()}`;
  const fracStr = frac
    .toString()
    .padStart(decimals, "0")
    .slice(0, maxFrac)
    .replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole.toString()}${fracStr ? "." + fracStr : ""}`;
}
