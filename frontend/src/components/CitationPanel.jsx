import { useState } from "react";
import { ChevronDown, BookOpen } from "lucide-react";

// ---------------------------------------------------------------------------
// Single citation card
// ---------------------------------------------------------------------------

function CitationCard({ citation, index }) {
  const [expanded, setExpanded] = useState(false);
  const relevance = Math.round((citation.relevance_score ?? 0) * 100);

  return (
    <div className="border border-border rounded-[var(--radius-md)] bg-surface-raised overflow-hidden animate-fade-in transition-colors duration-150 hover:border-border-light">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3.5 flex items-start gap-3.5 text-left hover:bg-card-hover
                   transition-colors duration-150 cursor-pointer"
      >
        {/* Index badge */}
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/10 text-accent
                         text-[10px] font-semibold flex items-center justify-center mt-0.5">
          {index}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-primary leading-snug">
            {citation.citation}
          </p>

          {citation.topic_tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {citation.topic_tags.filter(Boolean).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-[var(--radius-sm)] bg-white/[0.04] text-muted border border-border"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Relevance bar + chevron */}
        <div className="flex items-center gap-2.5 flex-shrink-0 mt-0.5">
          <div className="flex items-center gap-2">
            <div className="w-12 h-1 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-accent/60"
                style={{ width: `${relevance}%` }}
              />
            </div>
            <span className="text-[11px] font-medium text-muted tabular-nums">{relevance}%</span>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-ghost transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Expanded excerpt */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 animate-fade-in">
          <div className="ml-9 pl-3.5 border-l-2 border-accent/15">
            <p className="text-sm text-secondary leading-relaxed whitespace-pre-wrap">
              {citation.excerpt}
            </p>

            {citation.source_file && (
              <p className="mt-2.5 text-[11px] text-ghost font-mono bg-surface px-2 py-1 rounded-[var(--radius-sm)] inline-block">
                {citation.source_file}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CitationPanel
// ---------------------------------------------------------------------------

export default function CitationPanel({ citations }) {
  const [showAll, setShowAll] = useState(false);

  if (!citations?.length) return null;

  const unique = citations.filter(
    (c, i, arr) => arr.findIndex((x) => x.citation === c.citation) === i,
  );

  const visible = showAll ? unique : unique.slice(0, 3);

  return (
    <section className="rounded-[var(--radius-lg)] border border-border bg-card overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface-raised/40">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-4 h-4 text-muted" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Research Sources ({unique.length})
          </h2>
        </div>

        {unique.length > 3 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-medium text-accent hover:text-accent-dim transition-colors duration-150 cursor-pointer"
          >
            {showAll ? "Show less" : `Show all ${unique.length}`}
          </button>
        )}
      </div>

      {/* Citation list */}
      <div className="p-4 space-y-2.5 stagger">
        {visible.map((citation, i) => (
          <CitationCard
            key={citation.citation + i}
            citation={citation}
            index={i + 1}
          />
        ))}
      </div>
    </section>
  );
}
