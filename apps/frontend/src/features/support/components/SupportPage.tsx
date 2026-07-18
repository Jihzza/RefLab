import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Headphones,
  Send,
  ShieldCheck,
} from 'lucide-react'
import { useContext, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { Button, Input, Surface, TextArea } from '@/components/ui'
import { AuthContext } from '@/features/auth/components/AuthContext'

const FORM_NAME = 'reflab-support'
const FORM_ENDPOINT = '/__forms.html'
const MESSAGE_MIN_LENGTH = 20
const MESSAGE_MAX_LENGTH = 3000

const SUPPORT_TOPICS = [
  { value: 'general', label: 'General question' },
  { value: 'technical', label: 'Technical issue' },
  { value: 'account', label: 'Account and access' },
  { value: 'billing', label: 'Billing and subscriptions' },
  { value: 'privacy', label: 'Privacy request' },
  { value: 'feedback', label: 'Product feedback' },
] as const

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error'

function encodeFormData(formData: FormData) {
  const body = new URLSearchParams()

  formData.forEach((value, key) => {
    if (typeof value === 'string') body.append(key, value)
  })

  return body.toString()
}

export default function SupportPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const auth = useContext(AuthContext)
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle')
  const [messageError, setMessageError] = useState<string | null>(null)
  const confirmationRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (submissionState !== 'success') return
    const frame = window.requestAnimationFrame(() => confirmationRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [submissionState])

  const selectedTopic = useMemo(() => {
    const requestedTopic = searchParams.get('topic')
    return SUPPORT_TOPICS.some((topic) => topic.value === requestedTopic)
      ? requestedTopic ?? 'general'
      : 'general'
  }, [searchParams])

  const pagePath = location.pathname.slice(0, 500)
  const defaultName = auth?.profile?.name?.slice(0, 100) ?? ''
  const defaultEmail = auth?.user?.email?.slice(0, 254) ?? ''
  const returnPath = auth?.user ? '/app' : '/'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const messageField = form.elements.namedItem('message')

    if (!(messageField instanceof HTMLTextAreaElement)) return

    const message = messageField.value.trim()
    if (message.length < MESSAGE_MIN_LENGTH) {
      setMessageError(t('Please write at least 20 characters so we can understand the request.'))
      messageField.focus()
      return
    }

    setMessageError(null)
    setSubmissionState('submitting')

    const formData = new FormData(form)
    formData.set('form-name', FORM_NAME)
    formData.set('message', message)
    formData.set('name', String(formData.get('name') ?? '').trim())
    formData.set('email', String(formData.get('email') ?? '').trim())
    formData.set('path', pagePath)

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 15_000)

    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encodeFormData(formData),
        signal: controller.signal,
      })

      if (!response.ok) throw new Error(`Support form returned ${response.status}`)

      form.reset()
      setSubmissionState('success')
    } catch {
      setSubmissionState('error')
    } finally {
      window.clearTimeout(timeoutId)
    }
  }

  return (
    <div className="min-h-screen bg-(--mc-color-canvas) text-(--mc-color-text)">
      <header className="border-b border-(--mc-color-border) bg-(--mc-color-surface)/90 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4">
          <Link
            to={returnPath}
            className="mc-focus-ring inline-flex min-h-11 items-center gap-2 rounded-(--mc-radius-button) px-2 text-sm font-semibold text-(--mc-color-text-secondary) hover:text-(--mc-color-accent)"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t('Back to RefLab')}
          </Link>
          <div className="inline-flex items-center gap-2 font-extrabold" aria-label="RefLab">
            <span className="flex gap-0.5" aria-hidden="true">
              <span className="h-5 w-1.5 -skew-x-[24deg] bg-[#ffd000]" />
              <span className="h-5 w-1.5 -skew-x-[24deg] bg-[#ff8a00]" />
              <span className="h-5 w-1.5 -skew-x-[24deg] bg-[#ed1c24]" />
            </span>
            RefLab
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-6">
          <p className="mc-eyebrow mb-2">{t('Support')}</p>
          <h1 className="text-3xl font-extrabold tracking-[-0.035em] text-(--mc-color-text) sm:text-4xl">
            {t('Contact support')}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-(--mc-color-text-secondary) sm:text-base">
            {t('Tell us what happened and our team will review your request.')}
          </p>
        </header>

        {submissionState === 'success' ? (
          <Surface padding="lg" className="text-center">
            <div ref={confirmationRef} tabIndex={-1} className="outline-none">
              <CheckCircle2 className="mx-auto size-10 text-(--mc-color-success)" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-bold text-(--mc-color-text)">{t('Request sent')}</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-(--mc-color-text-secondary)" role="status">
                {t('We received your message. If a reply is needed, we will use the email you provided.')}
              </p>
              <Button className="mt-6" onClick={() => setSubmissionState('idle')}>
                {t('Send another request')}
              </Button>
            </div>
          </Surface>
        ) : (
          <Surface padding="lg">
            <form
              name={FORM_NAME}
              method="POST"
              data-netlify="true"
              netlify-honeypot="bot-field"
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <input type="hidden" name="form-name" value={FORM_NAME} />
              <input type="hidden" name="path" value={pagePath} />
              <p hidden aria-hidden="true">
                <label>
                  Do not fill this field
                  <input name="bot-field" type="text" tabIndex={-1} autoComplete="off" maxLength={100} />
                </label>
              </p>

              <div>
                <label htmlFor="support-topic" className="mb-1.5 block text-sm font-medium text-(--mc-color-text-secondary)">
                  {t('Topic')} <span className="text-(--mc-color-danger)" aria-hidden="true">*</span>
                </label>
                <select
                  id="support-topic"
                  name="topic"
                  required
                  defaultValue={selectedTopic}
                  className="min-h-11 w-full rounded-(--mc-radius-input) border border-(--mc-color-border) bg-(--mc-color-surface-raised) px-3 py-2.5 text-sm text-(--mc-color-text) shadow-sm hover:border-(--mc-color-border-strong) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus) focus-visible:ring-offset-1 focus-visible:ring-offset-(--mc-color-canvas)"
                >
                  {SUPPORT_TOPICS.map((topic) => (
                    <option key={topic.value} value={topic.value}>{t(topic.label)}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Input
                  id="support-name"
                  name="name"
                  label={`${t('Name')} (${t('optional')})`}
                  defaultValue={defaultName}
                  maxLength={100}
                  autoComplete="name"
                />
                <Input
                  id="support-email"
                  name="email"
                  type="email"
                  label={t('Email')}
                  defaultValue={defaultEmail}
                  maxLength={254}
                  autoComplete="email"
                  required
                />
              </div>

              <TextArea
                id="support-message"
                name="message"
                label={t('Message')}
                rows={8}
                minLength={MESSAGE_MIN_LENGTH}
                maxLength={MESSAGE_MAX_LENGTH}
                required
                error={messageError}
                onInput={() => {
                  if (messageError) setMessageError(null)
                }}
                hint={t('Write between 20 and 3,000 characters. Do not include passwords, card details or authentication codes.')}
              />

              {submissionState === 'error' && (
                <div className="flex gap-3 rounded-(--mc-radius-button) border border-(--mc-color-danger)/40 bg-(--mc-color-danger)/10 p-3 text-sm text-(--mc-color-danger)" role="alert">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                  <span>{t("We couldn't send your request. Check your connection and try again.")}</span>
                </div>
              )}

              <div className="flex flex-col gap-4 border-t border-(--mc-color-border) pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex max-w-md gap-2 text-xs leading-5 text-(--mc-color-text-muted)">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    {t('We only use these details to review and respond to your request.')}{' '}
                    <Link to="/privacy" className="mc-focus-ring rounded-sm font-semibold text-(--mc-color-info) underline underline-offset-2">
                      {t('Privacy Policy')}
                    </Link>
                  </span>
                </p>
                <Button
                  type="submit"
                  loading={submissionState === 'submitting'}
                  loadingText={t('Sending...')}
                  leadingIcon={<Send className="size-4" />}
                  className="shrink-0"
                >
                  {t('Send request')}
                </Button>
              </div>
            </form>
          </Surface>
        )}

        <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-(--mc-color-text-muted)">
          <Headphones className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t('This form is for product support and privacy requests. Emergencies should use the appropriate local services.')}
        </p>
      </main>
    </div>
  )
}
