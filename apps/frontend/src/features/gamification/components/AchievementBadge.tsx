import { Award, Flame, Target, Medal, Crown, Zap, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AchievementDef, LucideName } from "../engine";

const ICONS: Record<LucideName, typeof Award> = {
  Award,
  Flame,
  Target,
  Medal,
  Crown,
  Zap,
  ShieldCheck,
};

interface AchievementBadgeProps {
  achievement: AchievementDef;
  unlocked?: boolean;
  size?: "sm" | "md";
}

/** A single achievement medal. Locked badges are dimmed and desaturated. */
export default function AchievementBadge({
  achievement,
  unlocked = true,
  size = "md",
}: AchievementBadgeProps) {
  const { t } = useTranslation();
  const Icon = ICONS[achievement.icon] ?? Award;
  const tile = size === "sm" ? "h-10 w-10" : "h-12 w-12";

  return (
    <div
      className={[
        "flex items-center gap-3 rounded-(--radius-button) border p-3 transition-colors",
        unlocked
          ? "border-(--brand-yellow)/30 bg-(--brand-yellow)/8"
          : "border-(--border-subtle) bg-(--bg-surface-2) opacity-60",
      ].join(" ")}
    >
      <span
        className={[
          "flex shrink-0 items-center justify-center rounded-(--radius-button)",
          tile,
          unlocked ? "bg-(--brand-yellow)/15 text-(--brand-yellow)" : "bg-(--bg-elevated) text-(--text-faint)",
        ].join(" ")}
      >
        <Icon size={size === "sm" ? 18 : 22} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-(--text-primary) truncate">{t(achievement.name)}</p>
        <p className="text-xs text-(--text-muted) leading-snug">{t(achievement.description)}</p>
      </div>
    </div>
  );
}
