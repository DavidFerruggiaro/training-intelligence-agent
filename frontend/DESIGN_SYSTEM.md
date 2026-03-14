# Training Intelligence Agent — Design System

> **Strava meets WHOOP — an athlete's command center, not a wellness journal.**

---

## 1. Design Philosophy

### Core Principles

1. **Data is the hero.** Every design decision serves the data. Metrics are large, bold, and immediate — never hidden behind tabs or buried in minimal layouts.
2. **Alive, not static.** Data should feel like it's breathing. Subtle glow, gentle pulses, and motion imply the system is always working, always watching.
3. **Layered depth.** Surfaces stack with purpose — dark foundations, raised cards with translucent edges, floating elements. Think Apple's material quality applied to a dark cockpit.
4. **Athletic confidence.** Bold type, high contrast, decisive color. This isn't soft wellness — it's performance intelligence. The UI should feel like it knows what it's talking about.
5. **Functional beauty.** Nothing decorative without purpose. Every glow, gradient, and animation exists to communicate meaning — recovery status, trend direction, intensity.

### Design DNA

| Attribute | Direction |
|-----------|-----------|
| Mood | Confident, premium, data-forward |
| Surfaces | Layered dark with navy undertones |
| Data display | Large, prominent, glowing |
| Interactions | Tactile, responsive, spring-based |
| Color usage | Strategic and semantic — color = meaning |
| Density | Information-rich, not cluttered |

---

## 2. Color System

### 2.1 Surface Palette

Move from pure black to deep navy-charcoal. This adds warmth and sophistication — closer to Apple's dark materials than OLED black.

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-surface` | `#09090B` | App background (zinc-950) |
| `--color-surface-raised` | `#111114` | Slightly elevated areas |
| `--color-card` | `#16161A` | Card backgrounds |
| `--color-card-hover` | `#1C1C22` | Card hover state |
| `--color-panel` | `#1E1E24` | Side panels, chat drawer |
| `--color-overlay` | `rgba(0, 0, 0, 0.6)` | Modal/drawer backdrop |

### 2.2 Accent Colors

Primary accent stays green (WHOOP DNA) but gains a secondary blue for data variety and a warm amber for warnings/strain.

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-accent` | `#00F19F` | Primary brand, recovery, positive |
| `--color-accent-dim` | `#00B377` | Accent muted / hover state |
| `--color-accent-glow` | `rgba(0, 241, 159, 0.12)` | Glow behind accent elements |
| `--color-accent-subtle` | `rgba(0, 241, 159, 0.06)` | Tinted card backgrounds |
| `--color-blue` | `#3B82F6` | Secondary data, HRV, links |
| `--color-blue-dim` | `#2563EB` | Blue hover / muted |
| `--color-blue-glow` | `rgba(59, 130, 246, 0.12)` | Glow behind blue elements |

### 2.3 Semantic Colors

| Token | Hex | Meaning |
|-------|-----|---------|
| `--color-success` | `#00F19F` | Recovery high, positive trend |
| `--color-warning` | `#F59E0B` | Strain high, caution |
| `--color-danger` | `#EF4444` | Overtraining, critical alert |
| `--color-info` | `#3B82F6` | Informational, neutral data |

### 2.4 Text Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary` | `#FAFAFA` | Headings, key metrics |
| `--color-secondary` | `#A1A1AA` | Body text, labels (zinc-400) |
| `--color-muted` | `#71717A` | Captions, timestamps (zinc-500) |
| `--color-ghost` | `#3F3F46` | Disabled, placeholder (zinc-700) |

### 2.5 Border Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-border` | `rgba(255, 255, 255, 0.06)` | Default card/section borders |
| `--color-border-light` | `rgba(255, 255, 255, 0.10)` | Hover borders, active states |
| `--color-border-accent` | `rgba(0, 241, 159, 0.20)` | Accent-tinted borders |

