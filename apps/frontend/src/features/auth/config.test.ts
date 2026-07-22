import { describe, expect, it } from 'vitest'
import { isCaptchaSubmissionReadyFor, resolveCaptchaConfiguration } from './config'

describe('CAPTCHA launch configuration', () => {
  it('is strict opt-in', () => {
    expect(resolveCaptchaConfiguration('TRUE', 'site-key').enabled).toBe(false)
    expect(resolveCaptchaConfiguration('1', 'site-key').enabled).toBe(false)
    expect(resolveCaptchaConfiguration('true', 'site-key').enabled).toBe(true)
  })

  it('fails closed when enabled without a site key', () => {
    const configuration = resolveCaptchaConfiguration('true', '   ')

    expect(configuration.configured).toBe(false)
    expect(isCaptchaSubmissionReadyFor(configuration, 'token')).toBe(false)
  })

  it('requires a token only when enabled and configured', () => {
    const enabled = resolveCaptchaConfiguration('true', ' site-key ')
    const disabled = resolveCaptchaConfiguration('false', undefined)

    expect(enabled.siteKey).toBe('site-key')
    expect(isCaptchaSubmissionReadyFor(enabled, null)).toBe(false)
    expect(isCaptchaSubmissionReadyFor(enabled, 'verified-token')).toBe(true)
    expect(isCaptchaSubmissionReadyFor(disabled, null)).toBe(true)
  })
})
