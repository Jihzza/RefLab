import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowLeft, Check, Loader2, MapPin, Scale } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, EmptyState, Surface } from '@/components/ui'
import { getDistinctAreas, getDistinctLaws } from '../../api/testsApi'

// Human-readable names for FIFA laws that appear in the question bank
const LAW_NAMES: Record<number, string> = {
  11: 'Offside',
  12: 'Fouls & Misconduct',
  13: 'Free Kicks',
  14: 'Penalty Kick',
}

interface QuestionsSetupProps {
  mode: 'by_law' | 'by_area'
  onStart: (selectedLaws: number[], selectedAreas: string[]) => void
  onBack: () => void
  creating?: boolean
}

/**
 * QuestionsSetup - Filter configuration screen for By Law and By Area modes
 *
 * Renders multi-select controls for laws or areas. The user must select at
 * least one before the "Start Session" CTA is enabled.
 */
export default function QuestionsSetup({ mode, onStart, onBack, creating = false }: QuestionsSetupProps) {
  const { t } = useTranslation()
  const [laws, setLaws] = useState<number[]>([])
  const [areas, setAreas] = useState<string[]>([])
  const [selectedLaws, setSelectedLaws] = useState<number[]>([])
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [loadVersion, setLoadVersion] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoadError(false)
      if (mode === 'by_law') {
        const { data, error } = await getDistinctLaws()
        if (!cancelled && error) setLoadError(true)
        if (!cancelled && data) setLaws(data)
      } else {
        const { data, error } = await getDistinctAreas()
        if (!cancelled && error) setLoadError(true)
        if (!cancelled && data) setAreas(data)
      }
      if (!cancelled) setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [loadVersion, mode])

  const toggleLaw = (law: number) => {
    setSelectedLaws((previous) =>
      previous.includes(law) ? previous.filter((item) => item !== law) : [...previous, law],
    )
  }

  const toggleArea = (area: string) => {
    setSelectedAreas((previous) =>
      previous.includes(area) ? previous.filter((item) => item !== area) : [...previous, area],
    )
  }

  const selectAllLaws = () => setSelectedLaws([...laws])
  const clearLaws = () => setSelectedLaws([])
  const selectAllAreas = () => setSelectedAreas([...areas])
  const clearAreas = () => setSelectedAreas([])

  const selectedCount = mode === 'by_law' ? selectedLaws.length : selectedAreas.length
  const canStart = selectedCount > 0
  const hasOptions = mode === 'by_law' ? laws.length > 0 : areas.length > 0
  const selectionLabel = t(
    mode === 'by_law'
      ? (selectedCount === 1 ? 'law selected' : 'laws selected')
      : (selectedCount === 1 ? 'area selected' : 'areas selected'),
  )

  const handleStart = () => {
    onStart(selectedLaws, selectedAreas)
  }

  return (
    <section
      className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-5"
      aria-labelledby="questions-setup-title"
    >
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          disabled={creating}
          leadingIcon={<ArrowLeft className="size-4" />}
          className="-ml-2 shrink-0"
        >
          {t('Back')}
        </Button>
        <div className="min-w-0 pt-1">
          <p className="mc-eyebrow mb-2">
            {mode === 'by_law' ? t('By Law') : t('By Area')}
          </p>
          <h2 id="questions-setup-title" className="mc-page-title">
            {mode === 'by_law' ? t('Select Laws') : t('Select Areas')}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-(--mc-color-text-secondary)">
            {mode === 'by_law'
              ? t('Choose one or more FIFA laws to practise. Questions from all selected laws will appear.')
              : t('Choose one or more areas to practise. Questions from all selected areas will appear.')}
          </p>
        </div>
      </div>

      <Surface
        padding="none"
        className="overflow-hidden border-(--mc-color-border-strong) shadow-none"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--mc-color-border) px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-(--mc-radius-compact) border border-(--mc-color-accent)/40 bg-(--mc-color-accent)/10 text-(--mc-color-accent)"
              aria-hidden="true"
            >
              {mode === 'by_law' ? <Scale className="size-5" /> : <MapPin className="size-5" />}
            </span>
            <p className="text-sm font-semibold text-(--mc-color-text)" aria-live="polite">
              <span className="tabular-nums text-(--mc-color-accent)">{selectedCount}</span>{' '}
              {selectionLabel}
            </p>
          </div>

          {!loading && !loadError && hasOptions && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={mode === 'by_law' ? selectAllLaws : selectAllAreas}
                disabled={creating}
                className="px-2.5 text-(--mc-color-accent)"
              >
                {t('Select all')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={mode === 'by_law' ? clearLaws : clearAreas}
                disabled={creating}
                className="px-2.5"
              >
                {t('Clear')}
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div
            className="flex min-h-52 flex-col items-center justify-center gap-3 px-5 py-12 text-(--mc-color-text-muted)"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="size-6 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            <span className="mc-visually-hidden">{t('Loading questions…')}</span>
          </div>
        ) : loadError ? (
          <EmptyState
            icon={<AlertTriangle className="size-5 text-(--mc-color-danger)" />}
            title={t('Failed to load filters.')}
            description={t('Please try again')}
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setLoading(true)
                  setLoadVersion((version) => version + 1)
                }}
              >
                {t('Try Again')}
              </Button>
            }
          />
        ) : !hasOptions ? (
          <EmptyState
            icon={mode === 'by_law' ? <Scale className="size-5" /> : <MapPin className="size-5" />}
            title={t('No filters available.')}
            action={
              <Button variant="secondary" onClick={onBack}>
                {t('Back')}
              </Button>
            }
          />
        ) : mode === 'by_law' ? (
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5">
            {laws.map((law) => {
              const name = LAW_NAMES[law] ?? `Law ${law}`
              const isSelected = selectedLaws.includes(law)

              return (
                <button
                  key={law}
                  type="button"
                  onClick={() => toggleLaw(law)}
                  disabled={creating}
                  aria-pressed={isSelected}
                  className={`mc-interactive mc-focus-ring flex min-h-16 w-full items-center gap-3 rounded-(--mc-radius-button) border px-3.5 py-3 text-left ${
                    isSelected
                      ? 'border-(--mc-color-accent) bg-(--mc-color-accent)/10 text-(--mc-color-text) shadow-[inset_0_0_0_1px_var(--mc-color-accent)]'
                      : 'border-(--mc-color-border-strong) bg-(--mc-color-canvas) text-(--mc-color-text-secondary) hover:border-(--mc-color-accent)/55 hover:bg-(--mc-color-surface-hover)'
                  }`}
                >
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-(--mc-radius-compact) border text-sm font-extrabold tabular-nums ${
                      isSelected
                        ? 'border-(--mc-color-accent) text-(--mc-color-accent)'
                        : 'border-(--mc-color-border-strong) text-(--mc-color-text)'
                    }`}
                    aria-hidden="true"
                  >
                    {isSelected ? <Check className="size-5" /> : law}
                  </span>
                  <span className="min-w-0 text-sm font-semibold leading-5">
                    {t('Law {{law}} — {{name}}', { law, name: t(name) })}
                  </span>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5">
            {areas.map((area) => {
              const isSelected = selectedAreas.includes(area)

              return (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggleArea(area)}
                  disabled={creating}
                  aria-pressed={isSelected}
                  className={`mc-interactive mc-focus-ring flex min-h-16 w-full items-center gap-3 rounded-(--mc-radius-button) border px-3.5 py-3 text-left ${
                    isSelected
                      ? 'border-(--mc-color-accent) bg-(--mc-color-accent)/10 text-(--mc-color-text) shadow-[inset_0_0_0_1px_var(--mc-color-accent)]'
                      : 'border-(--mc-color-border-strong) bg-(--mc-color-canvas) text-(--mc-color-text-secondary) hover:border-(--mc-color-accent)/55 hover:bg-(--mc-color-surface-hover)'
                  }`}
                >
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-(--mc-radius-compact) border ${
                      isSelected
                        ? 'border-(--mc-color-accent) text-(--mc-color-accent)'
                        : 'border-(--mc-color-border-strong) text-(--mc-color-text)'
                    }`}
                    aria-hidden="true"
                  >
                    {isSelected ? <Check className="size-5" /> : <MapPin className="size-4" />}
                  </span>
                  <span className="min-w-0 text-sm font-semibold leading-5">{area}</span>
                </button>
              )
            })}
          </div>
        )}
      </Surface>

      <div className="relative overflow-hidden rounded-(--mc-radius-button)">
        <Button
          fullWidth
          size="lg"
          onClick={handleStart}
          disabled={!canStart || creating}
          loading={creating}
          loadingText={t('Starting...')}
          className="rounded-none pr-14"
        >
          {t('Start Session')}
          {canStart && (
            <span className="ml-1 text-sm font-normal opacity-75">
              ({selectedCount} {selectionLabel})
            </span>
          )}
        </Button>
        <span
          className="pointer-events-none absolute -bottom-3 -right-3 h-16 w-9 -skew-x-[24deg] bg-(--mc-color-danger)"
          aria-hidden="true"
        />
      </div>
    </section>
  )
}
