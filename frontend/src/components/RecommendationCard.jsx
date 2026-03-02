import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <div className="w-2 h-2 rounded-full bg-accent animate-pulse-dot" />
  );
}

function ChevronIcon({ open }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2"
      className={`text-secondary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Step timeline item
// ---------------------------------------------------------------------------

function StepItem({ step, isLast }) {
  return (
    <div className="flex gap-4 animate-fade-in relative">
      {/* Timeline gutter */}
      <div className="flex flex-col items-center">
        <div className="w-7 h-7 rounded-full border border-border bg-surface-raised flex items-center justify-center flex-shrink-0 z-10">
          {step.status === "done" ? <CheckIcon /> : <SpinnerIcon />}
        </div>
        {!isLast && <div className="absolute top-7 bottom-0 left-[13px] w-px bg-border" />}
      </div>

      {/* Content */}
      <div className="pb-6 min-w-0 pt-1">
        <p className={`text-sm ${step.status === "done" ? "text-primary" : "text-accent animate-pulse-accent"}`}>
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
    <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-surface-raised/50">
        <div>
          <h2 className="text-sm font-medium tracking-widest uppercase text-secondary">
            Today&rsquo;s Recommendation
          </h2>
        </div>

        {isStreaming && (
          <button
            onClick={onCancel}
            className="text-xs font-medium text-danger hover:text-danger/80 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-6 sm:p-8">
        {/* Initial state — prompt the user */}
        {!hasStarted && (
          <div className="space-y-6 max-w-2xl mx-auto text-center py-8">
            <div className="w-16 h-16 mx-auto rounded-full bg-accent/10 flex items-center justify-center mb-6">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <p className="text-[15px] text-secondary leading-relaxed">
              Get a personalized training recommendation based on your current
              biometrics, training load, and sports science research.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto mt-8">
              <input
                type="text"
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="Training goals (optional)"
                className="flex-1 bg-surface border border-border rounded-xl px-5 py-3.5 text-[15px]
                           text-primary placeholder:text-muted focus:outline-none focus:border-accent/50
                           transition-colors shadow-inner"
                onKeyDown={(e) => e.key === "Enter" && onGenerate(goals)}
              />
              <button
                onClick={() => onGenerate(goals)}
                className="px-6 py-3.5 bg-accent text-surface font-semibold text-[15px] rounded-xl
                           hover:bg-accent/90 transition-all flex-shrink-0 cursor-pointer shadow-[0_0_20px_rgba(0,241,159,0.15)] hover:shadow-[0_0_30px_rgba(0,241,159,0.25)]"
              >
                Analyze &amp; Recommend
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/20">
            <p className="text-sm text-danger flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </p>
          </div>
        )}

        {/* Streaming / done — agent steps */}
        {hasStarted && steps.length > 0 && (
          <div className="mb-6 bg-surface-raised rounded-xl p-4 border border-border">
            <button
              onClick={() => setShowChain(!showChain)}
              className="flex items-center justify-between w-full text-xs font-medium uppercase tracking-wide text-secondary hover:text-primary
                         transition-colors cursor-pointer"
            >
              <span>
                Agent Reasoning ({steps.length} step{steps.length !== 1 ? "s" : ""})
              </span>
              <ChevronIcon open={showChain} />
            </button>

            {showChain && (
              <div className="mt-5 animate-fade-in pl-2">
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

        {/* Recommendation text */}
        {text && (
          <div className="prose max-w-none text-[15px] leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {text}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-accent/70 animate-pulse-accent rounded-sm align-middle" />
            )}
          </div>
        )}

        {/* Streaming indicator when no text yet */}
        {isStreaming && !text && !error && (
          <div className="flex items-center gap-3 text-sm text-secondary py-4">
            <SpinnerIcon />
            <span>Agent is analyzing your data…</span>
          </div>
        )}

        {/* Regenerate button when done */}
        {isDone && !isStreaming && (
          <div className="mt-8 pt-6 border-t border-border flex justify-end">
            <button
              onClick={() => onGenerate(goals)}
              className="text-xs font-medium text-secondary hover:text-accent transition-colors cursor-pointer flex items-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/>
              </svg>
              Regenerate recommendation
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
