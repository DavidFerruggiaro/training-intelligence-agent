import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown, AlertTriangle, Dumbbell, FlaskConical, Moon } from "lucide-react";

// ---------------------------------------------------------------------------
// Section classifier — fuzzy keyword matching on heading text
// ---------------------------------------------------------------------------

function classifySection(heading) {
  const h = heading.toLowerCase();

  if (/biometric|analysis|verdict|assessment|overview|readiness|condition|today'?s\s+(status|plan|session)|current\s+state/.test(h)) {
    return "verdict";
  }
  if (
    /workout|session|exercise|training|program|movement|leg\s|upper|lower|strength|cardio|modified|prescribed|protocol/.test(h) &&
    !/recovery|rest|sleep/.test(h)
  ) {
    return "workout";
  }
  if (/research|rationale|evidence|why|science|support|basis|literature|background/.test(h)) {
    return "rationale";
  }
  if (/recovery|rest|sleep|nutrition|hydration|next\s+step|post[\s-]workout/.test(h)) {
    return "recovery";
  }

  return "unknown";
}

// ---------------------------------------------------------------------------
// Text normalizer + parser
// ---------------------------------------------------------------------------

// Keywords used to identify a bold span as a section heading (step 2 guard)
const SECTION_KW =
  /today|recommendation|verdict|session|workout|exercise|protocol|research|rationale|evidence|recovery|rest|nutrition|hydration|analysis|assessment|biometric|training|plan/;

function parseSections(rawText) {
  // ── Step 1: insert \n before ## that isn't already at a line start ──
  // Fixes: "...relevant research.## Training Recommendation" (no newline before ##)
  let text = rawText.replace(/([^\n])(##[^#])/g, "$1\n$2");

  // ── Step 2: insert \n before **Bold** headings that appear mid-text ──
  // Fixes: "...text**Today's Recommendation**" (no newline before bold heading)
  // Guard: inner text must start with a capital and match a known keyword.
  text = text.replace(/([^\n])(\*\*[A-Z][^*\n]{2,60}\*\*)/g, (_, pre, bold) => {
    const inner = bold.slice(2, -2).toLowerCase();
    return SECTION_KW.test(inner) ? `${pre}\n${bold}` : `${pre}${bold}`;
  });

  // ── Step 3: convert standalone **Bold** lines → ## headings ──
  // Fixes: entire line is "**Recovery Protocols**" with no ## prefix
  // Matches a line whose only non-whitespace content is **Title**
  text = text.replace(/^\s*\*\*([A-Z][^*\n]{2,60})\*\*\s*$/gm, "## $1");

  // ── Step 4: split on ## headings (not ###) ──
  const parts = text.split(/^(##[^#].+)$/m);
  const sections = [];

  if (parts[0].trim()) {
    sections.push({ heading: null, content: parts[0].trim(), type: "preamble" });
  }

  for (let i = 1; i < parts.length; i += 2) {
    const heading = parts[i].replace(/^##\s*/, "").trim();
    const content = (parts[i + 1] ?? "").trim();
    sections.push({ heading, content, type: classifySection(heading) });
  }

  return sections;
}

// ---------------------------------------------------------------------------
// Streaming cursor
// ---------------------------------------------------------------------------

function Cursor() {
  return (
    <span className="inline-block w-1.5 h-4 ml-1 bg-accent/70 animate-pulse-accent rounded-sm align-middle" />
  );
}

// ---------------------------------------------------------------------------
// Markdown component sets — defined at module level for stable references
// (avoids ReactMarkdown remounting the tree on every streaming update)
// ---------------------------------------------------------------------------

const PROSE_CMPS = {
  p: ({ children }) => {
    const flat = Array.isArray(children) ? children : [children];
    const firstStr = String(flat.find((c) => typeof c === "string") ?? "");
    const isWarn =
      /^⚠/.test(firstStr) ||
      /^(warning|caution|important\s+note)[\s:]/i.test(firstStr);

    if (isWarn) {
      return (
        <div className="flex gap-3 p-4 rounded-[var(--radius-md)] bg-warning/[0.07] border border-warning/25 mb-4">
          <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
          <span className="text-sm text-warning/90 leading-relaxed">{children}</span>
        </div>
      );
    }
    return <p className="mb-3 leading-relaxed text-primary/85">{children}</p>;
  },
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-primary mb-2 mt-5">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-medium text-secondary mb-1.5 mt-3">{children}</h4>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-5 mb-3 space-y-1.5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 mb-3 space-y-1.5">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-sm leading-relaxed text-primary/85">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-primary">{children}</strong>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted py-2 px-3 border-b border-border">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="py-2 px-3 border-b border-border/50 text-sm text-primary/85">{children}</td>
  ),
};

// Workout section overrides list rendering to look like exercise rows
const WORKOUT_CMPS = {
  ...PROSE_CMPS,
  ul: ({ children }) => (
    <ul className="mt-3 divide-y divide-border/50">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-3 divide-y divide-border/50 list-none p-0">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="flex items-start gap-3 py-3 first:pt-1 last:pb-0">
      <span className="w-1.5 h-1.5 rounded-full bg-warning mt-[0.45rem] flex-shrink-0" />
      <div className="flex-1 text-sm text-primary leading-relaxed">{children}</div>
    </li>
  ),
};

// ---------------------------------------------------------------------------
// Section card components
// ---------------------------------------------------------------------------

function VerdictSection({ heading, content, showCursor }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-accent/20 bg-accent-subtle p-5 sm:p-6">
      {heading && (
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
          <h3 className="text-xs font-semibold uppercase tracking-widest text-accent">{heading}</h3>
        </div>
      )}
      <div className="text-[15px]">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={PROSE_CMPS}>
          {content}
        </ReactMarkdown>
        {showCursor && <Cursor />}
      </div>
    </div>
  );
}

function WorkoutSection({ heading, content, showCursor }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-warning/20 bg-[rgba(245,158,11,0.04)] p-5 sm:p-6">
      {heading && (
        <div className="flex items-center gap-2 mb-4">
          <Dumbbell className="w-4 h-4 text-warning" />
          <h3 className="text-xs font-semibold uppercase tracking-widest text-warning">{heading}</h3>
        </div>
      )}
      <div className="text-[15px]">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={WORKOUT_CMPS}>
          {content}
        </ReactMarkdown>
        {showCursor && <Cursor />}
      </div>
    </div>
  );
}

function RationaleSection({ heading, content, showCursor }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface-raised/40 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer
                   hover:bg-surface-raised/60 transition-colors duration-150"
      >
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-blue" />
          <span className="text-xs font-semibold uppercase tracking-widest text-secondary">
            {heading ?? "Research Rationale"}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 pt-4 border-t border-border animate-fade-in">
          <div className="text-[15px]">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={PROSE_CMPS}>
              {content}
            </ReactMarkdown>
            {showCursor && <Cursor />}
          </div>
        </div>
      )}

      {/* Cursor visible even when collapsed, so streaming progress is always shown */}
      {!open && showCursor && (
        <div className="px-5 pb-3">
          <Cursor />
        </div>
      )}
    </div>
  );
}

