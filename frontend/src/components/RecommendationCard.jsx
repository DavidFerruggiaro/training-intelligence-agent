import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, ChevronDown, AlertCircle, RefreshCw, Sparkles } from "lucide-react";

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
// RecommendationCard
// ---------------------------------------------------------------------------

export default function RecommendationCard({
  text,
  steps,
  isStreaming,
  isDone,
  error,
  onGenerate,
  onCancel,
}) {
  const [goals, setGoals] = useState("");
  const [showChain, setShowChain] = useState(false);
  const hasStarted = isStreaming || isDone || !!error || !!text || steps.length > 0;

  return (
    <section className="rounded-[var(--radius-lg)] border border-border bg-card overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface-raised/40">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-accent" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            AI Training Intelligence
          </h2>
        </div>

        {isStreaming && (
          <button
            onClick={onCancel}
            className="text-xs font-medium text-danger hover:text-danger/80 transition-colors duration-150 cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-5 sm:p-6">
        {/* ── Initial state — prompt input ── */}
        {!hasStarted && (
          <div className="max-w-2xl mx-auto py-6">
            <p className="text-sm text-secondary leading-relaxed text-center mb-6">
              Get a personalized training recommendation based on your
              biometrics, training load, and sports science research.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="Training goals (optional)"
                className="flex-1 bg-surface border border-border rounded-[var(--radius-md)] px-4 py-3 text-sm
                           text-primary placeholder:text-ghost focus:outline-none focus:border-accent/40
                           focus:ring-1 focus:ring-accent/20 transition-colors duration-150"
                onKeyDown={(e) => e.key === "Enter" && onGenerate(goals)}
              />
              <button
                onClick={() => onGenerate(goals)}
                className="px-5 py-3 bg-accent text-surface font-semibold text-sm rounded-[var(--radius-md)]
                           hover:bg-accent-dim transition-colors duration-150 flex-shrink-0
                           cursor-pointer active:scale-[0.97]
                           shadow-[0_0_20px_rgba(0,241,159,0.12)]
                           hover:shadow-[0_0_30px_rgba(0,241,159,0.20)]"
              >
                Analyze &amp; Recommend
              </button>
            </div>
          </div>
        )}

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
        {hasStarted && steps.length > 0 && (
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

        {/* ── Recommendation text ── */}
        {text && (
          <div className="prose max-w-none text-[15px] leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {text}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 ml-1 bg-accent/70 animate-pulse-accent rounded-sm align-middle" />
            )}
          </div>
        )}

        {/* ── Streaming indicator ── */}
        {isStreaming && !text && !error && (
          <div className="flex items-center gap-3 text-sm text-secondary py-4">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />
            <span>Agent is analyzing your data…</span>
          </div>
        )}

        {/* ── Regenerate ── */}
        {isDone && !isStreaming && (
          <div className="mt-6 pt-5 border-t border-border flex justify-end">
            <button
              onClick={() => onGenerate(goals)}
              className="text-xs font-medium text-muted hover:text-accent transition-colors duration-150 cursor-pointer flex items-center gap-2 active:scale-[0.97]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Regenerate
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
