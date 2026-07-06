/**
 * Referee color semantics for accuracy / performance values.
 * green = strong (advantage), yellow = caution (mid), red = sanction (low).
 * Returns a CSS var() string usable in style props and SVG strokes.
 */
export function accuracyColor(accuracy: number): string {
  if (accuracy >= 80) return 'var(--success)'
  if (accuracy >= 60) return 'var(--warning)'
  return 'var(--error)'
}
