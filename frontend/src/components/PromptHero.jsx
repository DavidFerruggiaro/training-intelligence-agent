import { useState } from "react";
import { Sparkles, Square } from "lucide-react";

const CHIPS = [
  "Should I train hard today?",
  "Plan a leg day based on my recovery",
  "Design a strength session for today",
  "Analyze my HRV and recovery trends",
  "Optimal sleep protocol for tonight",
];

export default function PromptHero({ onGenerate, isStreaming, onCancel }) {
  const [prompt, setPrompt] = useState("");

  function submit(text) {
    if (isStreaming) return;
    onGenerate(text || null);
  }

  function handleChip(chip) {
    setPrompt(chip);
    onGenerate(chip);
  }

  return (
    <section className="rounded-[var(--radius-xl)] border border-border bg-card p-6 sm:p-7 animate-fade-in">
      {/* Label */}
      <div className="flex items-center gap-2 mb-5">
        <Sparkles className="w-4 h-4 text-accent" />
        <span className="text-xs font-semibold uppercase tracking-widest text-accent">
          Ask your training AI
        </span>
      </div>

      {/* Textarea */}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit(prompt);
          }
        }}
        placeholder="Should I go hard today or prioritize recovery?"
        rows={2}
        disabled={isStreaming}
        className="w-full bg-surface border border-border rounded-[var(--radius-md)] px-4 py-3.5 text-sm
                   text-primary placeholder:text-ghost focus:outline-none focus:border-accent/40
                   focus:ring-1 focus:ring-accent/20 transition-colors duration-150 resize-none
                   disabled:opacity-50 disabled:cursor-not-allowed"
      />

      {/* Quick-action chips */}
      <div className="flex flex-wrap gap-2 mt-3">
        {CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => handleChip(chip)}
            disabled={isStreaming}
            className="px-3 py-1.5 text-xs font-medium text-secondary border border-border
                       rounded-full bg-surface hover:border-accent/30 hover:text-accent
                       hover:bg-accent-subtle transition-all duration-150 cursor-pointer
                       disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Action row */}
      <div className="flex items-center mt-5">
        <p className="text-xs text-muted hidden sm:block flex-1">
          Shift+Enter for new line · Enter to submit
        </p>
        {isStreaming ? (
          <button
            onClick={onCancel}
            className="px-5 py-2.5 bg-surface border border-danger/30 text-danger font-semibold text-sm
                       rounded-[var(--radius-md)] hover:bg-danger/10 transition-colors duration-150
                       flex items-center gap-2 cursor-pointer active:scale-[0.97] ml-auto"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            Stop
          </button>
        ) : (
          <button
            onClick={() => submit(prompt)}
            className="px-6 py-2.5 bg-accent text-surface font-semibold text-sm rounded-[var(--radius-md)]
                       hover:bg-accent-dim transition-colors duration-150 flex-shrink-0 ml-auto
                       cursor-pointer active:scale-[0.97]
                       shadow-[0_0_20px_rgba(0,241,159,0.12)]
                       hover:shadow-[0_0_30px_rgba(0,241,159,0.20)]"
          >
            Analyze &amp; Recommend
          </button>
        )}
      </div>
    </section>
  );
}
