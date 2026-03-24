/**
 * RecoveryCard — self-contained recovery metric card.
 *
 * Shows recovery score in a circular ring, a status label,
 * recovery factor pills (sleep / HRV / strain), and a 7-day
 * mini sparkline at the bottom.
 */

import { useMemo } from "react";
import { Moon, Heart, Zap, TrendingUp, TrendingDown } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import CircularRing from "./CircularRing";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusFromScore(score) {
  if (score == null) return { label: "No Data", color: "text-muted" };
  if (score >= 67) return { label: "Ready to Train", color: "text-accent" };
  if (score >= 34) return { label: "Moderate", color: "text-warning" };
  return { label: "Rest", color: "text-danger" };
}

function pctChange(curr, prev) {
  if (curr == null || prev == null || prev === 0) return null;
  return Math.round(((curr - prev) / prev) * 100);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RecoveryCard({ data }) {
  const {
    latest,
    trend,
    status,
    factors,
    sparkData,
  } = useMemo(() => {
    if (!data?.length) return {};

    const latest = data.at(-1);
    const prev = data.length > 1 ? data.at(-2) : null;
    const score = latest.recovery_score;
    const trend = pctChange(score, prev?.recovery_score);
    const status = statusFromScore(score);

    // Recovery factor pills
    const totalSleep = (latest.asleep_duration_hrs ?? 0);
    const sleepH = Math.floor(totalSleep);
    const sleepM = Math.round((totalSleep - sleepH) * 60);

    const factors = [
      { icon: Moon, label: "Sleep", value: `${sleepH}h${sleepM.toString().padStart(2, "0")}m` },
      { icon: Heart, label: "HRV", value: latest.hrv != null ? `${Math.round(latest.hrv)}ms` : "—" },
      { icon: Zap, label: "Strain", value: latest.day_strain != null ? latest.day_strain.toFixed(1) : "—" },
    ];

    // Last 7 days for sparkline
    const sparkData = data.slice(-7).map((d) => ({
      date: d.date,
      recovery: d.recovery_score ?? 0,
    }));

    return { latest, trend, status, factors, sparkData };
  }, [data]);

  if (!latest) return null;

  const score = latest.recovery_score;

  return (
    <div className="rounded-[var(--radius-lg)] border border-accent/15 bg-[rgba(0,241,159,0.08)] p-5 animate-fade-in glow-recovery flex flex-col">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Recovery</h3>
        {trend != null && (
          <span className={`text-xs font-medium tabular-nums flex items-center gap-0.5 ${trend >= 0 ? "text-accent" : "text-danger"}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend >= 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>

      {/* Ring + status */}
      <div className="flex flex-col items-center gap-2 mb-5">
        <CircularRing
          value={score ?? 0}
          size={120}
          strokeWidth={8}
          color="var(--color-chart-recovery)"
        >
          <span className="text-[2rem] font-extrabold leading-none tabular-nums font-mono text-primary">
            {score != null ? Math.round(score) : "—"}
          </span>
          <span className="text-xs font-medium text-secondary mt-0.5">%</span>
        </CircularRing>
        <span className={`text-sm font-semibold ${status?.color}`}>
          {status?.label}
        </span>
      </div>

      {/* Recovery factors */}
      <div className="flex items-center justify-center gap-4 mb-4">
        {factors?.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-secondary">
            <Icon className="w-3.5 h-3.5 text-muted" />
            <span className="tabular-nums font-medium text-primary">{value}</span>
            <span className="text-muted">{label}</span>
          </div>
        ))}
      </div>

      {/* 7-day sparkline */}
      {sparkData?.length > 0 && (
        <div className="mt-auto pt-2">
          <ResponsiveContainer width="100%" height={50}>
            <AreaChart data={sparkData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="sparkRecovery" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-chart-recovery)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--color-chart-recovery)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="recovery"
                stroke="var(--color-chart-recovery)"
                strokeWidth={1.5}
                fill="url(#sparkRecovery)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
