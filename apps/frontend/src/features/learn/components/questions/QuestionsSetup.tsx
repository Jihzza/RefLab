import { useState, useEffect, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getDistinctLaws, getDistinctAreas } from '../../api/testsApi'

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
}

/**
 * QuestionsSetup - Filter configuration screen for By Law and By Area modes
 *
 * Renders multi-select chips for laws or areas. The user must select at least
 * one before the "Start Session" CTA is enabled.
 */
export default function QuestionsSetup({ mode, onStart, onBack }: QuestionsSetupProps) {
  const { t } = useTranslation()
  const [laws, setLaws] = useState<number[]>([])
  const [areas, setAreas] = useState<string[]>([])
  const [selectedLaws, setSelectedLaws] = useState<number[]>([])
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    if (mode === 'by_law') {
      const { data, error: fetchError } = await getDistinctLaws()
      if (fetchError || !data) {
        setError(fetchError?.message || t('Failed to load options.'))
      } else {
        setLaws(data)
      }
    } else {
      const { data, error: fetchError } = await getDistinctAreas()
      if (fetchError || !data) {
        setError(fetchError?.message || t('Failed to load options.'))
      } else {
        setAreas(data)
      }
    }
    setLoading(false)
  }, [mode, t])

  useEffect(() => {
    load()
  }, [load])

  const toggleLaw = (law: number) => {
    setSelectedLaws(prev =>
      prev.includes(law) ? prev.filter(l => l !== law) : [...prev, law]
    )
  }

  const toggleArea = (area: string) => {
    setSelectedAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    )
  }

  const selectAllLaws = () => setSelectedLaws([...laws])
  const clearLaws = () => setSelectedLaws([])
  const selectAllAreas = () => setSelectedAreas([...areas])
  const clearAreas = () => setSelectedAreas([])

  const canStart = mode === 'by_law' ? selectedLaws.length > 0 : selectedAreas.length > 0

  const handleStart = () => {
    onStart(selectedLaws, selectedAreas)
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-(--radius-button) border border-(--border-subtle) bg-(--bg-surface-2) px-3 py-1.5 text-sm text-(--text-secondary) transition-colors hover:border-(--border-strong) hover:text-(--text-primary)"
        >
          &larr; {t('Back')}
        </button>
        <div>
          <p className="eyebrow">{t('Setup')}</p>
          <h2 className="text-lg font-bold text-(--text-primary)">
            {mode === 'by_law' ? t('Select Laws') : t('Select Areas')}
          </h2>
        </div>
      </div>

      <p className="text-sm text-(--text-secondary) -mt-3">
        {mode === 'by_law'
          ? t('Choose one or more FIFA laws to practise. Questions from all selected laws will appear.')
          : t('Choose one or more areas to practise. Questions from all selected areas will appear.')}
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-(--text-muted) animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-(--error) text-sm mb-3">{error}</p>
          <button
            onClick={() => load()}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium bg-(--brand-yellow) text-(--bg-primary) rounded-(--radius-button) hover:bg-(--brand-yellow-soft) disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('Try Again')}
          </button>
        </div>
      ) : (
        <>
          {/* Select All / Clear All helpers */}
          <div className="flex gap-4 -mt-2">
            <button
              onClick={mode === 'by_law' ? selectAllLaws : selectAllAreas}
              className="text-xs text-(--info) hover:underline"
            >
              {t('Select all')}
            </button>
            <button
              onClick={mode === 'by_law' ? clearLaws : clearAreas}
              className="text-xs text-(--text-muted) hover:underline"
            >
              {t('Clear')}
            </button>
          </div>

          {/* Chip grid */}
          {mode === 'by_law' ? (
            <div className="flex flex-wrap gap-2">
              {laws.map(law => {
                const name = LAW_NAMES[law] ?? `Law ${law}`
                const isSelected = selectedLaws.includes(law)
                return (
                  <button
                    key={law}
                    onClick={() => toggleLaw(law)}
                    className={`px-4 py-2 rounded-(--radius-pill) text-sm font-semibold border-2 transition-colors ${
                      isSelected
                        ? 'border-(--brand-yellow) bg-(--brand-yellow)/10 text-(--brand-yellow)'
                        : 'border-(--border-subtle) text-(--text-secondary) hover:border-(--border-strong) hover:bg-(--bg-surface-2)'
                    }`}
                  >
                    {t('Law {{law}} — {{name}}', { law, name: t(name) })}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {areas.map(area => {
                const isSelected = selectedAreas.includes(area)
                return (
                  <button
                    key={area}
                    onClick={() => toggleArea(area)}
                    className={`px-4 py-2 rounded-(--radius-pill) text-sm font-semibold border-2 transition-colors ${
                      isSelected
                        ? 'border-(--brand-yellow) bg-(--brand-yellow)/10 text-(--brand-yellow)'
                        : 'border-(--border-subtle) text-(--text-secondary) hover:border-(--border-strong) hover:bg-(--bg-surface-2)'
                    }`}
                  >
                    {area}
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Start CTA */}
      <button
        onClick={handleStart}
        disabled={!canStart}
        className="w-full py-4 text-(--bg-primary) rounded-(--radius-card) font-bold text-lg transition-[filter,transform] duration-(--dur-fast) hover:brightness-105 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
        style={{ backgroundImage: 'var(--grad-brand)' }}
      >
        {t('Start Session')}
        {mode === 'by_law' && selectedLaws.length > 0 && (
          <span className="ml-2 text-sm font-normal opacity-80">
            ({selectedLaws.length} {t(selectedLaws.length > 1 ? 'laws selected' : 'law selected')})
          </span>
        )}
        {mode === 'by_area' && selectedAreas.length > 0 && (
          <span className="ml-2 text-sm font-normal opacity-80">
            ({selectedAreas.length} {t(selectedAreas.length > 1 ? 'areas selected' : 'area selected')})
          </span>
        )}
      </button>
    </div>
  )
}
