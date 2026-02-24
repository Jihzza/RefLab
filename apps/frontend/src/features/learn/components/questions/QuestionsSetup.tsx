import { useState, useEffect } from 'react'
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

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (mode === 'by_law') {
        const { data } = await getDistinctLaws()
        if (!cancelled && data) setLaws(data)
      } else {
        const { data } = await getDistinctAreas()
        if (!cancelled && data) setAreas(data)
      }
      if (!cancelled) setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [mode])

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
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-sm text-(--text-muted) hover:text-(--text-primary) transition-colors"
        >
          &larr; {t('Back')}
        </button>
        <h2 className="text-lg font-semibold text-(--text-primary)">
          {mode === 'by_law' ? t('Select Laws') : t('Select Areas')}
        </h2>
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
                    className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-colors ${
                      isSelected
                        ? 'border-(--info) bg-(--info)/10 text-(--info)'
                        : 'border-(--border-subtle) text-(--text-secondary) hover:border-(--info)/50 hover:bg-(--bg-surface-2)'
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
                    className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-colors ${
                      isSelected
                        ? 'border-(--info) bg-(--info)/10 text-(--info)'
                        : 'border-(--border-subtle) text-(--text-secondary) hover:border-(--info)/50 hover:bg-(--bg-surface-2)'
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
        className="w-full py-4 bg-(--info) text-white rounded-2xl font-semibold text-lg hover:opacity-90 transition-opacity shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
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