### 2.6 Chart Palette

Designed for maximum contrast on dark backgrounds. Each color is semantically assigned.

| Token | Hex | Data Type |
|-------|-----|-----------|
| `--color-chart-recovery` | `#00F19F` | Recovery score, HRV |
| `--color-chart-strain` | `#F59E0B` | Strain, training load |
| `--color-chart-heart` | `#EF4444` | Heart rate, danger zones |
| `--color-chart-sleep-deep` | `#6366F1` | Deep sleep (indigo) |
| `--color-chart-sleep-rem` | `#A855F7` | REM sleep (purple) |
| `--color-chart-sleep-light` | `#38BDF8` | Light sleep (sky blue) |
| `--color-chart-baseline` | `#3F3F46` | Baselines, grid lines |
| `--color-chart-area-fill` | `rgba(0, 241, 159, 0.08)` | Area chart fill |

### 2.7 Gradients

| Name | Value | Usage |
|------|-------|-------|
| Recovery glow | `radial-gradient(ellipse at 50% 0%, rgba(0,241,159,0.08) 0%, transparent 70%)` | Card header glow |
| Strain glow | `radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.08) 0%, transparent 70%)` | Strain card header |
| Surface fade | `linear-gradient(180deg, var(--color-card) 0%, var(--color-surface) 100%)` | Section transitions |
| Metric shine | `linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%)` | Subtle card sheen |

---

## 3. Typography

### 3.1 Font Stack

| Role | Font | Fallback | Why |
|------|------|----------|-----|
| **Display / Metrics** | **Inter** (700–900) | system-ui, sans-serif | Large metric numbers, hero stats. Inter's tabular figures keep numbers stable. |
| **Headings** | **Inter** (600) | system-ui, sans-serif | Clean, Apple-like section headers. |
| **Body** | **Inter** (400–500) | system-ui, sans-serif | Highly readable at small sizes on dark backgrounds. |
| **Mono / Data** | **JetBrains Mono** (400–500) | ui-monospace, monospace | Code blocks, timestamps, raw data values. |

> **Why stay with Inter?** Inter is the closest open-source equivalent to SF Pro — Apple's system font. It has excellent tabular numbers for metrics, supports all weights, and renders beautifully on dark backgrounds. Switching to a "sportier" font (e.g., Barlow Condensed) would sacrifice the premium Apple-like feel we're targeting.

### 3.2 Type Scale

All sizes use `rem` units. Base = 16px.

| Token | Size | Weight | Line Height | Letter Spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| `text-metric` | 3rem (48px) | 800 | 1.0 | -0.03em | Hero metric numbers |
| `text-metric-sm` | 2rem (32px) | 700 | 1.1 | -0.02em | Secondary metrics |
| `text-2xl` | 1.5rem (24px) | 600 | 1.3 | -0.02em | Section headings |
| `text-xl` | 1.25rem (20px) | 600 | 1.35 | -0.01em | Card titles |
| `text-lg` | 1.125rem (18px) | 500 | 1.4 | 0 | Emphasized body |
| `text-base` | 1rem (16px) | 400 | 1.5 | 0 | Body text |
| `text-sm` | 0.875rem (14px) | 400 | 1.5 | 0 | Secondary text, labels |
| `text-xs` | 0.75rem (12px) | 500 | 1.4 | 0.02em | Captions, axis labels |
| `text-xxs` | 0.625rem (10px) | 600 | 1.3 | 0.05em | Badges, status indicators |

### 3.3 Metric Display Rules

- **Big numbers are the UI.** Recovery score, HRV, strain — these should dominate their containers.
- Use `font-variant-numeric: tabular-nums` on all metric values so digits don't shift width during updates.
- Tight negative letter-spacing (`-0.03em`) on large metrics for that dense, confident feel.
- Pair large numbers with small uppercase labels (12px, 600 weight, `0.05em` tracking).

---

