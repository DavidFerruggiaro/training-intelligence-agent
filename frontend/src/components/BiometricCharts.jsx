import { useMemo } from "react";
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
  Legend,
  Area,
  AreaChart,
} from "recharts";

// ---------------------------------------------------------------------------
// Chart theme constants
// ---------------------------------------------------------------------------

const COLORS = {
  hrv: "var(--color-chart-hrv)",
  hrvAvg: "var(--color-chart-hrv-avg)",
  deep: "var(--color-chart-deep)",
  rem: "var(--color-chart-rem)",
  light: "var(--color-chart-light)",
  strain: "var(--color-chart-strain)",
  recovery: "var(--color-chart-recovery)",
  grid: "transparent",
  text: "var(--color-secondary)",
};

const AXIS_STYLE = { fontSize: 11, fill: COLORS.text, fontWeight: 500 };

function MetricSummary({ label, value, unit, trend }) {
  return (
    <div className="mb-6 flex items-baseline gap-2">
      <span className="text-4xl font-light tracking-tight text-primary">
        {value !== undefined ? value : "—"}
      </span>
      <span className="text-sm font-medium text-secondary">{unit}</span>
      {trend && (
        <span className={`text-xs font-medium ml-2 flex items-center ${trend > 0 ? 'text-success' : 'text-danger'}`}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
      )}
    </div>
  );
}

function ChartCard({ title, children, metric }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-secondary mb-2">
        {title}
      </h3>
      {metric && (
        <MetricSummary {...metric} />
      )}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-secondary mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: <span className="font-medium text-primary">{entry.value != null ? entry.value : "—"}</span>
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. HRV Trend — line chart
// ---------------------------------------------------------------------------

function HrvChart({ data }) {
  const latestHrv = data.length > 0 ? data[data.length - 1].hrv : undefined;
  const prevHrv = data.length > 1 ? data[data.length - 2].hrv : undefined;
  const hrvTrend = latestHrv && prevHrv ? Math.round(((latestHrv - prevHrv) / prevHrv) * 100) : undefined;

  return (
    <ChartCard 
      title="HRV Trend" 
      metric={{ value: latestHrv, unit: "ms", trend: hrvTrend }}
    >
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id="colorHrv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.hrv} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={COLORS.hrv} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
          <XAxis dataKey="date" tick={AXIS_STYLE} tickFormatter={(v) => v.slice(5)} axisLine={false} tickLine={false} dy={10} />
          <YAxis tick={AXIS_STYLE} domain={["auto", "auto"]} axisLine={false} tickLine={false} dx={-10} />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }} />
          <Area
            type="monotone"
            dataKey="hrv"
            name="HRV"
            stroke={COLORS.hrv}
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorHrv)"
            activeDot={{ r: 6, strokeWidth: 0 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="hrv_7d"
            name="7-day avg"
            stroke={COLORS.hrvAvg}
            strokeWidth={2}
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
  // Compute light sleep = total - deep - REM
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
        <BarChart data={sleepData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
          <XAxis dataKey="date" tick={AXIS_STYLE} tickFormatter={(v) => v.slice(5)} axisLine={false} tickLine={false} dy={10} />
          <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} dx={-10} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
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
          // Size dots by strain intensity
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
    >
      <ResponsiveContainer width="100%" height={200}>
        <ScatterChart margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
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
            cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.2)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-surface-raised border border-border rounded-xl px-4 py-3 shadow-2xl">
                  <p className="text-[11px] uppercase tracking-widest text-secondary mb-2">{d.date}</p>
                  <div className="space-y-1">
                    <p className="text-sm flex justify-between gap-4">
                      <span className="text-secondary">Strain</span>
                      <span className="font-medium text-warning">{d.strain}</span>
                    </p>
                    <p className="text-sm flex justify-between gap-4">
                      <span className="text-secondary">Recovery</span>
                      <span className="font-medium text-success">{d.recovery}%</span>
                    </p>
                  </div>
                </div>
              );
            }}
          />
          <Scatter
            data={scatterData}
            fill={COLORS.recovery}
            fillOpacity={0.8}
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
      <section className="rounded-xl border border-border bg-card p-8">
        <div className="flex items-center justify-center gap-2 text-sm text-secondary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin text-accent">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Loading biometric data…
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-xl border border-border bg-card p-8">
        <p className="text-sm text-danger text-center">{error}</p>
      </section>
    );
  }

  if (!data.length) {
    return (
      <section className="rounded-xl border border-border bg-card p-8">
        <p className="text-sm text-secondary text-center">No biometric data available.</p>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="text-xs font-medium uppercase tracking-widest text-secondary mb-4 px-1">
        Biometric Trends — Last {data.length} Days
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <HrvChart data={data} />
        <SleepChart data={data} />
        <StrainRecoveryChart data={data} />
      </div>
    </section>
  );
}
