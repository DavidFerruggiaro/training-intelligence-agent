import { useState, useEffect, useCallback, useRef } from "react";
import { fetchBiometrics, streamSSE, toolLabel } from "../lib/api";
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
  // Trigger recommendation
  // ------------------------------------------------------------------
  const getRecommendation = useCallback(async (goals) => {
    // Reset state
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
            // Extract citations from research tool
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
      {/* Header */}
      <header className="border-b border-border px-4 sm:px-6 lg:px-8 py-5 bg-surface/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-[1000px] mx-auto flex items-center justify-between">
          <h1 className="text-lg font-medium tracking-tight">
            Training Intelligence
          </h1>
          <div className="flex items-center gap-4">
            {biometrics?.data?.length > 0 && (() => {
              const [y, m, d] = biometrics.data.at(-1).date.split("-").map(Number);
              const label = new Date(y, m - 1, d).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              });
              return (
                <span className="text-[11px] text-secondary tracking-widest uppercase hidden sm:inline-block">
                  Last updated: {label}
                </span>
              );
            })()}
            <button 
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="px-4 py-2 text-xs font-medium bg-surface-raised border border-border rounded-full hover:bg-card-hover hover:border-border-light transition-all flex items-center gap-2 shadow-sm"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Chat
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        <RecommendationCard
          text={recText}
          steps={recSteps}
          isStreaming={recStreaming}
          isDone={recDone}
          error={recError}
          onGenerate={getRecommendation}
          onCancel={cancelRecommendation}
        />

        <BiometricCharts
          data={biometrics?.data || []}
          loading={bioLoading}
          error={bioError}
        />

        {recCitations.length > 0 && (
          <CitationPanel citations={recCitations} />
        )}
      </main>

      {/* Chat Slide-out Panel */}
      {isChatOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setIsChatOpen(false)}
          />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[450px] bg-surface border-l border-border z-50 animate-slide-in-right shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col">
            <div className="px-5 py-5 border-b border-border flex items-center justify-between bg-surface-raised/30">
              <h2 className="text-sm font-medium tracking-widest uppercase text-primary">
                Agent Chat
              </h2>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="text-secondary hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-raised"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
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
