import { Shield, Flame, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { levelForXp } from "../engine";

interface PlayerProgressCardProps {
  lifetimeXp: number;
  streak: number;
  className?: string;
}

/**
 * PlayerProgressCard — the always-on progression summary (dashboard header).
 * Shows the player's referee grade, XP progress to the next grade, and streak.
 */
export default function PlayerProgressCard({
  lifetimeXp,
  streak,
  className = "",
}: PlayerProgressCardProps) {
  const { t } = useTranslation();
  const level = levelForXp(lifetimeXp);
  const progressPct = Math.round(level.progress * 100);

  return (
    <div className={`card-console field-lines relative overflow-hidden p-5 ${className}`}>
      <span className="flag-accent absolute inset-x-0 top-0 h-1" aria-hidden="true" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-(--radius-button) bg-(--brand-yellow)/15 text-(--brand-yellow)">
            <Shield size={24} aria-hidden="true" />
          </span>
          <div>
            <p className="eyebrow">{t("Referee grade")}</p>
            <p className="text-lg font-bold text-(--text-primary) leading-tight">
              {t(level.rank.name)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded-(--radius-pill) border border-(--warning)/30 bg-(--warning)/10 px-2.5 py-1 text-(--warning)">
          <Flame size={15} aria-hidden="true" />
          <span className="numeral text-sm font-bold text-(--text-primary)">{streak}</span>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs text-(--text-muted)">
            <Zap size={13} className="text-(--brand-yellow)" aria-hidden="true" />
            <span className="numeral">{t("{{xp}} XP", { xp: level.xp })}</span>
          </span>
          <span className="numeral text-xs text-(--text-muted)">
            {level.nextRank
              ? t("{{xp}} XP to {{grade}}", { xp: level.xpToNext, grade: t(level.nextRank.short) })
              : t("Max grade")}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-(--radius-pill) bg-(--bg-surface-2)">
          <div
            className="h-full rounded-(--radius-pill) transition-[width] duration-700"
            style={{ width: `${progressPct}%`, backgroundImage: "var(--grad-brand)" }}
          />
        </div>
      </div>
    </div>
  );
}
