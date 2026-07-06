import { Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ACHIEVEMENTS, evaluateAchievements } from "../engine";
import type { AchievementStats } from "../engine";
import AchievementBadge from "./AchievementBadge";

interface AchievementsSectionProps {
  stats: AchievementStats;
}

/**
 * AchievementsSection — a permanent showcase of the referee's badge collection.
 * Renders every achievement (locked or unlocked) with a running unlocked count,
 * so the player can see what remains to be earned.
 */
export default function AchievementsSection({ stats }: AchievementsSectionProps) {
  const { t } = useTranslation();
  const unlockedSet = evaluateAchievements(stats);
  const unlockedCount = unlockedSet.size;
  const total = ACHIEVEMENTS.length;

  return (
    <section aria-label={t("Achievements")} className="card-console p-4 sm:p-5 space-y-4">
      {/* Section header */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={16} className="text-(--brand-yellow)" aria-hidden="true" />
            <span className="eyebrow">{t("Achievements")}</span>
          </div>
          <h2 className="text-lg font-extrabold tracking-tight text-(--text-primary)">
            {t("Badge Collection")}
          </h2>
        </div>
        <span className="numeral text-sm font-bold text-(--text-muted) shrink-0">
          {t("{{n}}/{{total}} unlocked", { n: unlockedCount, total })}
        </span>
      </div>

      {/* Badge grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ACHIEVEMENTS.map((a) => (
          <AchievementBadge key={a.id} achievement={a} unlocked={unlockedSet.has(a.id)} />
        ))}
      </div>
    </section>
  );
}
