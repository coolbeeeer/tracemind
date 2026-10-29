import type { ReactNode } from "react";

/**
 * Blue-violet redesign shared pieces, matching the approved mockup:
 * deep navy background, blue-to-violet accents, rounded panels, and
 * SVG charts with no chart library. Every chart renders only the
 * data it is given; empty series render flat/empty, never a
 * fabricated trend. Counts, deltas, and breakdowns are always
 * computed from action data by the caller, never hardcoded.
 */
export const redesign = {
  pageBg: "#070B16",
  panelBg: "#0E1526",
  panelBgSoft: "#111B31",
  border: "#1E2A44",
  text: "#E8EDF7",
  muted: "#8B96B0",
  blue: "#3B82F6",
  violet: "#8B5CF6",
  cyan: "#22D3EE",
  red: "#EF4444",
  amber: "#F59E0B",
  green: "#22C55E",
};

export function Panel({
  children,
  className = "",
  label,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <section
      aria-label={label}
      className={`rounded-2xl border p-4 sm:p-5 ${className}`}
      style={{ borderColor: redesign.border, backgroundColor: redesign.panelBg }}
    >
      {children}
    </section>
  );
}

export function PanelTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-sm font-semibold text-[#E8EDF7]">{children}</h2>
      {action ? <span className="text-xs text-[#8B96B0]">{action}</span> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: ReactNode;
  accent: string;
}) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ borderColor: redesign.border, backgroundColor: redesign.panelBg }}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl text-lg"
          style={{ backgroundColor: `${accent}1A`, color: accent }}
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-[#E8EDF7]">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-[#8B96B0]">{label}</p>
      {sub ? <p className="mt-1 text-xs text-[#8B96B0]">{sub}</p> : null}
    </div>
  );
}

/** Vertical bars for a numeric series (error activity). Empty series renders a flat baseline. */
export function BarChart({
  values,
  labels,
  label,
}: {
  values: number[];
  labels: string[];
  label: string;
}) {
  const width = 560;
  const height = 160;
  const max = Math.max(...values, 1);
  const barWidth = values.length > 0 ? Math.min(18, (width / values.length) * 0.6) : 0;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${width} ${height}`}
      className="h-40 w-full"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="redesign-bars" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={redesign.blue} />
          <stop offset="100%" stopColor={redesign.violet} />
        </linearGradient>
      </defs>
      {values.length === 0 ? (
        <line x1="0" y1={height - 20} x2={width} y2={height - 20} stroke={redesign.border} strokeWidth="2" />
      ) : (
        values.map((value, index) => {
          const slot = width / values.length;
          const barHeight = Math.max(2, (value / max) * (height - 30));
          const x = slot * index + (slot - barWidth) / 2;
          return (
            <g key={labels[index] ?? index}>
              <rect
                x={x}
                y={height - 20 - barHeight}
                width={barWidth}
                height={barHeight}
                rx="3"
                fill={value >= max * 0.8 ? redesign.red : "url(#redesign-bars)"}
                opacity={value >= max * 0.8 ? 0.9 : 0.75}
              />
            </g>
          );
        })
      )}
    </svg>
  );
}

/** Donut chart for a labelled breakdown. Segments sum to the total; empty data renders a grey ring. */
export function DonutChart({
  segments,
  total,
  label,
  centerLabel = "total",
}: {
  segments: { label: string; value: number; color: string }[];
  total: number;
  label: string;
  centerLabel?: string;
}) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="flex items-center gap-5">
      <svg role="img" aria-label={label} viewBox="0 0 140 140" className="h-32 w-32 shrink-0">
        <circle cx="70" cy="70" r={radius} fill="none" stroke={redesign.border} strokeWidth="16" />
        {total > 0 &&
          segments.map((segment) => {
            if (segment.value <= 0) return null;
            const length = (segment.value / total) * circumference;
            const el = (
              <circle
                key={segment.label}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth="16"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 70 70)"
              />
            );
            offset += length;
            return el;
          })}
        <text x="70" y="66" textAnchor="middle" fill={redesign.text} fontSize="20" fontWeight="700">
          {total}
        </text>
        <text x="70" y="84" textAnchor="middle" fill={redesign.muted} fontSize="9">
          {centerLabel}
        </text>
      </svg>
      <ul className="space-y-2 text-xs">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
            <span className="text-[#8B96B0]">{segment.label}</span>
            <span className="ml-auto pl-4 font-medium text-[#E8EDF7]">
              {total > 0 ? Math.round((segment.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
