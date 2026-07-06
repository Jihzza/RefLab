/**
 * HeroSection — brand panel for the landing page.
 * Sits in the left column of the split landing layout on desktop, and stacked
 * above the auth card on mobile. Display headline, value proposition, and a
 * feature list, over the app's broadcast-analysis atmosphere.
 */

import BannerLogo from "@/assets/logos/Banner-RefLab-No-BG.svg";
import { useTranslation } from "react-i18next";
import { GraduationCap, ListChecks, Video, Users } from "lucide-react";

export default function HeroSection() {
  const { t } = useTranslation();

  const features = [
    { icon: GraduationCap, label: t("Tests & simulations") },
    { icon: ListChecks, label: t("Practice questions") },
    { icon: Video, label: t("Video decision analysis") },
    { icon: Users, label: t("Community debates") },
  ];

  return (
    <section className="animate-fade-up text-center lg:text-left">
      <div className="flex justify-center lg:justify-start mb-8">
        <img
          src={BannerLogo}
          alt={t("RefLab - Referee Training Laboratory")}
          className="h-14 md:h-16 w-auto"
        />
      </div>

      <div className="inline-flex items-center gap-2 mb-5">
        <span className="h-4 w-1.5 rounded-full flag-accent" aria-hidden="true" />
        <span className="eyebrow">{t("Referee training platform")}</span>
      </div>

      <h1 className="text-display text-(--text-primary) mb-5 mx-auto lg:mx-0 max-w-[15ch] lg:max-w-none">
        {t("Your Referee Training Laboratory")}
      </h1>

      <p className="text-(--text-secondary) text-base md:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0">
        {t(
          "Train as a football referee with tests, practice questions, video breakdowns, and study resources. Track your progress on a personal dashboard and join a community to debate real match decisions."
        )}
      </p>

      <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto lg:mx-0 text-left">
        {features.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="flex items-center gap-3 rounded-(--radius-button) border border-(--border-subtle) bg-(--bg-surface)/60 px-3.5 py-3"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-(--brand-yellow)/12 text-(--brand-yellow)">
              <Icon size={18} aria-hidden="true" />
            </span>
            <span className="text-sm font-medium text-(--text-primary)">{label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
