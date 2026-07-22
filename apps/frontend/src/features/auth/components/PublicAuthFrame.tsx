import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import BannerLogo from '@/assets/logos/Banner-RefLab-No-BG.svg';

interface PublicAuthFrameProps {
  children: ReactNode;
}

/** Shared visual frame for standalone public authentication routes. */
export default function PublicAuthFrame({ children }: PublicAuthFrameProps) {
  const { t } = useTranslation();

  return (
    <main className="relative isolate flex min-h-dvh w-full items-center justify-center overflow-hidden bg-(--mc-color-canvas) px-4 py-8 text-(--mc-color-text) sm:px-6">
      <div aria-hidden="true" className="mc-pitch-lines pointer-events-none absolute -right-36 top-12 -z-10 size-[32rem] rotate-12 opacity-35 sm:-right-24 sm:size-[40rem]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_18%_8%,color-mix(in_srgb,var(--mc-color-accent)_12%,transparent),transparent_28rem),radial-gradient(circle_at_90%_92%,color-mix(in_srgb,var(--mc-color-danger)_8%,transparent),transparent_30rem)]" />

      <div className="w-full max-w-md">
        <div className="mb-5 flex justify-center sm:mb-7">
          <img
            src={BannerLogo}
            alt={t('RefLab - Referee Training Laboratory')}
            className="h-12 w-auto sm:h-14"
          />
        </div>

        <section className="relative overflow-hidden rounded-(--mc-radius-card) border border-(--mc-color-border-strong) bg-(--mc-color-surface)/95 p-5 shadow-(--mc-shadow-raised) backdrop-blur-sm sm:p-7">
          <span aria-hidden="true" className="absolute right-0 top-0 h-1.5 w-28 -skew-x-[28deg] bg-(--mc-color-accent)" />
          <span aria-hidden="true" className="absolute right-2 top-0 h-1.5 w-7 -skew-x-[28deg] bg-(--mc-color-danger)" />
          {children}
        </section>
      </div>
    </main>
  );
}