function RecoveryPlanSection({ heading, content, showCursor }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[rgba(99,102,241,0.2)] bg-[rgba(99,102,241,0.04)] p-5 sm:p-6">
      {heading && (
        <div className="flex items-center gap-2 mb-4">
          <Moon className="w-4 h-4 text-[var(--color-chart-sleep-deep)]" />
          <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-chart-sleep-deep)]">
            {heading}
          </h3>
        </div>
      )}
      <div className="text-[15px]">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={PROSE_CMPS}>
          {content}
        </ReactMarkdown>
        {showCursor && <Cursor />}
      </div>
    </div>
  );
}

function FallbackSection({ heading, content, showCursor }) {
  return (
    <div>
      {heading && (
        <h3 className="text-sm font-semibold text-primary mb-3">{heading}</h3>
      )}
      <div className="text-[15px]">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={PROSE_CMPS}>
          {content}
        </ReactMarkdown>
        {showCursor && <Cursor />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------

export default function ResponseRenderer({ text, isStreaming }) {
  const sections = parseSections(text);

  // If no recognizable section structure, fall back to unified prose
  const hasStructure = sections.some((s) =>
    ["verdict", "workout", "rationale", "recovery"].includes(s.type)
  );

  if (!hasStructure) {
    return (
      <div className="text-[15px]">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={PROSE_CMPS}>
          {text}
        </ReactMarkdown>
        {isStreaming && <Cursor />}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section, i) => {
        const showCursor = isStreaming && i === sections.length - 1;
        const props = { ...section, showCursor };

        switch (section.type) {
          case "verdict":
            return <VerdictSection key={i} {...props} />;
          case "workout":
            return <WorkoutSection key={i} {...props} />;
          case "rationale":
            return <RationaleSection key={i} {...props} />;
          case "recovery":
            return <RecoveryPlanSection key={i} {...props} />;
          default:
            // preamble and unknown both get the plain fallback
            return <FallbackSection key={i} {...props} />;
        }
      })}
    </div>
  );
}