## 4. Spacing & Layout

### 4.1 Spacing Scale

Based on a 4px grid, matching Tailwind's default scale.

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Tight gaps, inline spacing |
| `space-2` | 8px | Icon-to-text gaps |
| `space-3` | 12px | Compact padding |
| `space-4` | 16px | Default element padding |
| `space-5` | 20px | Card padding |
| `space-6` | 24px | Section gaps |
| `space-8` | 32px | Between card groups |
| `space-10` | 40px | Major section spacing |
| `space-12` | 48px | Page section breaks |
| `space-16` | 64px | Header height |

### 4.2 Layout Grid

| Property | Value | Notes |
|----------|-------|-------|
| Max content width | `1200px` | Wider than current 1000px — data-dense layouts need room |
| Page padding (desktop) | `24px` (sides) | `px-6` |
| Page padding (mobile) | `16px` (sides) | `px-4` |
| Card grid | `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` | Responsive card layout |
| Dashboard gap | `24px` | `gap-6` between major sections |
| Card internal gap | `16px–20px` | `gap-4` or `gap-5` inside cards |

### 4.3 Breakpoints

| Name | Width | Layout |
|------|-------|--------|
| Mobile | `< 768px` | Single column, stacked cards |
| Tablet | `768px–1023px` | 2-column grid |
| Desktop | `1024px–1279px` | 2-column with wider cards |
| Wide | `1280px+` | 3-column grid, full data density |

---

## 5. Border Radius & Elevation

### 5.1 Border Radius Scale

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | 6px | Small badges, pills |
| `rounded-md` | 10px | Buttons, inputs |
| `rounded-lg` | 14px | Cards, panels |
| `rounded-xl` | 18px | Feature cards, modals |
| `rounded-full` | 9999px | Circular badges, avatars |

### 5.2 Elevation System

No traditional box-shadow elevation. Instead, use **border + surface color differentiation + glow** for depth. This is more premium on dark UIs.

| Level | Treatment | Usage |
|-------|-----------|-------|
| **L0 — Flat** | `bg-surface` | Page background |
| **L1 — Raised** | `bg-card` + `border border-border` | Standard cards |
| **L2 — Elevated** | `bg-panel` + `border border-border-light` + subtle inner glow | Active cards, chat panel |
| **L3 — Floating** | `bg-card` + `border border-border-light` + `shadow-lg shadow-black/30` | Dropdowns, tooltips |
| **L4 — Overlay** | `bg-card` + `backdrop-blur-xl` | Modals, command palette |

### 5.3 Glow Effects (Signature Element)

Glow is this design system's signature. It replaces traditional shadows and creates the "alive" feeling.

```css
/* Recovery glow — applied to cards showing positive metrics */
.glow-recovery {
  box-shadow: 0 0 20px rgba(0, 241, 159, 0.06),
              inset 0 1px 0 rgba(0, 241, 159, 0.08);
}

/* Strain glow — training load, high-strain metrics */
.glow-strain {
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.06),
              inset 0 1px 0 rgba(245, 158, 11, 0.08);
}

/* Danger glow — overtraining alerts */
.glow-danger {
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.06),
              inset 0 1px 0 rgba(239, 68, 68, 0.08);
}

/* Interactive glow on hover */
.glow-hover:hover {
  box-shadow: 0 0 30px rgba(0, 241, 159, 0.10),
              inset 0 1px 0 rgba(255, 255, 255, 0.06);
}
```

---

## 6. Component Patterns

### 6.1 Metric Card

The core building block. Displays a single metric prominently.

```
┌─────────────────────────┐
│  ○ Recovery Score        │  ← 12px label, uppercase, muted
│                          │
│        87%               │  ← 48px metric, bold, accent-colored
│     ▲ 5% from yesterday  │  ← 14px trend indicator with arrow
│                          │
│  ▂▃▅▆▇█▇▆▅▃▂            │  ← Sparkline (optional)
└─────────────────────────┘
```

