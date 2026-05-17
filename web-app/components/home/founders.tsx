import { DotMark } from "@/components/dot-mark";

// Founder bio strip — mirrors aqua0.xyz's marketing landing "team" section.
// Pixelated avatars live in /public; CSS gets image-rendering:pixelated so
// the upscale stays crisp instead of blurring the deliberate pixel art.

interface Founder {
  name: string;
  role: string;
  /** Photo path inside /public. */
  photo: string;
}

const FOUNDERS: Founder[] = [
  {
    name: "Tomás Mazzitello",
    role: "CEO",
    photo: "/Tomas.png",
  },
  {
    name: "Yudhishthra Sugumaram",
    role: "CTO",
    photo: "/Yudhishthra.png",
  },
  {
    name: "Rithik Kumer",
    role: "Founding Engineer",
    photo: "/Rithik.png",
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
  return (
    <article className="flex items-center gap-4 rounded-xl border border-white/10 bg-card p-4 transition-colors hover:border-white/30">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={founder.photo}
        alt={founder.name}
        className="h-16 w-16 shrink-0 rounded-lg bg-black object-contain p-1"
        style={{ imageRendering: "pixelated" }}
      />
      <div className="min-w-0">
        <div className="truncate text-[14px] font-semibold tracking-[-0.01em] text-white">
          {founder.name}
        </div>
        <div className="mt-0.5 text-[11px] text-white/55">{founder.role}</div>
      </div>
    </article>
  );
}
