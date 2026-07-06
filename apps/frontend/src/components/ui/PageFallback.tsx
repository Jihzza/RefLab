/**
 * PageFallback — Suspense fallback shown while a lazily-loaded route chunk
 * is being fetched. Kept intentionally minimal so it does not shift layout.
 */
export default function PageFallback() {
  return (
    <div
      className="flex items-center justify-center py-24"
      role="status"
      aria-live="polite"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-(--border-strong) border-t-(--brand-yellow)" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
