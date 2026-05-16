// Aquatic decoration — six stacked sine waves + drop dots fading downward.
// Ported from aqua0/web-app. Use as a sibling of a page hero; the parent
// must be `relative` since this SVG is absolutely positioned and
// pointer-events-none.

interface HeroWavesProps {
  /** Stroke / drop color. Defaults to the protocol cyan. */
  accent?: string;
  /** Tailwind positioning. Default floats it top-right on md+ screens. */
  className?: string;
}

export function HeroWaves({
  accent = "#7FE5E5",
  className = "pointer-events-none absolute -top-8 right-0 hidden h-[280px] w-[640px] md:block",
}: HeroWavesProps) {
  // Deterministic gradient IDs per accent so multiple instances on one page
  // (e.g. landing hero + a sub-section accent) don't collide.
  const safeAccent = accent.replace(/[^a-zA-Z0-9]/g, "");
  const fadeId = `heroWaveFade-${safeAccent}`;
  const blobId = `heroWaveBlob-${safeAccent}`;

  return (
    <svg
      className={className}
      viewBox="0 0 640 280"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={fadeId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={accent} stopOpacity="0" />
          <stop offset="60%" stopColor={accent} stopOpacity="0.55" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
        <radialGradient id={blobId} cx="72%" cy="40%" r="55%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.15" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${blobId})`} />
      <g fill="none" stroke={`url(#${fadeId})`} strokeWidth="1.2">
        <path d="M-50,40  C100,20 250,60 400,40 C500,25 600,55 690,40" opacity="0.55" />
        <path d="M-50,80  C100,60 250,100 400,80 C500,65 600,95 690,80" opacity="0.42" />
        <path d="M-50,120 C100,100 250,140 400,120 C500,105 600,135 690,120" opacity="0.32" />
        <path d="M-50,160 C100,140 250,180 400,160 C500,145 600,175 690,160" opacity="0.22" />
        <path d="M-50,200 C100,180 250,220 400,200 C500,185 600,215 690,200" opacity="0.14" />
        <path d="M-50,240 C100,220 250,260 400,240 C500,225 600,255 690,240" opacity="0.08" />
      </g>
      <g fill={accent}>
        <circle cx="180" cy="58" r="1.8" opacity="0.55" />
        <circle cx="360" cy="98" r="1.4" opacity="0.45" />
        <circle cx="510" cy="148" r="1.2" opacity="0.4" />
        <circle cx="280" cy="188" r="1" opacity="0.3" />
        <circle cx="450" cy="220" r="0.9" opacity="0.25" />
      </g>
    </svg>
  );
}
