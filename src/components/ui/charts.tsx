import { cn } from "@/lib/cn";

/**
 * Graficos livianos en SVG/CSS, sin dependencias de cliente.
 * Se renderizan en el servidor y no requieren JavaScript.
 */

export function BarChart({
  data,
  height = 160,
  formatValue = (n: number) => String(n),
  emptyLabel = "Sin datos para mostrar",
}: {
  data: Array<{ label: string; value: number; hint?: string }>;
  height?: number;
  formatValue?: (value: number) => string;
  emptyLabel?: string;
}) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-ink-400">{emptyLabel}</p>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div>
      <div
        className="flex items-end gap-2 sm:gap-3"
        style={{ height }}
        role="img"
        aria-label="Gráfico de barras"
      >
        {data.map((item) => {
          const pct = Math.max(2, Math.round((item.value / max) * 100));
          return (
            <div
              key={item.label}
              className="group flex h-full min-w-0 flex-1 flex-col justify-end"
              title={`${item.label}: ${formatValue(item.value)}${item.hint ? ` · ${item.hint}` : ""}`}
            >
              <span className="mb-1 truncate text-center text-[10px] font-medium text-ink-500">
                {item.value > 0 ? formatValue(item.value) : ""}
              </span>
              <div
                className="rounded-t-md bg-brand-500/85 transition-colors group-hover:bg-brand-600"
                style={{ height: `${pct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2 sm:gap-3">
        {data.map((item) => (
          <p
            key={item.label}
            className="min-w-0 flex-1 truncate text-center text-[11px] text-ink-500"
          >
            {item.label}
          </p>
        ))}
      </div>
    </div>
  );
}

const DONUT_COLORS = [
  "#0f7c69",
  "#45b89e",
  "#84cc16",
  "#f59e0b",
  "#ef4444",
  "#6366f1",
  "#0891b2",
  "#a855f7",
];

export function DonutChart({
  data,
  total,
  centerLabel,
  size = 168,
}: {
  data: Array<{ label: string; value: number }>;
  total?: number;
  centerLabel?: string;
  size?: number;
}) {
  const sum = total ?? data.reduce((acc, d) => acc + d.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  if (sum === 0) {
    return (
      <div className="flex items-center gap-4">
        <div
          className="relative flex items-center justify-center rounded-full bg-ink-100"
          style={{ width: size, height: size }}
        >
          <span className="text-xs text-ink-400">Sin datos</span>
        </div>
      </div>
    );
  }

  let offset = 0;
  const segments = data.map((item, index) => {
    const fraction = item.value / sum;
    const segment = {
      ...item,
      color: DONUT_COLORS[index % DONUT_COLORS.length],
      dash: fraction * circumference,
      offset,
      pct: Math.round(fraction * 100),
    };
    offset += fraction * circumference;
    return segment;
  });

  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="-rotate-90"
        role="img"
        aria-label="Gráfico de distribución"
      >
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#eceef2" strokeWidth="12" />
        {segments.map((segment) => (
          <circle
            key={segment.label}
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth="12"
            strokeDasharray={`${segment.dash} ${circumference - segment.dash}`}
            strokeDashoffset={-segment.offset}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: segment.color }}
            />
            <span className="min-w-0 flex-1 truncate text-ink-600">{segment.label}</span>
            <span className="font-medium text-ink-900">{segment.value}</span>
            <span className="w-9 text-right text-ink-400">{segment.pct}%</span>
          </li>
        ))}
        {centerLabel ? (
          <li className="pt-1 text-[11px] text-ink-400">{centerLabel}</li>
        ) : null}
      </ul>
    </div>
  );
}

export function AreaChart({
  points,
  height = 180,
  formatValue = (n: number) => String(n),
}: {
  points: Array<{ label: string; value: number }>;
  height?: number;
  formatValue?: (value: number) => string;
}) {
  if (points.length === 0) {
    return <p className="py-8 text-center text-sm text-ink-400">Sin datos para mostrar</p>;
  }

  const width = 600;
  const padding = 8;
  const max = Math.max(...points.map((p) => p.value), 1);
  const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

  const coords = points.map((point, index) => ({
    x: padding + index * stepX,
    y: height - padding - (point.value / max) * (height - padding * 2 - 18),
    ...point,
  }));

  const line = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const area = `${padding},${height - padding} ${line} ${padding + (points.length - 1) * stepX},${height - padding}`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Evolución mensual"
      >
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f7c69" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#0f7c69" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1={padding}
            x2={width - padding}
            y1={height - padding - ratio * (height - padding * 2 - 18)}
            y2={height - padding - ratio * (height - padding * 2 - 18)}
            stroke="#eceef2"
            strokeDasharray="4 4"
          />
        ))}
        <polygon points={area} fill="url(#areaFill)" />
        <polyline
          points={line}
          fill="none"
          stroke="#0f7c69"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {coords.map((c) => (
          <circle key={c.label} cx={c.x} cy={c.y} r="3" fill="#0f7c69" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between gap-1">
        {points.map((point) => (
          <div key={point.label} className="min-w-0 text-center">
            <p className="truncate text-[11px] text-ink-500">{point.label}</p>
            <p className={cn("money text-[10px] font-medium text-ink-700")}>
              {formatValue(point.value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProgressBar({
  value,
  max,
  tone = "brand",
  label,
}: {
  value: number;
  max: number;
  tone?: "brand" | "warning" | "danger" | "success";
  label?: string;
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  const tones = {
    brand: "bg-brand-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    success: "bg-emerald-500",
  } as const;

  return (
    <div>
      {label ? (
        <div className="mb-1 flex justify-between text-xs text-ink-500">
          <span>{label}</span>
          <span className="font-medium text-ink-700">{pct}%</span>
        </div>
      ) : null}
      <div className="h-2 overflow-hidden rounded-full bg-ink-100">
        <div className={cn("h-full rounded-full", tones[tone])} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
