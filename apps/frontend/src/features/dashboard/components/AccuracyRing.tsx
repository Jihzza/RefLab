import { useTranslation } from 'react-i18next'
import { accuracyColor } from './accuracyColor'

interface AccuracyRingProps {
  /** 0-100 percentage to render, or null for the empty/pending state */
  value: number | null
  /** Diameter of the ring in pixels */
  size?: number
  /** Stroke thickness in pixels */
  stroke?: number
}

/**
 * AccuracyRing — SVG progress ring that leads the dashboard.
 * Renders a large tabular numeral in the center with a referee-semantic
 * arc (green good / yellow mid / red low). Null renders a dashed placeholder.
 */
export default function AccuracyRing({
  value,
  size = 148,
  stroke = 12,
}: AccuracyRingProps) {
  const { t } = useTranslation()
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = value === null ? 0 : Math.min(Math.max(value, 0), 100)
  const dashOffset = circumference - (clamped / 100) * circumference
  const color = value === null ? 'var(--border-strong)' : accuracyColor(value)
  const center = size / 2

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={
        value === null
          ? t('No accuracy data yet')
          : t('Overall accuracy {{value}}%', { value })
      }
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--bg-surface-2)"
          strokeWidth={stroke}
        />
        {/* Progress arc */}
        {value !== null && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{
              transition: 'stroke-dashoffset var(--dur-slow) var(--ease-out)',
              filter: `drop-shadow(0 0 8px ${color}55)`,
            }}
          />
        )}
      </svg>

      {/* Center readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {value === null ? (
          <span className="numeral text-3xl font-extrabold text-(--text-faint)">
            —
          </span>
        ) : (
          <span className="flex items-baseline">
            <span
              className="numeral text-4xl font-black leading-none"
              style={{ color }}
            >
              {value}
            </span>
            <span className="numeral text-lg font-bold ml-0.5" style={{ color }}>
              %
            </span>
          </span>
        )}
      </div>
    </div>
  )
}
