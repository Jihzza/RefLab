// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildAuthLandingUrl,
  consumeAuthReturnTo,
  persistAuthReturnTo,
  resolveAuthReturnTo,
  sanitizeAuthReturnTo,
} from './authNavigation'

beforeEach(() => {
  window.sessionStorage.clear()
  vi.useRealTimers()
})

describe('auth return navigation', () => {
  it.each([
    'https://evil.example/app/dashboard',
    '//evil.example/app/dashboard',
    '/app\\dashboard',
    '/public',
    ' /app/dashboard',
    '/app/dashboard\u0000',
  ])('rejects unsafe return path %s', (candidate) => {
    expect(sanitizeAuthReturnTo(candidate)).toBe('/app/dashboard')
  })

  it('preserves an internal app path including search and hash', () => {
    expect(sanitizeAuthReturnTo('/app/messages/abc?focus=1#latest'))
      .toBe('/app/messages/abc?focus=1#latest')
  })

  it('preserves a protected admin return path without widening to public routes', () => {
    expect(sanitizeAuthReturnTo('/admin/moderation')).toBe('/admin/moderation')
  })

  it('expires stored return intents and consumes fresh ones once', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-18T12:00:00.000Z'))
    persistAuthReturnTo('/app/settings')
    expect(resolveAuthReturnTo('')).toBe('/app/settings')
    expect(consumeAuthReturnTo('')).toBe('/app/settings')
    expect(resolveAuthReturnTo('')).toBe('/app/dashboard')

    persistAuthReturnTo('/app/profile')
    vi.advanceTimersByTime(31 * 60 * 1000)
    expect(resolveAuthReturnTo('')).toBe('/app/dashboard')
  })

  it('builds a safe landing URL and ignores an unknown plan', () => {
    expect(buildAuthLandingUrl('signup', '//evil.example', 'enterprise' as never))
      .toBe('/?auth=signup&returnTo=%2Fapp%2Fdashboard#auth')
  })
})