- **Structure:** Label → Metric → Trend → Sparkline
- **The number is the largest element**, never the label
- Trend arrows: `▲` green for positive, `▼` red for negative
- Card gets a semantic glow based on the metric state (recovery → green, strain → amber)
- `font-variant-numeric: tabular-nums` on all numbers

### 6.2 Buttons

| Variant | Style | Usage |
|---------|-------|-------|
| **Primary** | `bg-accent text-surface font-semibold rounded-md px-5 py-2.5` | Main CTAs |
| **Secondary** | `bg-transparent border border-border text-secondary rounded-md px-5 py-2.5` | Secondary actions |
| **Ghost** | `bg-transparent text-secondary hover:text-primary hover:bg-white/5 rounded-md px-3 py-2` | Tertiary actions |
| **Icon** | `bg-transparent text-muted hover:text-primary hover:bg-white/5 rounded-md p-2` | Icon-only buttons |

All buttons:
- `cursor-pointer` always
- `transition-colors duration-150`
- `active:scale-[0.97]` for press feedback
- `focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none`

### 6.3 Inputs

```
Text input:
  bg-surface-raised border border-border rounded-md px-4 py-3
  text-primary placeholder:text-ghost
  focus:border-accent/40 focus:ring-1 focus:ring-accent/20
  transition-colors duration-150
```

- 16px minimum font size (prevents iOS zoom)
- No labels floating inside inputs — use labels above or placeholder text
- Error state: `border-danger/50` + error message below in `text-danger text-sm`

### 6.4 Badges & Status Indicators

| Variant | Style |
|---------|-------|
| **Recovery (green)** | `bg-accent/10 text-accent border border-accent/20 text-xs font-semibold px-2.5 py-1 rounded-sm` |
| **Strain (amber)** | `bg-warning/10 text-warning border border-warning/20 ...` |
| **Alert (red)** | `bg-danger/10 text-danger border border-danger/20 ...` |
| **Neutral** | `bg-white/5 text-secondary border border-border ...` |

### 6.5 Chat Messages

| Sender | Style |
|--------|-------|
| **User** | `bg-accent/8 border border-accent/15 rounded-lg rounded-br-sm ml-12` — right-aligned feel via margin |
| **AI** | `bg-card border border-border rounded-lg rounded-bl-sm mr-12` — left-aligned feel |
| **System/Tool** | `bg-surface-raised border border-border text-muted text-sm italic` |

---

## 7. Data Visualization

### 7.1 Chart Styling Rules

| Property | Value | Notes |
|----------|-------|-------|
| Background | Transparent (card provides bg) | Charts sit inside cards |
| Grid lines | `#3F3F46` at 0.3 opacity | Barely visible, don't compete with data |
| Axis text | `#71717A`, 12px, Inter | Muted, readable |
| Axis lines | `#3F3F46` at 0.5 opacity | Subtle structure |
| Tooltip bg | `#1E1E24` with `border border-border-light` | Dark, matches panel color |
| Tooltip text | `#FAFAFA` for values, `#A1A1AA` for labels | Clear hierarchy |

### 7.2 Chart-Specific Guidance

#### HRV Trend (Area Chart)
- Line: `#00F19F`, 2px stroke, slight curve tension
- Fill: gradient from `rgba(0,241,159,0.15)` at line → `transparent` at baseline
- Average line: `#00B377`, 1.5px, dashed
- Animate line drawing on mount (1s ease-out)
- Glow effect: `filter: drop-shadow(0 0 6px rgba(0,241,159,0.3))` on the line

#### Sleep Architecture (Stacked Bar)
- Deep: `#6366F1` (indigo) — the most valuable sleep stage gets the richest color
- REM: `#A855F7` (purple) — distinct but related to deep
- Light: `#38BDF8` (sky) — cooler, less prominent
- Awake: `#3F3F46` (zinc-700) — barely visible, it's a negative metric
- Bar radius: 4px top on the topmost segment only
- Bar gap: 4px between bars

