import { useState } from "react";
import { Check, ChevronDown, AlertCircle } from "lucide-react";
import ResponseRenderer from "./ResponseRenderer";

// ---------------------------------------------------------------------------
// Step timeline item
// ---------------------------------------------------------------------------

function StepItem({ step, isLast }) {
  return (
    <div className="flex gap-3.5 animate-fade-in relative">
      {/* Timeline gutter */}
      <div className="flex flex-col items-center">
        <div className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 z-10
          ${step.status === "done"
            ? "border-accent/30 bg-accent/10"
            : "border-border bg-surface-raised"
          }`}
        >
          {step.status === "done"
            ? <Check className="w-3 h-3 text-accent" />
            : <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />
          }
        </div>
        {!isLast && <div className="absolute top-6 bottom-0 left-[11px] w-px bg-border" />}
      </div>

      {/* Content */}
      <div className="pb-5 min-w-0 pt-0.5">
        <p className={`text-sm ${step.status === "done" ? "text-secondary" : "text-accent animate-pulse-accent"}`}>
          {step.label}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecommendationCard — output only (input lives in PromptHero)
// ---------------------------------------------------------------------------

export default function RecommendationCard({
  text,
  steps,
  isStreaming,
  isDone,
  error,
}) {
  const [showChain, setShowChain] = useState(false);

  return (
    <section className="rounded-[var(--radius-lg)] border border-border bg-card overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface-raised/40">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Training Recommendation
        </h2>
        {isStreaming && (
          <div className="flex items-center gap-2 text-xs text-accent">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />
            Analyzing…
          </div>
        )}
        {isDone && (
          <span className="text-xs text-muted">Done</span>
        )}
      </div>

      {/* Body */}
      <div className="p-5 sm:p-6">
        {/* ── Error ── */}
        {error && (
          <div className="mb-5 p-4 rounded-[var(--radius-md)] bg-danger/[0.06] border border-danger/20">
            <p className="text-sm text-danger flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </p>
          </div>
        )}

        {/* ── Agent steps ── */}
        {steps.length > 0 && (
          <div className="mb-5 bg-surface-raised/60 rounded-[var(--radius-md)] p-4 border border-border">
            <button
              onClick={() => setShowChain(!showChain)}
              className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider text-muted hover:text-secondary
                         transition-colors duration-150 cursor-pointer"
            >
              <span>
                Agent Reasoning ({steps.length} step{steps.length !== 1 ? "s" : ""})
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showChain ? "rotate-180" : ""}`} />
            </button>

            {showChain && (
              <div className="mt-4 animate-fade-in pl-1">
                {steps.map((step, i) => (
                  <StepItem
                    key={`${step.tool}-${i}`}
                    step={step}
                    isLast={i === steps.length - 1 && !isStreaming}
                  />
                ))}
                {isStreaming && steps.every((s) => s.status === "done") && (
                  <StepItem
                    step={{ status: "running", label: "Composing response…" }}
                    isLast
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Streaming indicator (before text arrives) ── */}
        {isStreaming && !text && !error && (
          <div className="flex items-center gap-3 text-sm text-secondary py-4">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />
            <span>Agent is analyzing your data…</span>
          </div>
        )}

        {/* ── Recommendation output ── */}
        {text && (
          <ResponseRenderer text={text} isStreaming={isStreaming} />
        )}
      </div>
    </section>
  );
}
