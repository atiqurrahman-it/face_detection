import { useState } from "react";
import { useTheme } from "../../context/ThemeContext";

const SURFACE = { light: "#ffffff", dark: "#0f172a" };

function polarToCartesian(cx, cy, r, angleDeg) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function sliceArcPath(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  return `M${cx},${cy} L${start.x},${start.y} A${r},${r} 0 ${largeArcFlag} 0 ${end.x},${end.y} Z`;
}

/**
 * slices: [{ key: string, label: string, value: number, light: string, dark: string }]
 * Only slices with value > 0 are rendered. Colors are per-entity and fixed by the
 * caller (not reassigned by filtering), per the categorical color rule.
 */
export default function PieChart({ slices, height = 240, formatValue = (v) => v.toLocaleString() }) {
  const { theme } = useTheme();
  const [hovered, setHovered] = useState(null);
  const surface = SURFACE[theme === "dark" ? "dark" : "light"];

  const visible = slices.filter((s) => s.value > 0);
  const total = visible.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No data yet.</p>;
  }

  const size = height;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  let cursor = 0;
  const arcs = visible.map((s) => {
    const fraction = s.value / total;
    const startAngle = cursor * 360;
    cursor += fraction;
    const endAngle = cursor * 360;
    return { ...s, startAngle, endAngle, fraction };
  });

  return (
    <div className="w-full">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[240px]" role="img" aria-label="Pie chart">
          {arcs.map((arc) => {
            const isHovered = hovered === arc.key;
            const color = arc[theme === "dark" ? "dark" : "light"];
            const midAngle = (arc.startAngle + arc.endAngle) / 2;
            const labelPos = polarToCartesian(cx, cy, r * 0.65, midAngle);
            const showLabel = arc.fraction >= 0.08;
            const isFullCircle = arc.endAngle - arc.startAngle >= 359.999;
            const sharedProps = {
              fill: color,
              stroke: surface,
              strokeWidth: 2,
              opacity: isHovered ? 0.85 : 1,
              tabIndex: 0,
              role: "img",
              "aria-label": `${arc.label}: ${formatValue(arc.value)} (${Math.round(arc.fraction * 100)}%)`,
              onMouseEnter: () => setHovered(arc.key),
              onMouseLeave: () => setHovered(null),
              onFocus: () => setHovered(arc.key),
              onBlur: () => setHovered(null),
              style: { cursor: "pointer", outline: "none" },
            };
            return (
              <g key={arc.key}>
                {isFullCircle ? (
                  <circle cx={cx} cy={cy} r={r} {...sharedProps} />
                ) : (
                  <path d={sliceArcPath(cx, cy, r, arc.startAngle, arc.endAngle)} {...sharedProps} />
                )}
                {showLabel && (
                  <text
                    x={labelPos.x}
                    y={labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="11"
                    fontWeight="600"
                    fill="#ffffff"
                    style={{ pointerEvents: "none" }}
                  >
                    {Math.round(arc.fraction * 100)}%
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        <div className="flex flex-col gap-2">
          {arcs.map((arc) => (
            <div key={arc.key} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: arc[theme === "dark" ? "dark" : "light"] }}
              />
              <span className="min-w-0 truncate">{arc.label}</span>
              <span className="font-semibold text-slate-900 dark:text-white">{formatValue(arc.value)}</span>
            </div>
          ))}
        </div>
      </div>

      {hovered != null &&
        (() => {
          const arc = arcs.find((a) => a.key === hovered);
          if (!arc) return null;
          return (
            <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <span className="font-semibold text-slate-900 dark:text-white">{formatValue(arc.value)}</span>
              <span className="ml-2 text-slate-500 dark:text-slate-400">
                {arc.label} — {Math.round(arc.fraction * 100)}%
              </span>
            </div>
          );
        })()}
    </div>
  );
}