#### Strain vs Recovery (Scatter)
- Recovery dots: `#00F19F` with 70% opacity, 8px radius
- Strain dots: `#F59E0B` with 70% opacity, 8px radius
- Hover: scale to 12px + glow ring
- Quadrant lines: dashed, `#3F3F46`
- Optimal zone: subtle green-tinted rectangle overlay

### 7.3 Chart Animation

- **Mount:** Lines draw left-to-right (800ms, ease-out). Bars grow upward (600ms, spring).
- **Data update:** Smooth interpolation (400ms) — values transition, never pop.
- **Hover:** Tooltip appears with 100ms fade-in. Nearest data point gets emphasis (larger dot, glow).
- **Respect `prefers-reduced-motion`:** Disable all chart animations if set.

---

## 8. Animation & Motion

### 8.1 Timing Tokens

| Token | Duration | Easing | Usage |
|-------|----------|--------|-------|
| `duration-fast` | 100ms | ease-out | Hover color changes |
| `duration-normal` | 200ms | ease-out | Element transitions, button states |
| `duration-smooth` | 300ms | cubic-bezier(0.4, 0, 0.2, 1) | Card transitions, panel slides |
| `duration-slow` | 500ms | cubic-bezier(0.16, 1, 0.3, 1) | Page transitions, chart mounts |
| `duration-breathe` | 3000ms | ease-in-out | Breathing glow, idle pulses |

### 8.2 Motion Patterns

| Pattern | Implementation | When |
|---------|---------------|------|
| **Fade in up** | `opacity 0→1, translateY 8px→0`, 400ms | Cards mounting on page load |
| **Slide in right** | `translateX 100%→0`, 300ms ease-out | Chat panel opening |
| **Breathing glow** | `opacity 0.4→1→0.4` on glow element, 3s loop | Active data indicators, "live" feel |
| **Metric count-up** | Number animates from 0 to value, 800ms | Metric cards on mount or data refresh |
| **Spring press** | `scale(0.97)` on active, spring-back on release | All buttons, clickable cards |
| **Stagger children** | Each child delays 50ms after previous | Card grids mounting |

### 8.3 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 9. Iconography

### 9.1 Icon Library

Use **Lucide React** (`lucide-react`).

