import { useMemo } from "react";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart,
} from "recharts";

// ---------------------------------------------------------------------------
// Chart theme constants
// ---------------------------------------------------------------------------

const COLORS = {
  recovery: "var(--color-chart-recovery)",
  recoveryDim: "var(--color-accent-dim)",
  strain: "var(--color-chart-strain)",
  heart: "var(--color-chart-heart)",
  deep: "var(--color-chart-sleep-deep)",
  rem: "var(--color-chart-sleep-rem)",
  light: "var(--color-chart-sleep-light)",
  baseline: "var(--color-chart-baseline)",
};

const AXIS_STYLE = {
  fontSize: 11,
  fill: "var(--color-muted)",
  fontFamily: "var(--font-sans)",
};

// ---------------------------------------------------------------------------
// Chart card wrapper
// ---------------------------------------------------------------------------

function ChartCard({ title, children, metric, glowClass = "" }) {
  return (
    <div className={`rounded-[var(--radius-lg)] border border-border bg-card p-5 hover:border-border-light transition-colors duration-200 ${glowClass} animate-fade-in`}>
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
          {title}
        </h3>
      </div>
      {metric && <ChartMetric {...metric} />}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function ChartMetric({ value, unit, trend }) {
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  return (
    <div className="flex items-baseline gap-2 mt-2">
      <span className="text-[1.75rem] font-bold leading-none tracking-tight text-primary tabular-nums">
        {value !== undefined && value !== null ? value : "—"}
      </span>
      {unit && <span className="text-sm font-medium text-secondary">{unit}</span>}
      {trend != null && trend !== 0 && (
        <span className={`text-xs font-medium ml-1 flex items-center gap-0.5 ${trend > 0 ? "text-accent" : "text-danger"}`}>
          <TrendIcon className="w-3 h-3" />
          {Math.abs(trend)}%
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-panel border border-border-light rounded-[var(--radius-md)] px-3 py-2.5 shadow-xl">
      <p className="text-[10px] uppercase tracking-widest text-muted mb-1.5">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-xs leading-relaxed" style={{ color: entry.color }}>
          {entry.name}: <span className="font-semibold text-primary tabular-nums">{entry.value != null ? entry.value : "—"}</span>
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. HRV Trend — area chart with glow
// ---------------------------------------------------------------------------

function HrvChart({ data }) {
  const latestHrv = data.length > 0 ? data[data.length - 1].hrv : undefined;
  const prevHrv = data.length > 1 ? data[data.length - 2].hrv : undefined;
  const hrvTrend = latestHrv && prevHrv ? Math.round(((latestHrv - prevHrv) / prevHrv) * 100) : undefined;

  return (
    <ChartCard
      title="HRV Trend"
      metric={{ value: latestHrv, unit: "ms", trend: hrvTrend }}
      glowClass="glow-recovery"
    >
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id="colorHrv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.recovery} stopOpacity={0.15} />
              <stop offset="95%" stopColor={COLORS.recovery} stopOpacity={0} />
            </linearGradient>
            <filter id="glowHrv">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid stroke={COLORS.baseline} strokeOpacity={0.3} vertical={false} />
          <XAxis dataKey="date" tick={AXIS_STYLE} tickFormatter={(v) => v.slice(5)} axisLine={false} tickLine={false} dy={10} />
          <YAxis tick={AXIS_STYLE} domain={["auto", "auto"]} axisLine={false} tickLine={false} dx={-10} />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="hrv"
            name="HRV"
            stroke={COLORS.recovery}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorHrv)"
            activeDot={{ r: 5, strokeWidth: 0, fill: COLORS.recovery }}
            filter="url(#glowHrv)"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="hrv_7d"
            name="7-day avg"
            stroke={COLORS.recoveryDim}
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={false}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ---------------------------------------------------------------------------
// 2. Sleep Architecture — stacked bar chart
// ---------------------------------------------------------------------------

function SleepChart({ data }) {
  const sleepData = useMemo(
    () =>
      data.map((d) => ({
        date: d.date,
        deep: d.deep_sleep_duration_hrs ?? 0,
        rem: d.rem_duration_hrs ?? 0,
        light: Math.max(
          0,
          (d.asleep_duration_hrs ?? 0) -
            (d.deep_sleep_duration_hrs ?? 0) -
            (d.rem_duration_hrs ?? 0),
        ),
        total: d.asleep_duration_hrs ?? 0,
      })),
    [data],
  );

  const latestSleep = sleepData.length > 0 ? sleepData[sleepData.length - 1].total.toFixed(1) : undefined;
  const prevSleep = sleepData.length > 1 ? sleepData[sleepData.length - 2].total : undefined;
  const sleepTrend = latestSleep && prevSleep ? Math.round(((latestSleep - prevSleep) / prevSleep) * 100) : undefined;

  return (
    <ChartCard
      title="Sleep Architecture"
      metric={{ value: latestSleep, unit: "hrs", trend: sleepTrend }}
    >
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={sleepData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }} barGap={2}>
          <CartesianGrid stroke={COLORS.baseline} strokeOpacity={0.3} vertical={false} />
          <XAxis dataKey="date" tick={AXIS_STYLE} tickFormatter={(v) => v.slice(5)} axisLine={false} tickLine={false} dy={10} />
          <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} dx={-10} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Bar dataKey="deep" name="Deep" stackId="sleep" fill={COLORS.deep} radius={[0, 0, 0, 0]} />
          <Bar dataKey="rem" name="REM" stackId="sleep" fill={COLORS.rem} />
          <Bar dataKey="light" name="Light" stackId="sleep" fill={COLORS.light} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ---------------------------------------------------------------------------
// 3. Strain vs Recovery — scatter plot
// ---------------------------------------------------------------------------

function StrainRecoveryChart({ data }) {
  const scatterData = useMemo(
    () =>
      data
        .filter((d) => d.day_strain != null && d.recovery_score != null)
        .map((d) => ({
          strain: d.day_strain,
          recovery: d.recovery_score,
          date: d.date,
          z: d.day_strain * 10,
        })),
    [data],
  );

  const latestRecovery = data.length > 0 ? data[data.length - 1].recovery_score : undefined;
  const prevRecovery = data.length > 1 ? data[data.length - 2].recovery_score : undefined;
  const recoveryTrend = latestRecovery && prevRecovery ? Math.round(((latestRecovery - prevRecovery) / prevRecovery) * 100) : undefined;

  return (
    <ChartCard
      title="Strain vs Recovery"
      metric={{ value: latestRecovery, unit: "%", trend: recoveryTrend }}
      glowClass="glow-strain"
    >
      <ResponsiveContainer width="100%" height={200}>
        <ScatterChart margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid stroke={COLORS.baseline} strokeOpacity={0.3} vertical={false} />
          <XAxis
            dataKey="strain"
            name="Strain"
            type="number"
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            dy={10}
            domain={[0, 21]}
          />
          <YAxis
            dataKey="recovery"
            name="Recovery %"
            type="number"
            tick={AXIS_STYLE}
            domain={[0, 100]}
            axisLine={false}
            tickLine={false}
            dx={-10}
          />
          <Tooltip
            cursor={{ strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.15)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-panel border border-border-light rounded-[var(--radius-md)] px-3.5 py-2.5 shadow-xl">
                  <p className="text-[10px] uppercase tracking-widest text-muted mb-1.5">{d.date}</p>
                  <div className="space-y-1">
                    <p className="text-xs flex justify-between gap-4">
                      <span className="text-secondary">Strain</span>
                      <span className="font-semibold text-warning tabular-nums">{d.strain}</span>
                    </p>
                    <p className="text-xs flex justify-between gap-4">
                      <span className="text-secondary">Recovery</span>
                      <span className="font-semibold text-accent tabular-nums">{d.recovery}%</span>
                    </p>
                  </div>
                </div>
              );
            }}
          />
          <Scatter
            data={scatterData}
            fill={COLORS.recovery}
            fillOpacity={0.7}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ---------------------------------------------------------------------------
// BiometricCharts — container
// ---------------------------------------------------------------------------

export default function BiometricCharts({ data, loading, error }) {
  if (loading) {
    return (
      <section className="rounded-[var(--radius-lg)] border border-border bg-card p-8">
        <div className="flex items-center justify-center gap-2.5 text-sm text-secondary">
          <Loader2 className="w-4 h-4 animate-spin text-accent" />
          Loading biometric data…
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-[var(--radius-lg)] border border-border bg-card p-8">
        <p className="text-sm text-danger text-center">{error}</p>
      </section>
    );
  }

  if (!data.length) {
    return (
      <section className="rounded-[var(--radius-lg)] border border-border bg-card p-8">
        <p className="text-sm text-muted text-center">No biometric data available.</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-4">
        Biometric Trends — Last {data.length} Days
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 stagger">
        <HrvChart data={data} />
        <SleepChart data={data} />
        <StrainRecoveryChart data={data} />
      </div>
    </section>
  );
}
