import { BookOpen } from 'lucide-react'
import type { TopicAccuracy } from '../types'

interface TopicAccuracyCardProps {
  topics: TopicAccuracy[]
}

/**
 * TopicAccuracyCard — Displays accuracy breakdown per topic as a vertical list
 * with inline progress bars and percentage values.
 */
export default function TopicAccuracyCard({ topics }: TopicAccuracyCardProps) {
  const hasTopics = topics.length > 0

  return (
    <div
      className="bg-(--bg-surface) rounded-2xl p-4 shadow-sm border border-(--border-subtle)"
      role="region"
      aria-label="Accuracy by topic"
    >
      <h3 className="text-[11px] font-bold text-(--text-secondary) uppercase tracking-wider mb-3">
        Accuracy by Topic
      </h3>

      {hasTopics ? (
        <div className="space-y-0">
          {topics.map((topic) => (
            <div
              key={topic.topic}
              className="flex items-center justify-between py-2.5 border-b border-(--border-subtle) last:border-b-0"
            >
              {/* Topic name */}
              <span className="text-sm text-(--text-primary) flex-1 mr-3 truncate">
                {topic.topic}
              </span>

              {/* Bar + percentage */}
              <div className="flex items-center gap-2.5 shrink-0">
                {/* Progress bar (fixed width) */}
                <div
                  className="w-20 bg-(--bg-surface-2) h-1.5 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={topic.accuracy}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${topic.topic}: ${topic.accuracy}%`}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(topic.accuracy, 100)}%`,
                      backgroundColor: getBarColor(topic.accuracy),
                    }}
                  />
                </div>

                {/* Percentage */}
                <span
                  className="text-xs font-semibold w-10 text-right"
                  style={{ color: getBarColor(topic.accuracy) }}
                >
                  {topic.accuracy}%
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <BookOpen size={20} className="text-(--text-muted) mb-2" aria-hidden="true" />
          <p className="text-xs text-(--text-muted)">
            Complete tests to see topic breakdown
          </p>
        </div>
      )}
    </div>
  )
}

/** Returns a color based on accuracy percentage */
function getBarColor(accuracy: number): string {
  if (accuracy >= 80) return 'var(--success)'
  if (accuracy >= 60) return 'var(--warning)'
  return 'var(--error)'
}
