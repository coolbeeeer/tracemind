import { DemoBadge } from "./badges";

export function DemoBanner() {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
      <DemoBadge />
      <p className="text-xs leading-relaxed text-muted-foreground">
        Sample data for this view. These records are not live monitoring or real investigations.
      </p>
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-[#232833] bg-[#14161D] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[#969CA9]">
        {label}
      </p>
      <p
        className="mt-2 text-3xl font-semibold tracking-tight text-[#ECEEF2]"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-[#969CA9]">{sub}</p> : null}
    </div>
  );
}

/**
 * Minimal SVG sparkline. No chart library in Phase 1 — the shape is the
 * data, and a library would add weight before a real trend requirement
 * exists. Values are normalised to the chart height; an empty series
 * renders a flat line, never a fabricated trend.
 */
export function Sparkline({
  values,
  stroke = "#5B8DEF",
  label,
}: {
  values: number[];
  stroke?: string;
  label: string;
}) {
  const width = 220;
  const height = 56;
  if (values.length === 0) {
    return (
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${width} ${height}`}
        className="h-14 w-full"
      >
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#232833" strokeWidth="2" />
      </svg>
    );
  }
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => {
    const x =
      values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - 6 - (value / max) * (height - 12);
    return `${x},${y}`;
  });
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${width} ${height}`}
      className="h-14 w-full"
      preserveAspectRatio="none"
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
