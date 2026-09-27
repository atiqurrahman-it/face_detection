import { useState } from "react";
import { useTheme } from "../../context/ThemeContext";

const SURFACE = { light: "#ffffff", dark: "#0f172a" };
const INNER_RADIUS_RATIO = 0.55;

function polarToCartesian(cx, cy, r, angleDeg) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function donutSlicePath(cx, cy, outerR, innerR, startAngle, endAngle) {
  const outerStart = polarToCartesian(cx, cy, outerR, endAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, startAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  return `M${outerStart.x},${outerStart.y}
          A${outerR},${outerR} 0 ${largeArcFlag} 0 ${outerEnd.x},${outerEnd.y}
          L${innerStart.x},${innerStart.y}
          A${innerR},${innerR} 0 ${largeArcFlag} 1 ${innerEnd.x},${innerEnd.y}
          Z`;
}

function donutRingPath(cx, cy, outerR, innerR) {
  return `M${cx - outerR},${cy}
          A${outerR},${outerR} 0 1,0 ${cx + outerR},${cy}
          A${outerR},${outerR} 0 1,0 ${cx - outerR},${cy}
          Z
          M${cx - innerR},${cy}
          A${innerR},${innerR} 0 1,1 ${cx + innerR},${cy}
          A${innerR},${innerR} 0 1,1 ${cx - innerR},${cy}
          Z`;
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
  const outerR = size / 2 - 4;
  const innerR = outerR * INNER_RADIUS_RATIO;

  let cursor = 0;
  const arcs = visible.map((s) => {
    const fraction = s.value / total;
    const startAngle = cursor * 360;
    cursor += fraction;
    const endAngle = cursor * 360;
    return { ...s, startAngle, endAngle, fraction };
  });

  const largestArc = arcs.reduce((max, a) => (a.value > max.value ? a : max), arcs[0]);
  const displayedArc = arcs.find((a) => a.key === hovered) ?? largestArc;

  return (
    <div className="w-full">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center">
        <div className="relative w-full max-w-[240px]">
          <svg viewBox={`0 0 ${size} ${size}`} className="block w-full" role="img" aria-label="Donut chart">
            {arcs.map((arc) => {
              const isHovered = hovered === arc.key;
              const color = arc[theme === "dark" ? "dark" : "light"];
              const isFullCircle = arc.endAngle - arc.startAngle >= 359.999;
              const sharedProps = {
                fill: color,
                fillRule: "evenodd",
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
              const midAngle = (arc.startAngle + arc.endAngle) / 2;
              const labelPos = polarToCartesian(cx, cy, (outerR + innerR) / 2, midAngle);
              const showLabel = arc.fraction >= 0.08;
              return (
                <g key={arc.key}>
                  <path
                    d={
                      isFullCircle
                        ? donutRingPath(cx, cy, outerR, innerR)
                        : donutSlicePath(cx, cy, outerR, innerR, arc.startAngle, arc.endAngle)
                    }
                    {...sharedProps}
                  />
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

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="max-w-[70%] truncate text-xs text-slate-500 dark:text-slate-400">{displayedArc.label}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{formatValue(displayedArc.value)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{Math.round(displayedArc.fraction * 100)}%</p>
          </div>
        </div>

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
    </div>
  );
}
