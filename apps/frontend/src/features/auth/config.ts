/**
 * Google OAuth is strict opt-in for launch. This keeps a provider that is still
 * in testing or missing approved legal/branding URLs out of the public UI.
 */
export const GOOGLE_OAUTH_ENABLED = import.meta.env.VITE_GOOGLE_OAUTH_ENABLED === 'true'

/**
 * CAPTCHA is also strict opt-in. The public forms must never appear protected
 * unless both the frontend widget and Supabase Auth are configured with the
 * matching hCaptcha credentials.
 */
export interface CaptchaConfiguration {
  configured: boolean
  enabled: boolean
  siteKey: string
}

export function resolveCaptchaConfiguration(
  enabledValue: string | undefined,
  siteKeyValue: string | undefined,
): CaptchaConfiguration {
  const enabled = enabledValue === 'true'
  const siteKey = siteKeyValue?.trim() ?? ''

  return {
    configured: !enabled || siteKey.length > 0,
    enabled,
    siteKey,
  }
}

export function isCaptchaSubmissionReadyFor(
  configuration: Pick<CaptchaConfiguration, 'configured' | 'enabled'>,
  token: string | null,
): boolean {
  return !configuration.enabled || (configuration.configured && Boolean(token))
}

const captchaConfiguration = resolveCaptchaConfiguration(
  import.meta.env.VITE_CAPTCHA_ENABLED,
  import.meta.env.VITE_HCAPTCHA_SITE_KEY,
)

export const CAPTCHA_ENABLED = captchaConfiguration.enabled
export const HCAPTCHA_SITE_KEY = captchaConfiguration.siteKey
export const CAPTCHA_CONFIGURED = captchaConfiguration.configured

export function isCaptchaSubmissionReady(token: string | null): boolean {
  return isCaptchaSubmissionReadyFor(captchaConfiguration, token)
}
