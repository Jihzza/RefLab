import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Custom hook for managing test countdown timer
 *
 * Features:
 * - Counts down from limitSeconds to 0
 * - Calls onExpire when timer reaches 0
 * - Returns formatted time string (MM:SS)
 * - Returns elapsed time
 * - Auto-cleanup on unmount
 *
 * @param limitSeconds - Time limit in seconds (e.g., 2400 = 40 minutes)
 * @param onExpire - Callback function to execute when timer reaches 0
 */
export function useTestTimer(
  limitSeconds: number,
  onExpire: () => void
) {
  const [timeRemaining, setTimeRemaining] = useState(limitSeconds)
  const startTimeRef = useRef<number>(Date.now())
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const onExpireRef = useRef(onExpire)

  // Keep onExpire callback up to date
  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    // Record start time
    startTimeRef.current = Date.now()

    // Start interval
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
      const remaining = Math.max(0, limitSeconds - elapsed)

      setTimeRemaining(remaining)

      if (remaining === 0) {
        // Timer expired
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
        onExpireRef.current()
      }
    }, 1000)

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [limitSeconds])

  const getElapsed = useCallback(() => {
    return limitSeconds - timeRemaining
  }, [limitSeconds, timeRemaining])

  return {
    timeRemaining,
    formatted: formatTime(timeRemaining),
    elapsed: getElapsed(),
  }
}

/**
 * Format seconds to MM:SS string
 *
 * @param seconds - Number of seconds
 * @returns Formatted string (e.g., "28:45")
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Get color class based on time remaining
 * - Normal: > 5 minutes
 * - Warning (yellow): 1-5 minutes
 * - Critical (red): < 1 minute
 *
 * @param timeRemaining - Seconds remaining
 * @returns CSS color class
 */
export function getTimerColorClass(timeRemaining: number): string {
  if (timeRemaining <= 60) {
    // Last minute - red
    return 'text-(--error)'
  } else if (timeRemaining <= 300) {
    // Last 5 minutes - yellow/warning
    return 'text-(--warning)'
  } else {
    // Normal - default text color
    return 'text-(--text-primary)'
  }
}
