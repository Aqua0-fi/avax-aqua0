"use client";

import { useEffect } from "react";

// app/error.tsx — Next.js per-segment error boundary. Catches runtime
// exceptions thrown inside any page or layout under /. Without this, a
// thrown error inside a client hook (wagmi reconnect, viem read, etc.)
// can blank-screen the whole app silently — exactly the kind of bug
// that masquerades as 'localhost se cae cada dos por tres'.
//
// In dev, Next.js still shows its red error overlay on top of this; in
// production the user gets a recoverable view + a 'Reset' button.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Logged to the dev terminal AND the browser console so it survives
    // even if the overlay is dismissed.
    console.error("[Aqua0 error boundary]", error);
  }, [error]);

  return (
    <div className="relative z-10 mx-auto flex min-h-[80vh] max-w-3xl flex-col items-start justify-center px-6 py-16 sm:px-10">
      <div className="mb-3 inline-flex items-center gap-2.5 rounded-full border border-red-400/30 bg-red-500/[0.06] px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-red-300">
        <span className="h-1.5 w-1.5 rounded-full bg-red-300" />
        Runtime error
      </div>
      <h1 className="text-[clamp(28px,3.6vw,40px)] font-bold leading-[1.05] tracking-[-0.025em] text-white">
        Something threw on the client.
      </h1>
      <p className="mt-4 max-w-[640px] text-[14px] leading-[1.55] text-white/60">
        The dev server is still up — this view replaces the page that
        errored so you can see the trace instead of staring at a blank
        screen.
      </p>

      <pre className="mt-5 max-w-full overflow-x-auto rounded-lg border border-white/10 bg-black/40 px-4 py-3 font-mono text-[12px] leading-[1.55] text-red-200">
{error.message}
{error.stack ? "\n\n" + error.stack : ""}
      </pre>

      {error.digest && (
        <p className="mt-3 font-mono text-[11px] text-white/40">
          digest · {error.digest}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2.5">
        <button
          onClick={() => reset()}
          className="rounded-lg bg-cyan px-5 py-2.5 text-[13px] font-semibold text-black transition-colors hover:bg-cyan-dim"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-lg border border-white/20 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:border-white"
        >
          Back to landing
        </a>
      </div>
    </div>
  );
}
