/**
 * StrainCard — self-contained strain metric card.
 *
 * Shows today's strain as a big number, workout sub-stats,
 * and a 7-day bar chart with today's bar highlighted.
 */

import { useMemo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, Cell } from "recharts";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function formatRelativeDate(dateStr, latestDateStr) {
  if (dateStr === latestDateStr) return null; // today, no label needed
  const d = new Date(dateStr + "T00:00:00");
  const latest = new Date(latestDateStr + "T00:00:00");
  const diffDays = Math.round((latest - d) / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function StrainCard({ data }) {
  const { strainEntry, strainDateLabel, trend, barData, workouts, workoutTypes } = useMemo(() => {
    if (!data?.length) return {};

    const latestDate = data.at(-1).date;

    // Find most recent day with strain data
    let strainEntry = null;
    for (let i = data.length - 1; i >= 0; i--) {
      const val = data[i].day_strain ?? data[i].strain_score;
      if (val != null) {
        strainEntry = data[i];
        break;
      }
    }

    // Find the day before strainEntry for trend calc
    let trend = null;
    if (strainEntry) {
      const idx = data.indexOf(strainEntry);
      if (idx > 0) {
        const prevVal = data[idx - 1].day_strain ?? data[idx - 1].strain_score;
        const currVal = strainEntry.day_strain ?? strainEntry.strain_score;
        if (prevVal != null && prevVal !== 0) {
          trend = Math.round(((currVal - prevVal) / prevVal) * 100);
        }
      }
    }

    const strainDateLabel = strainEntry ? formatRelativeDate(strainEntry.date, latestDate) : null;

    // Use strainEntry's day for workouts (the day with actual data)
    const entry = strainEntry || data.at(-1);
    const workouts = entry.num_workouts ?? 0;
    const workoutTypes = entry.workout_types || "";

    // Last 7 days for bar chart
    const barData = data.slice(-7).map((d, i, arr) => {
      const dayLabel = new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }).charAt(0);
      return {
        day: dayLabel,
        strain: d.day_strain ?? d.strain_score ?? 0,
        isToday: i === arr.length - 1,
      };
    });

    return { strainEntry, strainDateLabel, trend, barData, workouts, workoutTypes };
  }, [data]);

  if (!data?.length) return null;

  const strain = strainEntry ? (strainEntry.day_strain ?? strainEntry.strain_score) : null;

  return (
    <div className="rounded-[var(--radius-lg)] border border-warning/15 bg-[rgba(245,158,11,0.08)] p-5 animate-fade-in glow-strain flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Strain</h3>
        {strainDateLabel && (
          <span className="text-[10px] font-medium text-muted uppercase tracking-wider">{strainDateLabel}</span>
        )}
      </div>

      {/* Big number + trend */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-[2.5rem] font-extrabold leading-none tabular-nums font-mono text-warning">
          {strain != null ? strain.toFixed(1) : "—"}
        </span>
        {trend != null && (
          <span className={`text-xs font-medium tabular-nums flex items-center gap-0.5 ${trend >= 0 ? "text-accent" : "text-danger"}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend >= 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>

      {/* Sub-stats */}
      <p className="text-xs text-secondary mb-5">
        {workouts > 0 ? (
          <>
            <span className="font-medium text-primary">{workouts}</span>
            {" workout"}{workouts !== 1 ? "s" : ""}
            {workoutTypes && <span className="text-muted"> · {workoutTypes}</span>}
          </>
        ) : (
          <span className="text-muted">No workouts recorded</span>
        )}
      </p>

      {/* 7-day bar chart */}
      {barData?.length > 0 && (
        <div className="mt-auto pt-2">
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={barData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }} barCategoryGap="20%">
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "var(--color-muted)", fontFamily: "var(--font-sans)" }}
                dy={6}
              />
              <Bar dataKey="strain" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {barData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.isToday ? "var(--color-chart-strain)" : "rgba(245,158,11,0.3)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
