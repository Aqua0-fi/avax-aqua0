import { DotMark } from "@/components/dot-mark";

// Founder bio strip — mirrors aqua0.xyz's marketing landing "team" section.
// Institutional pitch needs team signalling, so we surface it on the
// disconnected home. Avatars are initial discs (no asset uploads required);
// swap for real photos via /public when available.

interface Founder {
  name: string;
  role: string;
  bio: string;
  initial: string;
  /** Avatar tint — three cool variants to break the cyan monotone. */
  tint: "cyan" | "indigo" | "teal";
}

const FOUNDERS: Founder[] = [
  {
    name: "Tomás Castagnino",
    role: "Co-founder · CEO",
    bio: "ETHGlobal Buenos Aires winner. 1inch grant. Canopy '25 (Founders Inc).",
    initial: "T",
    tint: "cyan",
  },
  {
    name: "Yudhish",
    role: "Co-founder · CTO",
    bio: "Smart-contract architect. Leads the SLP + V4 hook implementation.",
    initial: "Y",
    tint: "indigo",
  },
  {
    name: "Rithik",
    role: "Founding engineer",
    bio: "Full-stack. Shipped the cross-chain swap path + LP dashboards.",
    initial: "R",
    tint: "teal",
  },
];

export function Founders() {
  return (
    <section className="mt-12">
      <div className="mb-5">
        <div className="mb-3 inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.3em] text-white/60">
          <DotMark />
          Team
        </div>
        <h2 className="max-w-[680px] text-[clamp(22px,3vw,32px)] font-bold leading-[1.05] tracking-[-0.025em] text-white">
          Built by the same team that won ETHGlobal Buenos Aires.
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {FOUNDERS.map((f) => (
          <FounderCard key={f.name} founder={f} />
        ))}
      </div>
    </section>
  );
}

function FounderCard({ founder }: { founder: Founder }) {
  const tintBg = {
    cyan: "#7FE5E5",
    indigo: "#8B9BFF",
    teal: "#5EE0C8",
  }[founder.tint];

  return (
    <article className="rounded-xl border border-white/10 bg-card p-5 transition-colors hover:border-white/30">
      <div className="flex items-center gap-3.5">
        <div
          className="grid h-11 w-11 place-items-center rounded-full text-[16px] font-bold text-black"
          style={{
            background: tintBg,
            boxShadow: `0 0 16px ${tintBg}33`,
          }}
        >
          {founder.initial}
        </div>
        <div>
          <div className="text-[14px] font-semibold tracking-[-0.01em] text-white">
            {founder.name}
          </div>
          <div className="mt-0.5 text-[11px] text-white/50">{founder.role}</div>
        </div>
      </div>
      <p className="mt-4 text-[12.5px] leading-[1.55] text-white/60">
        {founder.bio}
      </p>
    </article>
  );
}
