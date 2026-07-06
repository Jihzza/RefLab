import { Flame, Zap, ChevronRight, ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import Button from "@/components/ui/Button";
import RefMascot from "./RefMascot";
import Confetti from "./Confetti";
import AchievementBadge from "./AchievementBadge";
import { useCountUp } from "../hooks/useCountUp";
import { moodForScore, type VictorySummary } from "../engine";

interface VictoryCardProps {
  summary: VictorySummary;
  /** Headline eyebrow, e.g. t('Test complete') / t('Session complete'). */
  title: string;
  onContinue: () => void;
  onReview?: () => void;
  continueLabel?: string;
  reviewLabel?: string;
}

/**
 * VictoryCard — the celebratory completion screen (Duolingo-style, referee tone).
 * Shows score, XP earned, streak, referee-grade progress, level-ups and unlocked
 * achievements. Meant to render as a full interstitial before the detailed review.
 */
export default function VictoryCard({
  summary,
  title,
  onContinue,
  onReview,
  continueLabel,
  reviewLabel,
}: VictoryCardProps) {
  const { t } = useTranslation();
  const mood = summary.leveledUp ? "celebrate" : moodForScore(summary.scorePercent);
  const celebrate = summary.leveledUp || summary.scorePercent >= 90;

  const xp = useCountUp(summary.xpEarned, 1000);
  const pct = useCountUp(summary.scorePercent, 900);

  const passing = summary.scorePercent >= 70;
  const scoreColor = summary.scorePercent >= 70
    ? "text-(--success)"
    : summary.scorePercent >= 40
      ? "text-(--warning)"
      : "text-(--error)";

  const level = summary.levelAfter;
  const progressPct = Math.round(level.progress * 100);

  const headline = summary.leveledUp
    ? t("Promotion earned")
    : passing
      ? t("Well officiated")
      : t("Keep training");

  return (
    <div className="relative mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-2 py-6 text-center animate-fade-up">
      {celebrate && <Confetti />}

      <div className="relative">
        <RefMascot mood={mood} size={132} />
      </div>

      <p className="eyebrow mt-4">{title}</p>
      <h2 className="mt-1 text-display-sm text-(--text-primary)">{headline}</h2>

      {/* Score */}
      <div className="mt-6 w-full card-console field-lines relative overflow-hidden p-6">
        <span className="flag-accent absolute inset-x-0 top-0 h-1" aria-hidden="true" />
        <p className="eyebrow mb-2">{t("Score")}</p>
        <div className={`numeral text-6xl font-extrabold ${scoreColor}`}>{pct}%</div>
        <p className="numeral mt-1 text-sm text-(--text-muted)">
          {t("{{correct}}/{{total}} correct", { correct: summary.correct, total: summary.total })}
        </p>

        {/* Stat chips */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-(--radius-button) border border-(--brand-yellow)/25 bg-(--brand-yellow)/8 p-3">
            <div className="flex items-center justify-center gap-1.5 text-(--brand-yellow)">
              <Zap size={16} aria-hidden="true" />
              <span className="numeral text-xl font-extrabold">+{xp}</span>
            </div>
            <p className="mt-0.5 text-xs text-(--text-muted)">{t("XP earned")}</p>
          </div>
          <div className="rounded-(--radius-button) border border-(--border-subtle) bg-(--bg-surface-2) p-3">
            <div className="flex items-center justify-center gap-1.5 text-(--warning)">
              <Flame size={16} aria-hidden="true" />
              <span className="numeral text-xl font-extrabold text-(--text-primary)">{summary.streakDays}</span>
            </div>
            <p className="mt-0.5 text-xs text-(--text-muted)">
              {summary.streakDays === 1 ? t("day streak") : t("days streak")}
            </p>
          </div>
        </div>
      </div>

      {/* Level / referee grade progress */}
      <div className="mt-4 w-full card-console p-5 text-left">
        {summary.leveledUp && (
          <div className="mb-3 flex items-center gap-2 rounded-(--radius-button) border border-(--brand-yellow)/30 bg-(--brand-yellow)/10 px-3 py-2">
            <ArrowUpRight size={16} className="text-(--brand-yellow)" aria-hidden="true" />
            <span className="text-sm font-semibold text-(--text-primary)">
              {t("New grade: {{grade}}", { grade: t(level.rank.name) })}
            </span>
          </div>
        )}
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-(--text-primary)">{t(level.rank.name)}</span>
          <span className="numeral text-xs text-(--text-muted)">
            {level.nextRank ? `${progressPct}%` : t("Max grade")}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-(--radius-pill) bg-(--bg-surface-2)">
          <div
            className="h-full rounded-(--radius-pill) transition-[width] duration-700"
            style={{ width: `${progressPct}%`, backgroundImage: "var(--grad-brand)" }}
          />
        </div>
        {level.nextRank && level.xpToNext !== null && (
          <p className="numeral mt-2 text-xs text-(--text-muted)">
            {t("{{xp}} XP to {{grade}}", { xp: level.xpToNext, grade: t(level.nextRank.name) })}
          </p>
        )}
      </div>

      {/* Newly unlocked achievements */}
      {summary.newAchievements.length > 0 && (
        <div className="mt-4 w-full text-left">
          <p className="eyebrow mb-2">{t("Achievement unlocked")}</p>
          <div className="space-y-2">
            {summary.newAchievements.map((a) => (
              <AchievementBadge key={a.id} achievement={a} unlocked size="sm" />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 w-full space-y-2.5">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onContinue}
          rightIcon={<ChevronRight size={18} aria-hidden="true" />}
        >
          {continueLabel ?? t("Continue")}
        </Button>
        {onReview && (
          <Button variant="ghost" size="md" fullWidth onClick={onReview}>
            {reviewLabel ?? t("Review answers")}
          </Button>
        )}
      </div>
    </div>
  );
}
