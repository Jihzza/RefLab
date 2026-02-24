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
    <section className="px-6 pt-8 pb-4 text-center">
      {/* Logo container - centered with responsive sizing */}
      <div className="flex justify-center mb-6">
        <img
          src={BannerLogo}
          alt="RefLab - Referee Training Laboratory"
          className="h-16 md:h-20 w-auto"
        />
      </div>

      {/* Main title */}
      <h1 className="text-2xl md:text-3xl font-bold text-(--text-primary) mb-4">
        {t("Your Referee Training Laboratory")}
      </h1>

      {/* Value proposition description */}
      <p className="text-(--text-secondary) text-base md:text-lg max-w-xl mx-auto leading-relaxed">
        {t(
          "A dedicated hub for football referees to study, rehearse, and stay aligned with the Laws of the Game. Master your craft with authoritative knowledge, deliberate practice, and AI-powered guidance."
        )}
      </p>
    </section>
  );
}
