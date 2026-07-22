import HCaptcha from '@hcaptcha/react-hcaptcha'
import { useTranslation } from 'react-i18next'
import { CAPTCHA_ENABLED, HCAPTCHA_SITE_KEY } from '../config'

interface CaptchaChallengeProps {
  onError: () => void
  onTokenChange: (token: string | null) => void
}

export default function CaptchaChallenge({ onError, onTokenChange }: CaptchaChallengeProps) {
  const { t, i18n } = useTranslation()

  if (!CAPTCHA_ENABLED) return null

  if (!HCAPTCHA_SITE_KEY) {
    return (
      <div
        role="alert"
        className="rounded-(--mc-radius-input) border border-(--mc-color-danger)/45 bg-(--mc-color-danger)/10 px-3 py-2.5 text-sm leading-5 text-(--mc-color-danger)"
      >
        {t('Security check unavailable. Please try again later.')}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div
        role="group"
        className="max-w-full overflow-x-auto rounded-(--mc-radius-input)"
        aria-label={t('Security check')}
      >
        <HCaptcha
          sitekey={HCAPTCHA_SITE_KEY}
          theme="dark"
          languageOverride={i18n.resolvedLanguage?.split('-')[0] ?? 'pt'}
          onVerify={(token) => onTokenChange(token)}
          onExpire={() => onTokenChange(null)}
          onChalExpired={() => onTokenChange(null)}
          onError={() => {
            onTokenChange(null)
            onError()
          }}
        />
      </div>
      <p className="text-[11px] leading-4 text-(--mc-color-text-muted)">
        {t('Protected by hCaptcha.')} {' '}
        <a
          className="underline-offset-2 hover:underline"
          href="https://www.hcaptcha.com/privacy"
          rel="noopener noreferrer"
          target="_blank"
        >
          {t('Privacy Policy')}
        </a>
        {' · '}
        <a
          className="underline-offset-2 hover:underline"
          href="https://www.hcaptcha.com/terms"
          rel="noopener noreferrer"
          target="_blank"
        >
          {t('Terms of Service')}
        </a>
      </p>
    </div>
  )
}
