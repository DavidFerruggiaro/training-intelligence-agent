/**
 * HrvCard — self-contained HRV trend card.
 *
 * Shows current HRV as a big number, sub-stats (7-day avg, resting HR),
 * and a 14-day area chart with a dashed 7-day average overlay.
 */

import { useMemo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AXIS_STYLE = {
  fontSize: 11,
  fill: "var(--color-muted)",
  fontFamily: "var(--font-sans)",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HrvCard({ data }) {
  const { latest, trend, chartData } = useMemo(() => {
    if (!data?.length) return {};

    const latest = data.at(-1);
    const prev = data.length > 1 ? data.at(-2) : null;

    let trend = null;
    if (latest.hrv != null && prev?.hrv != null && prev.hrv !== 0) {
      trend = Math.round(((latest.hrv - prev.hrv) / prev.hrv) * 100);
    }

    // Last 14 days for area chart
    const chartData = data.slice(-14).map((d) => ({
      date: d.date,
      hrv: d.hrv,
      hrv_7d: d.hrv_7d,
    }));

    return { latest, trend, chartData };
  }, [data]);

  if (!latest) return null;

  return (
    <div className="rounded-[var(--radius-lg)] border border-[rgba(0,179,119,0.15)] bg-[rgba(0,179,119,0.08)] p-5 animate-fade-in glow-hrv flex flex-col">
      {/* Header */}
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-4">HRV Trend</h3>

      {/* Big number + trend */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-[2.5rem] font-extrabold leading-none tabular-nums font-mono text-accent">
          {latest.hrv != null ? Math.round(latest.hrv) : "—"}
        </span>
        <span className="text-sm font-medium text-secondary">ms</span>
        {trend != null && (
          <span className={`text-xs font-medium tabular-nums flex items-center gap-0.5 ml-1 ${trend >= 0 ? "text-accent" : "text-danger"}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend >= 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>

      {/* Sub-stats */}
      <p className="text-xs text-secondary mb-4">
        {latest.hrv_7d != null && (
          <span>7d avg: <span className="font-medium text-primary tabular-nums">{Math.round(latest.hrv_7d)}ms</span></span>
        )}
        {latest.resting_hr != null && (
          <span className="ml-3">RHR: <span className="font-medium text-primary tabular-nums">{Math.round(latest.resting_hr)} bpm</span></span>
        )}
      </p>

      {/* 14-day area chart */}
      {chartData?.length > 0 && (
        <div className="mt-auto pt-2">
          <ResponsiveContainer width="100%" height={130}>
            <AreaChart data={chartData} margin={{ top: 5, right: 4, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="hrvGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-accent-dim)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--color-accent-dim)" stopOpacity={0} />
                </linearGradient>
                <filter id="hrvGlow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid stroke="var(--color-chart-baseline)" strokeOpacity={0.3} vertical={false} />
              <XAxis
                dataKey="date"
                tick={AXIS_STYLE}
                tickFormatter={(v) => v.slice(5)}
                axisLine={false}
                tickLine={false}
                dy={8}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-panel border border-border-light rounded-[var(--radius-md)] px-3 py-2.5 shadow-xl">
                      <p className="text-[10px] uppercase tracking-widest text-muted mb-1.5">{label}</p>
                      {payload.map((entry) => (
                        <p key={entry.dataKey} className="text-xs leading-relaxed" style={{ color: entry.color }}>
                          {entry.name}: <span className="font-semibold text-primary tabular-nums">{entry.value != null ? Math.round(entry.value) : "—"}</span>
                        </p>
                      ))}
                    </div>
                  );
                }}
                cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="hrv"
                name="HRV"
                stroke="var(--color-accent-dim)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#hrvGradient)"
                activeDot={{ r: 4, strokeWidth: 0, fill: "var(--color-accent)" }}
                filter="url(#hrvGlow)"
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="hrv_7d"
                name="7d avg"
                stroke="var(--color-chart-baseline)"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
