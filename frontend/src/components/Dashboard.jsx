import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { fetchBiometrics, streamSSE, toolLabel } from "../lib/api";
import { MessageSquare, X, Activity, Loader2 } from "lucide-react";
import PromptHero from "./PromptHero";
import RecommendationCard from "./RecommendationCard";
import ChatInterface from "./ChatInterface";
import CitationPanel from "./CitationPanel";
import RecoveryCard from "./cards/RecoveryCard";
import StrainCard from "./cards/StrainCard";
import SleepCard from "./cards/SleepCard";
import HrvCard from "./cards/HrvCard";

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
        {/* ── Prompt Hero ── */}
        <PromptHero
          onGenerate={getRecommendation}
          isStreaming={recStreaming}
          onCancel={cancelRecommendation}
        />

        {/* ── Biometric Cards ── */}
        {bioLoading && (
          <div className="rounded-[var(--radius-lg)] border border-border bg-card p-8">
            <div className="flex items-center justify-center gap-2.5 text-sm text-secondary">
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
              Loading biometric data…
            </div>
          </div>
        )}
        {bioError && (
          <div className="rounded-[var(--radius-lg)] border border-border bg-card p-8">
            <p className="text-sm text-danger text-center">{bioError}</p>
          </div>
        )}
        {!bioLoading && !bioError && biometrics?.data?.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 stagger">
            <RecoveryCard data={biometrics.data} />
            <StrainCard data={biometrics.data} />
            <SleepCard data={biometrics.data} />
            <HrvCard data={biometrics.data} />
          </div>
        )}

        {/* ── AI Recommendation output (shown once generation starts) ── */}
        {(recStreaming || recDone || !!recError || !!recText || recSteps.length > 0) && (
          <RecommendationCard
            text={recText}
            steps={recSteps}
            isStreaming={recStreaming}
            isDone={recDone}
            error={recError}
          />
        )}

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
