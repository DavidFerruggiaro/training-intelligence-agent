import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { fetchBiometrics, streamSSE, toolLabel } from "../lib/api";
import { MessageSquare, X, Activity } from "lucide-react";
import RecommendationCard from "./RecommendationCard";
import BiometricCharts from "./BiometricCharts";
import ChatInterface from "./ChatInterface";
import CitationPanel from "./CitationPanel";

// ---------------------------------------------------------------------------
// Dashboard — main layout
// ---------------------------------------------------------------------------

export default function Dashboard() {
  // Biometric chart data
  const [biometrics, setBiometrics] = useState(null);
  const [bioLoading, setBioLoading] = useState(true);
  const [bioError, setBioError] = useState(null);

  // Chat panel state
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Recommendation stream state
  const [recText, setRecText] = useState("");
  const [recSteps, setRecSteps] = useState([]);
  const [recCitations, setRecCitations] = useState([]);
  const [recStreaming, setRecStreaming] = useState(false);
  const [recDone, setRecDone] = useState(false);
  const [recError, setRecError] = useState(null);
  const abortRef = useRef(null);

  // ------------------------------------------------------------------
  // Load biometrics on mount
  // ------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchBiometrics(30);
        if (!cancelled) setBiometrics(data);
      } catch (err) {
        if (!cancelled) setBioError(err.message);
      } finally {
        if (!cancelled) setBioLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ------------------------------------------------------------------
  // Compute metric summaries from biometric data
  // ------------------------------------------------------------------
  const metrics = useMemo(() => {
    if (!biometrics?.data?.length) return null;
    const data = biometrics.data;
    const latest = data.at(-1);
    const prev = data.length > 1 ? data.at(-2) : null;

    const pctChange = (curr, old) => {
      if (!old || old === 0) return null;
      return ((curr - old) / old * 100).toFixed(1);
    };

    const totalSleep = (d) => (d.deep_sleep_hours || 0) + (d.rem_sleep_hours || 0) + (d.light_sleep_hours || 0);
    const latestSleep = totalSleep(latest);
    const prevSleep = prev ? totalSleep(prev) : null;
    const sleepH = Math.floor(latestSleep);
    const sleepM = Math.round((latestSleep - sleepH) * 60);

    return {
      recovery: {
        value: latest.recovery_score ?? latest.hrv_rmssd ?? "—",
        unit: latest.recovery_score != null ? "%" : "ms",
        label: latest.recovery_score != null ? "Recovery" : "HRV",
        change: prev ? pctChange(
          latest.recovery_score ?? latest.hrv_rmssd,
          prev.recovery_score ?? prev.hrv_rmssd
        ) : null,
        color: "accent",
      },
      strain: {
        value: latest.strain_score ?? latest.training_load ?? "—",
        unit: "",
        label: latest.strain_score != null ? "Strain" : "Training Load",
        change: prev ? pctChange(
          latest.strain_score ?? latest.training_load,
          prev.strain_score ?? prev.training_load
        ) : null,
        color: "warning",
      },
      sleep: {
        value: `${sleepH}h${sleepM.toString().padStart(2, "0")}m`,
        unit: "",
        label: "Sleep",
        change: prevSleep ? pctChange(latestSleep, prevSleep) : null,
        color: "blue",
      },
    };
  }, [biometrics]);

  // ------------------------------------------------------------------
  // Format last-updated date
  // ------------------------------------------------------------------
  const lastUpdated = useMemo(() => {
    if (!biometrics?.data?.length) return null;
    const [y, m, d] = biometrics.data.at(-1).date.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  }, [biometrics]);

  // ------------------------------------------------------------------
  // Trigger recommendation
  // ------------------------------------------------------------------
  const getRecommendation = useCallback(async (goals) => {
    setRecText("");
    setRecSteps([]);
    setRecCitations([]);
    setRecStreaming(true);
    setRecDone(false);
    setRecError(null);

    const controller = new AbortController();
    abortRef.current = controller;
    let sawDone = false;
    let sawError = false;

    try {
      console.log("[Dashboard] Starting recommendation stream");
      for await (const { event, data } of streamSSE(
        "/api/recommend",
        { goals: goals || null },
        controller.signal,
      )) {
        console.log("[Dashboard] Event:", event, event === "text_delta" ? `"${data.text?.slice(0, 50)}"` : data);
        switch (event) {
          case "text_delta":
            setRecText((prev) => prev + data.text);
            break;
          case "tool_start":
            console.log("[Dashboard] Tool starting:", data.tool);
            setRecSteps((prev) => [
              ...prev,
              { status: "running", tool: data.tool, input: data.input, label: toolLabel(data.tool, data.input) },
            ]);
            break;
          case "tool_result":
            console.log("[Dashboard] Tool finished:", data.tool);
            setRecSteps((prev) => {
              const updated = [...prev];
              const idx = updated.findLastIndex((s) => s.tool === data.tool && s.status === "running");
              if (idx !== -1) updated[idx] = { ...updated[idx], status: "done", output: data.output };
              return updated;
            });
            if (data.tool === "search_research" && data.output?.findings) {
              setRecCitations((prev) => [...prev, ...data.output.findings]);
            }
            break;
          case "done":
            console.log("[Dashboard] Stream done:", data);
            sawDone = true;
            setRecDone(true);
            break;
          case "error":
            console.error("[Dashboard] Stream error:", data);
            sawError = true;
            setRecError(data.error || "An unknown error occurred.");
            break;
          default:
            console.warn("[Dashboard] Unknown event type:", event, data);
        }
      }
      console.log("[Dashboard] Stream iteration complete");
    } catch (err) {
      if (err.name !== "AbortError") {
        setRecError(err.message);
      }
    } finally {
      if (!controller.signal.aborted && !sawDone && !sawError) {
        setRecError("Stream ended unexpectedly before completion.");
      }
      setRecStreaming(false);
    }
  }, []);

  const cancelRecommendation = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-surface text-primary relative overflow-x-hidden">
      {/* ── Header ── */}
      <header className="border-b border-border bg-surface/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-accent" />
            <h1 className="text-base font-semibold tracking-tight">
              Training Intelligence
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <span className="text-[11px] text-muted tracking-widest uppercase hidden sm:inline-block">
                {lastUpdated}
              </span>
            )}
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="px-4 py-2 text-xs font-medium bg-card border border-border rounded-[var(--radius-md)] hover:bg-card-hover hover:border-border-light transition-colors duration-150 flex items-center gap-2 cursor-pointer active:scale-[0.97]"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ── Metric Summary Cards ── */}
        {metrics && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger">
            <MetricCard {...metrics.recovery} />
            <MetricCard {...metrics.strain} />
            <MetricCard {...metrics.sleep} />
          </div>
        )}

        {/* ── Charts ── */}
        <BiometricCharts
          data={biometrics?.data || []}
          loading={bioLoading}
          error={bioError}
        />

        {/* ── AI Recommendations ── */}
        <RecommendationCard
          text={recText}
          steps={recSteps}
          isStreaming={recStreaming}
          isDone={recDone}
          error={recError}
          onGenerate={getRecommendation}
          onCancel={cancelRecommendation}
        />

        {/* ── Citations ── */}
        {recCitations.length > 0 && (
          <CitationPanel citations={recCitations} />
        )}
      </main>

      {/* ── Chat Slide-out Panel ── */}
      {isChatOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setIsChatOpen(false)}
          />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-surface border-l border-border z-50 animate-slide-in-right shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col">
            <div className="px-5 h-16 border-b border-border flex items-center justify-between bg-panel">
              <h2 className="text-sm font-semibold tracking-wide uppercase text-primary">
                Agent Chat
              </h2>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-muted hover:text-primary transition-colors duration-150 p-2 rounded-[var(--radius-md)] hover:bg-card cursor-pointer active:scale-[0.97]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatInterface />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MetricCard — top-level KPI display