- Consistent 24x24 viewBox
- 1.5px stroke weight (matches Inter's visual weight)
- Use `currentColor` for stroke — icons inherit text color

### 9.2 Icon Sizing

| Context | Size | Tailwind |
|---------|------|----------|
| Inline with text | 16px | `w-4 h-4` |
| Button icons | 18px | `w-[18px] h-[18px]` |
| Card header icons | 20px | `w-5 h-5` |
| Feature icons | 24px | `w-6 h-6` |
| Empty state | 40px | `w-10 h-10` |

### 9.3 Icon Usage

- **Never use emojis as icons.** Always SVG via Lucide.
- Pair icons with labels in navigation — icon-only if the meaning is universally clear (close, search, settings).
- Metric trend: use `TrendingUp`, `TrendingDown`, `Minus` from Lucide for trend indicators.
- Status dots: Use a simple `<span>` with rounded-full and semantic bg color instead of icons.

---

## 10. Component-Specific Guidance

### 10.1 Dashboard (Layout Shell)

**Current:** Single column, max-w-[1000px], basic header.
**Target:** Full-width header with metrics bar, wider content area, responsive grid.

```
┌──────────────────────────────────────────────────┐
│  HEADER BAR                                       │
│  Logo / Title          Date        [Chat] [⚙]    │
├──────────────────────────────────────────────────┤
│                                                    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐             │
│  │Recovery │ │  Strain │ │  Sleep  │  ← Metric   │
│  │  87%    │ │  14.2   │ │  7h42m  │    Cards     │
│  │  ▲ 5%   │ │  ▼ 1.1  │ │  ▲ 23m  │  (top row)  │
│  └─────────┘ └─────────┘ └─────────┘             │
│                                                    │
│  ┌──────────────────┐ ┌──────────────────┐        │
│  │   HRV Trend      │ │ Sleep Breakdown  │        │
│  │   ▂▃▅▆▇█▇▆▅      │ │ ████████████     │        │
│  │                   │ │                  │        │
│  └──────────────────┘ └──────────────────┘        │
│                                                    │
│  ┌──────────────────────────────────────┐         │
│  │  AI Recommendation                    │         │
│  │  + Prompt input                       │         │
│  │  + Agent steps + Citations            │         │
│  └──────────────────────────────────────┘         │
│                                                    │
└──────────────────────────────────────────────────┘
                                    ┌──────────────┐
                                    │  Chat Panel  │
                                    │  (slide-out) │
                                    │              │
                                    │              │
                                    └──────────────┘
```

- **Header:** Sticky, `h-16`, `bg-surface/80 backdrop-blur-xl border-b border-border`. Frosted glass effect.
- **Metric cards row:** 3-column grid at top. These are the "vital signs" — always visible.
- **Charts:** 2-column grid below metrics. Each chart in a card with proper padding and title.
- **AI section:** Full-width below charts. The recommendation engine is the main interactive area.
- **Max width:** `1200px` (up from 1000px).

### 10.2 BiometricCharts

**Current:** Three charts stacked vertically.
**Target:** 2-column responsive grid with individual chart cards.

Each chart card:
```
┌─────────────────────────────────────┐
│  ○ HRV Trend                  7d ▾  │  ← Title + time range selector
│                                      │
│  Current: 62ms                       │  ← Current value callout
│  Avg: 58ms  ▲ 6.9%                  │  ← Comparison
│                                      │
│  ╭──╮                                │
│  │  ╰──╮    ╭──╮                     │  ← Chart with glow
│  │     ╰──╮╭╯  ╰──                  │
│  ╰────────╰╯──────────              │
│  Mon  Tue  Wed  Thu  Fri  Sat  Sun   │
└─────────────────────────────────────┘
```

- Each chart gets its own card with consistent structure: **title → key value → chart → axis**
- Chart cards should have their semantic glow (HRV → green, strain → amber)
- Time range selector (7d / 30d / 90d) as small pill buttons in the card header
- Current metric value displayed prominently above the chart

### 10.3 RecommendationCard

**Current:** Single card with prompt input and agent step timeline.
**Target:** Two-part layout — input area and results area.

```
┌─────────────────────────────────────────────┐
│  ✦ AI Training Intelligence                  │
│                                               │
│  ┌─────────────────────────────────┐  [Go]   │
│  │ Ask about your training...       │         │
│  └─────────────────────────────────┘         │
│                                               │
│  ── Agent Working ──────────────────          │
│  ✓ Analyzing biometric data         0.4s     │
│  ✓ Retrieving research              1.2s     │
│  ● Generating recommendation...              │
│                                               │
│  ── Recommendation ─────────────────          │
│  ## Recovery Day Protocol                     │
│  Based on your HRV trend (declining 8%)...   │
│                                               │
│  ┌─ Citations ──────────────────────┐        │
│  │ [1] Sleep & Recovery (0.92)      │        │
│  │ [2] HRV Training Guide (0.87)    │        │
│  └──────────────────────────────────┘        │
└─────────────────────────────────────────────┘
```

- Agent step timeline: Each step gets a status icon (checkmark, spinner, dot), name, and duration
- Steps use a vertical line connector (left border) for visual continuity
- Recommendation renders as styled markdown with proper heading/list styles
- Citations are collapsible, showing relevance score as a small bar

### 10.4 ChatInterface

**Current:** Slide-out panel from right.
**Target:** Same pattern, but elevated styling.

- Panel width: `420px` on desktop, full-width on mobile
- Header: `bg-panel border-b border-border`, with title and close button
- Messages: Follow chat message styles from 6.5
- Input area: Fixed to bottom of panel, `bg-panel border-t border-border`
- Agent tool steps inline: Collapsed by default, expandable, styled as system messages
- Smooth slide-in animation (300ms, ease-out)
- Backdrop: semi-transparent overlay with `backdrop-blur-sm`

### 10.5 CitationPanel

**Current:** List of citations with relevance scores.
**Target:** Collapsible section with visual relevance indicators.

```
┌─ Research Sources ──────────────────────────┐
│                                              │
│  ┌──┐ Sleep & Athletic Recovery     0.92    │
│  │██│ J Sports Med, 2023                    │
│  └──┘ "Optimal recovery requires..."        │
│                                              │
│  ┌──┐ HRV-Guided Training          0.87    │
│  │█▒│ Eur J Appl Physiol, 2022              │
│  └──┘                                       │
│                                              │
└──────────────────────────────────────────────┘
```

- Relevance score shown as both a number and a small filled bar
- Each citation card is expandable to show the excerpt
- Topic tags as small badges
- Source file/journal as muted secondary text

---

## 11. Tailwind v4 Implementation

All tokens defined via the `@theme` block in `index.css`. No `tailwind.config.js` needed.

```css
@import "tailwindcss";

@theme {
  /* Surfaces */
  --color-surface: #09090B;
  --color-surface-raised: #111114;
  --color-card: #16161A;
  --color-card-hover: #1C1C22;
  --color-panel: #1E1E24;

  /* Accents */
  --color-accent: #00F19F;
  --color-accent-dim: #00B377;
  --color-accent-glow: rgba(0, 241, 159, 0.12);
  --color-accent-subtle: rgba(0, 241, 159, 0.06);
  --color-blue: #3B82F6;
  --color-blue-dim: #2563EB;
  --color-blue-glow: rgba(59, 130, 246, 0.12);

  /* Semantic */
  --color-success: #00F19F;
  --color-warning: #F59E0B;
  --color-danger: #EF4444;
  --color-info: #3B82F6;

  /* Text */
  --color-primary: #FAFAFA;
  --color-secondary: #A1A1AA;
  --color-muted: #71717A;
  --color-ghost: #3F3F46;

  /* Borders */
  --color-border: rgba(255, 255, 255, 0.06);
  --color-border-light: rgba(255, 255, 255, 0.10);
  --color-border-accent: rgba(0, 241, 159, 0.20);

  /* Charts */
  --color-chart-recovery: #00F19F;
  --color-chart-strain: #F59E0B;
  --color-chart-heart: #EF4444;
  --color-chart-sleep-deep: #6366F1;
  --color-chart-sleep-rem: #A855F7;
  --color-chart-sleep-light: #38BDF8;
  --color-chart-baseline: #3F3F46;
  --color-chart-area-fill: rgba(0, 241, 159, 0.08);

  /* Typography */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 18px;
}
```

---

## 12. New Dependency

Add `lucide-react` for icons:

```bash
npm install lucide-react
```

No other new dependencies needed. Recharts stays. React Markdown stays.

---

## 13. Pre-Implementation Checklist

- [ ] No emojis as icons — use Lucide React SVGs
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover transitions: 150ms for color, 200ms for layout
- [ ] Focus-visible rings on all interactive elements
- [ ] `prefers-reduced-motion` respected for all animations
- [ ] `font-variant-numeric: tabular-nums` on all metric displays
- [ ] Text contrast minimum 4.5:1 (WCAG AA)
- [ ] Responsive at 375px, 768px, 1024px, 1280px
- [ ] No horizontal scroll on any breakpoint
- [ ] Chart tooltips keyboard-accessible
