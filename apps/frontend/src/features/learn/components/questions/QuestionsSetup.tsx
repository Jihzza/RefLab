import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Check, MapPin, Scale } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Surface } from '@/components/ui'
import { getDistinctAreas, getDistinctLaws } from '../../api/testsApi'
import { LearningError, LearningLoading, LearningMessage, LearningSectionHeading } from '../LearningUI'

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
  createError?: boolean
}

export default function QuestionsSetup({
  mode,
  onStart,
  onBack,
  creating = false,
  createError = false,
}: QuestionsSetupProps) {
  const { t } = useTranslation()
  const [laws, setLaws] = useState<number[]>([])
  const [areas, setAreas] = useState<string[]>([])
  const [selectedLaws, setSelectedLaws] = useState<number[]>([])
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const loadOptions = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    if (mode === 'by_law') {
      const { data, error } = await getDistinctLaws()
      setLaws(data ?? [])
      setLoadError(Boolean(error))
    } else {
      const { data, error } = await getDistinctAreas()
      setAreas(data ?? [])
      setLoadError(Boolean(error))
    }
    setLoading(false)
  }, [mode])

  useEffect(() => {
    let cancelled = false
    const request = mode === 'by_law' ? getDistinctLaws() : getDistinctAreas()
    void request.then(({ data, error }) => {
      if (cancelled) return
      if (mode === 'by_law') setLaws((data ?? []) as number[])
      else setAreas((data ?? []) as string[])
      setLoadError(Boolean(error))
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [mode])

  const toggleLaw = (law: number) => {
    setSelectedLaws((current) => current.includes(law) ? current.filter((item) => item !== law) : [...current, law])
  }

  const toggleArea = (area: string) => {
    setSelectedAreas((current) => current.includes(area) ? current.filter((item) => item !== area) : [...current, area])
  }

  const selectedCount = mode === 'by_law' ? selectedLaws.length : selectedAreas.length
  const optionsCount = mode === 'by_law' ? laws.length : areas.length
  const canStart = selectedCount > 0

  return (
    <div className="space-y-5 md:space-y-6">
      <LearningSectionHeading
        eyebrow={mode === 'by_law' ? t('By Law') : t('By Area')}
        title={mode === 'by_law' ? t('Select Laws') : t('Select Areas')}
        description={mode === 'by_law'
          ? t('Choose one or more FIFA laws to practise. Questions from all selected laws will appear.')
          : t('Choose one or more areas to practise. Questions from all selected areas will appear.')}
        action={(
          <Button variant="ghost" size="sm" leadingIcon={<ArrowLeft size={16} />} onClick={onBack}>
            {t('Back')}
          </Button>
        )}
      />

      {loading ? (
        <LearningLoading label={t('Loading questions…')} />
      ) : loadError ? (
        <LearningError
          title={t('Failed to load questions')}
          description={t('Please try again')}
          retryLabel={t('Try Again')}
          onRetry={() => void loadOptions()}
        />
      ) : optionsCount === 0 ? (
        <LearningMessage
          icon={mode === 'by_law' ? <Scale size={22} /> : <MapPin size={22} />}
          title={t('No questions found for the selected filters.')}
          action={(
            <Button variant="secondary" leadingIcon={<ArrowLeft size={16} />} onClick={onBack}>
              {t('Go Back')}
            </Button>
          )}
        />
      ) : (
        <>
          <Surface padding="sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge variant={selectedCount > 0 ? 'accent' : 'neutral'}>
                {mode === 'by_law'
                  ? `${selectedCount} ${t(selectedCount === 1 ? 'law selected' : 'laws selected')}`
                  : `${selectedCount} ${t(selectedCount === 1 ? 'area selected' : 'areas selected')}`}
              </Badge>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => mode === 'by_law' ? setSelectedLaws([...laws]) : setSelectedAreas([...areas])}
                >
                  {t('Select all')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => mode === 'by_law' ? setSelectedLaws([]) : setSelectedAreas([])}
                  disabled={selectedCount === 0}
                >
                  {t('Clear')}
                </Button>
              </div>
            </div>
          </Surface>

          <div className="grid gap-2 sm:grid-cols-2">
            {mode === 'by_law'
              ? laws.map((law) => {
                  const selected = selectedLaws.includes(law)
                  return (
                    <FilterOption
                      key={law}
                      selected={selected}
                      icon={selected ? <Check size={17} /> : <Scale size={17} />}
                      title={t('Law {{law}} — {{name}}', { law, name: t(LAW_NAMES[law] ?? `Law ${law}`) })}
                      onClick={() => toggleLaw(law)}
                    />
                  )
                })
              : areas.map((area) => {
                  const selected = selectedAreas.includes(area)
                  return (
                    <FilterOption
                      key={area}
                      selected={selected}
                      icon={selected ? <Check size={17} /> : <MapPin size={17} />}
                      title={area}
                      onClick={() => toggleArea(area)}
                    />
                  )
                })}
          </div>

          <Button
            size="lg"
            fullWidth
            disabled={!canStart || creating}
            loading={creating}
            onClick={() => onStart(selectedLaws, selectedAreas)}
          >
            {t('Start Session')}{selectedCount > 0 ? ` · ${selectedCount}` : ''}
          </Button>
          {createError && (
            <div className="rounded-xl border border-(--mc-color-danger)/35 bg-(--mc-color-danger)/10 p-4 text-sm text-(--mc-color-danger)" role="alert">
              {t('Failed to create attempt')} · {t('Please try again')}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function FilterOption({
  selected,
  icon,
  title,
  onClick,
}: {
  selected: boolean
  icon: React.ReactNode
  title: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`mc-focus-ring mc-interactive flex min-h-14 items-center gap-3 rounded-xl border p-3 text-left text-sm font-semibold ${
        selected
          ? 'border-(--mc-color-accent) bg-(--mc-color-accent)/10 text-(--mc-color-text)'
          : 'border-(--mc-color-border) bg-(--mc-color-surface) text-(--mc-color-text-secondary) hover:border-(--mc-color-accent)/45 hover:bg-(--mc-color-surface-hover)'
      }`}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg border ${
        selected
          ? 'border-(--mc-color-accent) bg-(--mc-color-accent) text-(--mc-color-canvas)'
          : 'border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) text-(--mc-color-text-muted)'
      }`} aria-hidden="true">
        {icon}
      </span>
      <span>{title}</span>
    </button>
  )
}
