// 3×3 pixel grid — the cyan dot-mark that prefixes every section label
// across the app (e.g. "EXPLORE", "LIVE · AVALANCHE FUJI"). Tiny pixel-art
// glyph that anchors the brand language alongside the aquatic waves.
//
// Style note: keep it `text-cyan` so it inherits whatever colour the parent
// pill is using — chain-tinted pills override the cyan with the chain
// accent (e.g. red-ish on Avalanche).

export function DotMark({
  size = 14,
  className = "text-cyan",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 12 12"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
    >
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => (
          <rect
            key={`${r}-${c}`}
            x={c * 4 + 1}
            y={r * 4 + 1}
            width="2"
            height="2"
            fill="currentColor"
          />
        )),
      )}
    </svg>
  );
}