// ---------------------------------------------------------------------------

const colorMap = {
  accent: {
    text: "text-accent",
    glow: "glow-recovery",
    border: "border-accent/15",
    bg: "bg-accent-subtle",
  },
  warning: {
    text: "text-warning",
    glow: "glow-strain",
    border: "border-warning/15",
    bg: "bg-warning/[0.04]",
  },
  blue: {
    text: "text-blue",
    glow: "",
    border: "border-blue/15",
    bg: "bg-blue/[0.04]",
  },
};

function MetricCard({ value, unit, label, change, color }) {
  const c = colorMap[color] || colorMap.accent;
  const changeNum = change !== null ? parseFloat(change) : null;

  return (
    <div className={`rounded-[var(--radius-lg)] border ${c.border} ${c.bg} p-5 animate-fade-in ${c.glow}`}>
      <p className="text-xs font-medium text-muted uppercase tracking-wider mb-3">{label}</p>
      <p className={`text-[2rem] font-extrabold leading-none tracking-tight tabular-nums ${c.text}`}>
        {value}
        {unit && <span className="text-base font-semibold ml-1 text-secondary">{unit}</span>}
      </p>
      {changeNum !== null && (
        <p className={`text-sm mt-2 font-medium tabular-nums ${changeNum >= 0 ? "text-accent" : "text-danger"}`}>
          {changeNum >= 0 ? "+" : ""}{change}%
          <span className="text-muted font-normal ml-1.5">vs yesterday</span>
        </p>
      )}
    </div>
  );
}
