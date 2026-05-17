import { DotMark } from "@/components/dot-mark";

// Problem/Solution side-by-side — mirrors aqua0.xyz's marketing landing
// "Stuck on one chain" vs "LP everywhere" beat. Here we keep the visual
// grammar but swap the verticals to LATAM stablecoins: the same $20k
// fragmented across two vanilla pools vs the same $20k unified in the SLP.

interface Row {
  label: string;
  value: string;
}

const VANILLA_ROWS: Row[] = [
  { label: "Deposit destination", value: "Split across 2 vanilla pools" },
  { label: "Markets backed", value: "2 of 6 (wARS, wBRL)" },
  { label: "Idle on the other 4", value: "wMXN, ARSt, BRLt, MXNt" },
  { label: "Fees · 30d", value: "$24" },
  { label: "Capital efficiency", value: "1× (baseline)" },
];

const AQUA0_ROWS: Row[] = [
  { label: "Deposit destination", value: "Shared Liquidity Pool" },
  { label: "Markets backed", value: "6 of 6 (Ripio + Twin)" },
  { label: "Idle on the others", value: "None — JIT routes capital" },
  { label: "Fees · 30d", value: "$72 (mocked)" },
  { label: "Capital efficiency", value: "6× (same deposit)" },
];

export function Comparison() {
  return (
    <section className="mt-12">
      <div className="mb-5">
        <div className="mb-3 inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.3em] text-white/60">
          <DotMark />
          The same $20k
        </div>
        <h2 className="max-w-[760px] text-[clamp(24px,3.2vw,36px)] font-bold leading-[1.05] tracking-[-0.025em] text-white">
          One deposit, fragmented{" "}
          <span className="text-white/35">vs</span>{" "}
          one deposit, amplified.
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CompareCard
          variant="vanilla"
          eyebrow="Without Aqua0"
          title="Two vanilla V4 pools"
          rows={VANILLA_ROWS}
        />
        <CompareCard
          variant="aqua0"
          eyebrow="With Aqua0"
          title="One Shared Liquidity Pool"
          rows={AQUA0_ROWS}
        />
      </div>
    </section>
  );
}

function CompareCard({
  variant,
  eyebrow,
  title,
  rows,
}: {
  variant: "vanilla" | "aqua0";
  eyebrow: string;
  title: string;
  rows: Row[];
}) {
  const isAqua = variant === "aqua0";
  return (
    <div
      className={
        isAqua
          ? "rounded-2xl border border-cyan/30 bg-cyan/[0.04] p-6"
          : "rounded-2xl border border-white/10 bg-white/[0.015] p-6"
      }
    >
      <div
        className={`text-[10px] uppercase tracking-[0.28em] ${
          isAqua ? "text-cyan" : "text-white/40"
        }`}
      >
        {eyebrow}
      </div>
      <h3
        className={`mt-1 text-[20px] font-semibold tracking-[-0.015em] ${
          isAqua ? "text-white" : "text-white/85"
        }`}
      >
        {title}
      </h3>

      <dl className="mt-5 space-y-2.5">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-start justify-between gap-4 border-t border-white/[0.06] pt-2.5 first:border-t-0 first:pt-0"
          >
            <dt className="text-[10.5px] uppercase tracking-[0.18em] text-white/40">
              {r.label}
            </dt>
            <dd
              className={`text-right text-[12.5px] ${
                isAqua ? "text-cyan" : "text-white/70"
              }`}
            >
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
