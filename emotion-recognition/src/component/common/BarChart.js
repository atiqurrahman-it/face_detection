import { useMemo, useState } from "react";
import { useTheme } from "../../context/ThemeContext";

const CHROME = {
  gridline: { light: "#e1e0d9", dark: "#2c2c2a" },
  axis: { light: "#c3c2b7", dark: "#383835" },
  muted: { light: "#898781", dark: "#898781" },
};

const BAR_MAX_THICKNESS = 24;
const BAR_RADIUS = 4;
const BAR_GAP = 2;

function niceStep(rawStep) {
  if (rawStep <= 0) return 1;
  const exponent = Math.floor(Math.log10(rawStep));
  const fraction = rawStep / 10 ** exponent;
  let niceFraction;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;
  return niceFraction * 10 ** exponent;
}

function niceTicks(maxValue, tickCount = 4) {
  if (maxValue <= 0) return [0, 1, 2, 3, 4];
  const step = niceStep(maxValue / tickCount);
  const niceMax = Math.ceil(maxValue / step) * step;
  const ticks = [];
  for (let v = 0; v <= niceMax + 1e-9; v += step) ticks.push(Math.round(v));
  return ticks;
}

function topRoundedRectPath(x, width, yTop, yBottom, radius) {
  const height = yBottom - yTop;
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  if (r === 0) {
    return `M${x},${yBottom} L${x},${yTop} L${x + width},${yTop} L${x + width},${yBottom} Z`;
  }
  return `M${x},${yBottom}
          L${x},${yTop + r}
          Q${x},${yTop} ${x + r},${yTop}
          L${x + width - r},${yTop}
          Q${x + width},${yTop} ${x + width},${yTop + r}
          L${x + width},${yBottom}
          Z`;
}

/**
 * data: [{ label: string, values: { [seriesKey]: number } }]
 * series: [{ key: string, label: string, light: string, dark: string }]
 */
export default function BarChart({ data, series, height = 240, formatValue = (v) => v.toLocaleString() }) {
  const { theme } = useTheme();
  const [hovered, setHovered] = useState(null);
  const width = 640;
  const marginTop = 12;
  const marginRight = 12;
  const marginBottom = 28;
  const marginLeft = 40;

  const plotWidth = width - marginLeft - marginRight;
  const plotHeight = height - marginTop - marginBottom;

  const maxValue = useMemo(
    () => Math.max(0, ...data.flatMap((d) => series.map((s) => d.values[s.key] ?? 0))),
    [data, series]
  );
  const ticks = useMemo(() => niceTicks(maxValue), [maxValue]);
  const axisMax = ticks[ticks.length - 1] || 1;

  const yFor = (value) => marginTop + plotHeight - (value / axisMax) * plotHeight;

  const bandWidth = data.length > 0 ? plotWidth / data.length : 0;
  const seriesCount = series.length;
  const barSlot = Math.min(BAR_MAX_THICKNESS, (bandWidth - BAR_GAP * (seriesCount + 1)) / seriesCount);

  const chrome = (role) => CHROME[role][theme === "dark" ? "dark" : "light"];

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Bar chart">
        {ticks.map((tick) => {
          const y = yFor(tick);
          return (
            <g key={tick}>
              <line
                x1={marginLeft}
                x2={width - marginRight}
                y1={y}
                y2={y}
                stroke={chrome("gridline")}
                strokeWidth={1}
              />
              <text x={marginLeft - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize="10" fill={chrome("muted")}>
                {tick.toLocaleString()}
              </text>
            </g>
          );
        })}
        <line
          x1={marginLeft}
          x2={width - marginRight}
          y1={marginTop + plotHeight}
          y2={marginTop + plotHeight}
          stroke={chrome("axis")}
          strokeWidth={1}
        />

        {data.map((d, dataIndex) => {
          const bandX = marginLeft + dataIndex * bandWidth;
          const groupWidth = barSlot * seriesCount + BAR_GAP * (seriesCount - 1);
          const groupStart = bandX + (bandWidth - groupWidth) / 2;

          return (
            <g key={d.label}>
              {series.map((s, seriesIndex) => {
                const value = d.values[s.key] ?? 0;
                const x = groupStart + seriesIndex * (barSlot + BAR_GAP);
                const yTop = yFor(value);
                const yBottom = marginTop + plotHeight;
                const key = `${dataIndex}-${s.key}`;
                const isHovered = hovered === key;
                return (
                  <g key={s.key}>
                    {value > 0 && (
                      <path
                        d={topRoundedRectPath(x, barSlot, yTop, yBottom, BAR_RADIUS)}
                        fill={s[theme === "dark" ? "dark" : "light"]}
                        opacity={isHovered ? 0.85 : 1}
                      />
                    )}
                    <rect
                      x={x}
                      y={marginTop}
                      width={Math.max(barSlot, 1)}
                      height={plotHeight}
                      fill="transparent"
                      tabIndex={0}
                      role="img"
                      aria-label={`${d.label}, ${s.label}: ${formatValue(value)}`}
                      onMouseEnter={() => setHovered(key)}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered(key)}
                      onBlur={() => setHovered(null)}
                      style={{ cursor: "pointer", outline: "none" }}
                    />
                  </g>
                );
              })}
              <text
                x={bandX + bandWidth / 2}
                y={height - marginBottom + 16}
                textAnchor="middle"
                fontSize="10"
                fill={chrome("muted")}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {hovered != null && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800">
          {(() => {
            const [dataIndexStr, seriesKey] = hovered.split("-");
            const d = data[Number(dataIndexStr)];
            const s = series.find((item) => item.key === seriesKey);
            if (!d || !s) return null;
            return (
              <>
                <span className="font-semibold text-slate-900 dark:text-white">{formatValue(d.values[s.key] ?? 0)}</span>
                <span className="ml-2 text-slate-500 dark:text-slate-400">
                  {s.label} — {d.label}
                </span>
              </>
            );
          })()}
        </div>
      )}

      {series.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-4">
          {series.map((s) => (
            <div key={s.key} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: s[theme === "dark" ? "dark" : "light"] }}
              />
              {s.label}
            </div>
          ))}
        </div>
      )}

      <table className="sr-only">
        <caption>Chart data</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            {series.map((s) => (
              <th scope="col" key={s.key}>
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              {series.map((s) => (
                <td key={s.key}>{d.values[s.key] ?? 0}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
