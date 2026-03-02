import { useState } from "react";

// ---------------------------------------------------------------------------
// Single citation card
// ---------------------------------------------------------------------------

function CitationCard({ citation, index }) {
  const [expanded, setExpanded] = useState(false);
  const relevance = Math.round((citation.relevance_score ?? 0) * 100);

  return (
    <div className="border border-border rounded-xl bg-surface-raised overflow-hidden animate-fade-in transition-all hover:border-border-light">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-start gap-4 text-left hover:bg-card-hover
                   transition-colors cursor-pointer"
      >
        {/* Index badge */}
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent
                         text-xs font-medium flex items-center justify-center mt-0.5">
          {index}
        </span>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <p className="text-sm font-medium text-primary leading-snug">
            {citation.citation}
          </p>

          {/* Tags */}
          {citation.topic_tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {citation.topic_tags.filter(Boolean).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full bg-accent/10 text-accent"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Relevance + chevron */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs font-medium text-secondary">{relevance}% match</span>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            className={`text-muted transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Expanded excerpt */}
      {expanded && (
        <div className="px-5 pb-5 pt-0 animate-fade-in">
          <div className="ml-10 pl-4 border-l-2 border-accent/20">
            <p className="text-sm text-secondary leading-relaxed whitespace-pre-wrap">
              {citation.excerpt}
            </p>

            {citation.source_file && (
              <p className="mt-3 text-[11px] text-muted font-mono bg-surface px-2 py-1 rounded inline-block">
                Source: {citation.source_file}
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

  // Deduplicate by citation string
  const unique = citations.filter(
    (c, i, arr) => arr.findIndex((x) => x.citation === c.citation) === i,
  );

  const visible = showAll ? unique : unique.slice(0, 3);

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden mt-8">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-surface-raised/30">
        <h2 className="text-xs font-medium uppercase tracking-widest text-secondary">
          Research Citations ({unique.length})
        </h2>

        {unique.length > 3 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-medium text-accent hover:text-accent/80 transition-colors cursor-pointer"
          >
            {showAll ? "Show less" : `Show all ${unique.length}`}
          </button>
        )}
      </div>

      {/* Citation list */}
      <div className="p-5 space-y-3">
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
