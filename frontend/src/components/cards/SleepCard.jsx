/**
 * SleepCard — self-contained sleep metric card.
 *
 * Shows total sleep duration, a circular ring for sleep efficiency,
 * a sleep-stage legend, and a 7-day stacked bar chart.
 */

import { useMemo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis } from "recharts";
import CircularRing from "./CircularRing";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(hrs) {
  if (hrs == null) return "—";
  const h = Math.floor(hrs);
  const m = Math.round((hrs - h) * 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function pctChange(curr, prev) {
  if (curr == null || prev == null || prev === 0) return null;
  return Math.round(((curr - prev) / prev) * 100);
}

const STAGE_COLORS = {
  deep: "var(--color-chart-sleep-deep)",
  rem: "var(--color-chart-sleep-rem)",
  light: "var(--color-chart-sleep-light)",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SleepCard({ data }) {
  const { latest, trend, efficiency, stages, barData } = useMemo(() => {
    if (!data?.length) return {};

    const latest = data.at(-1);
    const prev = data.length > 1 ? data.at(-2) : null;

    const totalSleep = latest.asleep_duration_hrs ?? 0;
    const prevSleep = prev?.asleep_duration_hrs ?? null;
    const trend = pctChange(totalSleep, prevSleep);
    const efficiency = latest.sleep_efficiency;

    const deep = latest.deep_sleep_duration_hrs ?? 0;
    const rem = latest.rem_duration_hrs ?? 0;
    const light = Math.max(0, totalSleep - deep - rem);

    const stages = [
      { label: "Deep", hours: deep, color: STAGE_COLORS.deep },
      { label: "REM", hours: rem, color: STAGE_COLORS.rem },
      { label: "Light", hours: light, color: STAGE_COLORS.light },
    ];

    // Last 7 days for stacked bar chart
    const barData = data.slice(-7).map((d) => {
      const deepH = d.deep_sleep_duration_hrs ?? 0;
      const remH = d.rem_duration_hrs ?? 0;
      const total = d.asleep_duration_hrs ?? 0;
      const lightH = Math.max(0, total - deepH - remH);
      const dayLabel = new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }).charAt(0);
      return { day: dayLabel, deep: deepH, rem: remH, light: lightH };
    });

    return { latest, trend, efficiency, stages, barData };
  }, [data]);

  if (!latest) return null;

  return (
    <div className="rounded-[var(--radius-lg)] border border-[rgba(99,102,241,0.15)] bg-[rgba(99,102,241,0.08)] p-5 animate-fade-in glow-sleep flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Sleep</h3>
        {trend != null && (
          <span className={`text-xs font-medium tabular-nums flex items-center gap-0.5 ${trend >= 0 ? "text-accent" : "text-danger"}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend >= 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>

      {/* Duration + Efficiency ring */}
      <div className="flex items-start justify-between mb-4">
        {/* Left: duration + stage legend */}
        <div className="flex-1">
          <p className="text-[2rem] font-extrabold leading-none tabular-nums text-primary mb-1">
            {formatDuration(latest.asleep_duration_hrs)}
          </p>
          <p className="text-xs text-muted mb-4">Total Sleep</p>

          {/* Stage legend */}
          <div className="space-y-1.5">
            {stages?.map(({ label, hours, color }) => (
              <div key={label} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-secondary w-10">{label}</span>
                <span className="font-medium text-primary tabular-nums">{formatDuration(hours)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: efficiency ring */}
        <div className="flex-shrink-0 ml-4">
          <CircularRing
            value={efficiency ?? 0}
            size={100}
            strokeWidth={7}
            color="var(--color-chart-sleep-deep)"
          >
            <span className="text-xl font-extrabold leading-none tabular-nums text-primary">
              {efficiency != null ? Math.round(efficiency) : "—"}
            </span>
            <span className="text-[10px] font-medium text-secondary mt-0.5">% Eff</span>
          </CircularRing>
        </div>
      </div>

      {/* 7-day stacked bar chart */}
      {barData?.length > 0 && (
        <div className="mt-auto pt-2">
          <ResponsiveContainer width="100%" height={90}>
            <BarChart data={barData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }} barCategoryGap="20%">
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "var(--color-muted)", fontFamily: "var(--font-sans)" }}
                dy={6}
              />
              <Bar dataKey="deep" stackId="sleep" fill={STAGE_COLORS.deep} radius={[0, 0, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="rem" stackId="sleep" fill={STAGE_COLORS.rem} isAnimationActive={false} />
              <Bar dataKey="light" stackId="sleep" fill={STAGE_COLORS.light} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
