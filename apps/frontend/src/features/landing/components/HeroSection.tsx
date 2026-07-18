/**
 * HeroSection - Landing page hero with logo and branding
 *
 * Displays the RefLab banner logo, main title, and value proposition.
 * Mobile-first design with centered layout and responsive text sizing.
 *
 * Layout:
 * ┌─────────────────────────────────────────┐
 * │           [Banner RefLab Logo]          │
 * │                                         │
 * │    "Your Referee Training Laboratory"   │
 * │                                         │
 * │         [Description paragraph]         │
 * └─────────────────────────────────────────┘
 */

import BannerLogo from "@/assets/logos/Banner-RefLab-No-BG.svg";
import { useTranslation } from "react-i18next";

export default function HeroSection() {
  const { t } = useTranslation();
  return (
    <section className="relative py-3 text-center lg:py-8 lg:text-left">
      <div className="mb-8 flex justify-center lg:justify-start">
        <img
          src={BannerLogo}
          alt={t('RefLab - Referee Training Laboratory')}
          className="h-16 w-auto sm:h-20 lg:h-24"
        />
      </div>

      <span aria-hidden="true" className="mc-brand-stripes mx-auto mb-6 lg:mx-0" />

      <h1 className="mx-auto max-w-3xl text-[clamp(2.15rem,7vw,4.8rem)] font-extrabold leading-[0.98] tracking-[-0.045em] text-(--mc-color-text) lg:mx-0">
        {t("Your Referee Training Laboratory")}
      </h1>

      <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-(--mc-color-text-secondary) sm:text-lg sm:leading-8 lg:mx-0">
        {t(
          'A dedicated hub for football referees to study the Laws of the Game, practise match decisions and review their progress through structured tests and video scenarios.'
        )}
      </p>

      <div aria-hidden="true" className="mx-auto mt-8 h-px max-w-xl bg-[linear-gradient(90deg,transparent,var(--mc-color-border-strong),transparent)] lg:mx-0 lg:bg-[linear-gradient(90deg,var(--mc-color-accent),var(--mc-color-border),transparent)]" />
    </section>
  );
}
