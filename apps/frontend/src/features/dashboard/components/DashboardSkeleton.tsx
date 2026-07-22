import { useTranslation } from 'react-i18next'
import Skeleton from '@/components/ui/Skeleton'
import Surface from '@/components/ui/Surface'

export default function DashboardSkeleton() {
  const { t } = useTranslation()

  return (
    <div className="min-h-full bg-(--mc-color-canvas) pb-8 text-(--mc-color-text)">
      <div
        className="mx-auto w-full max-w-7xl px-4 pb-4 pt-5 sm:px-6 sm:pt-7 xl:px-8"
        aria-busy="true"
        aria-label={t('Loading dashboard')}
      >
        <Skeleton variant="text" width="13rem" height="2rem" className="mb-4 sm:mb-5" />

        <div className="space-y-4 sm:space-y-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
            <Surface padding="md" className="min-h-[190px] shadow-none">
              <Skeleton variant="text" width="7rem" />
              <Skeleton variant="text" width="9rem" height="4.25rem" className="mt-3" />
              <Skeleton variant="text" width="8rem" className="mt-3" />
            </Surface>
            <Surface padding="md" className="min-h-[190px] shadow-none">
              <Skeleton variant="text" width="8rem" />
              <Skeleton variant="text" width="75%" height="1.75rem" className="mt-4" />
              <Skeleton variant="text" width="55%" className="mt-2" />
              <Skeleton variant="rectangular" height="3rem" className="mt-5" />
            </Surface>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Skeleton variant="rectangular" height="6.75rem" />
            <Skeleton variant="rectangular" height="6.75rem" />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(20rem,0.9fr)_minmax(0,1.1fr)] xl:gap-5">
            <Skeleton variant="rectangular" height="15rem" />
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Array.from({ length: 6 }, (_, index) => (
                  <Skeleton key={index} variant="rectangular" height="7rem" />
                ))}
              </div>
              <Skeleton variant="rectangular" height="12rem" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
