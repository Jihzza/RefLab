# RefLab Design System — "The Referee's Console"

A dark, data-forward, broadcast-analysis aesthetic for a serious football-referee
training + social platform. This document is the contract for redesign work.

## Concept
Think court-side / UEFA match-analysis software: calm, precise, instrument-like.
- **Dark = concentration. Yellow = the decision / highlight. Red = sanction/error. Green = correct/advantage.** Use color with referee meaning, not decoration.
- Depth over flatness: layered surfaces, hairline borders, subtle gradients and glow — never heavy or neon.
- Confident data: big tabular numerals for scores/accuracy; clear hierarchy.
- Motion is purposeful and subtle (fades, slides, hover lifts), never bouncy or distracting.

## Tokens (defined in src/styles/globals.css — ALWAYS use these, never hardcoded hex or Tailwind palette colors like gray-800/blue-500)
Surfaces: `--bg-base` `--bg-primary` `--bg-surface` `--bg-surface-2` `--bg-elevated`
Borders: `--border-subtle` `--border-strong`
Text: `--text-primary` `--text-secondary` `--text-muted` `--text-faint`
Brand: `--brand-yellow` `--brand-yellow-strong` `--brand-yellow-soft` `--brand-red`
Semantic: `--success` `--warning` `--error` `--info`
Interaction: `--bg-hover` `--focus-ring`
Radius: `--radius-card` (18px) `--radius-button` (12px) `--radius-input` `--radius-pill`
Use Tailwind v4 arbitrary syntax as the codebase does: `bg-(--bg-surface)`, `text-(--text-muted)`, `border-(--border-subtle)`, `rounded-(--radius-card)`, opacity like `bg-(--brand-yellow)/10`.

## Signature utility classes (in globals.css — use them)
- `card-console` — elevated panel (gradient sheen + layered shadow + hairline). Prefer this for cards/panels instead of plain `bg-(--bg-surface) border`.
- `glass` — frosted sticky headers/overlays.
- `text-display` / `text-display-sm` — fluid display headings (hero/section titles).
- `eyebrow` — uppercase micro-label above a title.
- `numeral` — tabular numerals for stats/scores (apply to big numbers).
- `flag-accent` — diagonal yellow→red bar; the recurring brand motif (active indicators, section markers). Use as a small `h-x w-1.5 rounded-full flag-accent`.
- `field-lines` — subtle pitch-grid background for hero/feature panels.
- `text-gradient-brand` — gradient fill for special headings/wordmarks (use sparingly).
- `glow-brand` — yellow glow ring for primary focus moments.
- `animate-fade-up` / `animate-fade-in` / `animate-scale-in` — entrance motion (use on page/section mount, sparingly).
- `skeleton` — shimmer loading placeholder (use for loading states instead of a bare spinner where a content skeleton fits).
- `numeral`, `pb-safe` (bottom-nav safe area).

## Primitives (src/components/ui — USE THESE, don't reinvent inputs/buttons)
- `Button` (default export) — props: `variant` ('primary'|'secondary'|'ghost'|'outline'|'danger'), `size` ('sm'|'md'|'lg'), `loading`, `leftIcon`, `rightIcon`, `fullWidth`. Primary = brand gradient + glow. Replace bespoke `<button className="bg-(--brand-yellow)...">` with `<Button>`.
- `Input` (default export) — props: `label`, `error`, `hint`, `leftIcon`, `rightSlot` + native input props. Handles label/error/aria wiring + focus glow. Replace bespoke `<input>` + `<label>` blocks.

## Component patterns
- **Cards/panels:** `card-console p-5 sm:p-6`. Group with clear section headers (`eyebrow` + title). Avoid a monotonous stack of identical cards — vary size/emphasis, lead with the most important metric.
- **Stats:** big `numeral` value + small muted label + optional trend chip (green/red). Consider a progress ring or bar for accuracy.
- **Icons:** lucide-react, `size={16-20}`, decorative icons get `aria-hidden="true"`; icon-only buttons need `aria-label`.
- **Tabs:** segmented control (rounded container `bg-(--bg-surface-2) p-1`, active tab `bg-(--bg-elevated) text-(--text-primary) shadow`), or underline with `flag-accent`/yellow for the active item.
- **Empty states:** centered icon tile + short heading + one `Button` CTA into the relevant flow. Professional copy.
- **Lists/feeds:** clear hierarchy (author → context → content → actions), generous but rhythmic spacing, hover lift on interactive rows (`hover:bg-(--bg-hover)` / subtle translate).
- **Active nav:** yellow text/indicator with a `flag-accent` motif.

## Hard rules
- Preserve ALL behavior, data fetching, props, and `t()` KEY STRINGS exactly (some keys are Spanish/English strings translated in src/i18n/pt-PT.ts — changing a key string breaks its translation). You may ADD new `t('English')` strings; list every new key you introduce so translations can be added.
- Do NOT touch src/i18n/pt-PT.ts (a single consolidation pass owns it).
- Keep the build green: valid TS/JSX, real imports, no unused vars.
- Dark theme only. No emoji as UI. Respect `prefers-reduced-motion` (the global CSS already does for animations).
- Don't change routing, API modules, hooks logic, or Supabase calls — visual/layout only.
- Reuse `Button`/`Input` primitives and the utility classes above rather than re-implementing.
