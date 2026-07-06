import { Flame, Target, TrendingUp, ArrowUpRight, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import Button from "@/components/ui/Button";
import RefMascot, { type MascotMood } from "./RefMascot";
import Confetti from "./Confetti";

export type TransitionKind =
  | "levelUp"
  | "streak"
  | "dailyGoal"
  | "milestone"
  | "encouragement";

interface TransitionCardProps {
  kind: TransitionKind;
  /** Numeric payload: streak days, XP, milestone count, etc. */
  value?: number;
  /** Optional overrides. */
  headline?: string;
  message?: string;
  onContinue: () => void;
  continueLabel?: string;
}

const ICON = {
  levelUp: ArrowUpRight,
  streak: Flame,
  dailyGoal: Target,
  milestone: TrendingUp,
  encouragement: TrendingUp,
} as const;

const MOOD: Record<TransitionKind, MascotMood> = {
  levelUp: "celebrate",
  streak: "cheer",
  dailyGoal: "cheer",
  milestone: "cheer",
  encouragement: "focus",
};

/**
 * TransitionCard — a single-beat interstitial between stages (Duolingo-style),
 * kept understated and on-brand. One mascot, one message, one action.
 */
export default function TransitionCard({
  kind,
  value = 0,
  headline,
  message,
  onContinue,
  continueLabel,
}: TransitionCardProps) {
  const { t } = useTranslation();
  const Icon = ICON[kind];

  const defaults: Record<TransitionKind, { h: string; m: string }> = {
    levelUp: { h: t("Promotion earned"), m: t("You have reached a new referee grade.") },
    streak: {
      h: t("{{n}}-day streak", { n: value }),
      m: t("Consistency is what makes a referee sharp. Keep it going."),
    },
    dailyGoal: { h: t("Daily goal reached"), m: t("You have completed today's training target.") },
    milestone: { h: t("Milestone reached"), m: t("Strong progress — stay on the whistle.") },
    encouragement: { h: t("Stay focused"), m: t("Every decision is a rep. On to the next.") },
  };

  const h = headline ?? defaults[kind].h;
  const m = message ?? defaults[kind].m;
  const showConfetti = kind === "levelUp" || kind === "milestone";

  return (
    <div className="relative mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center px-4 py-8 text-center animate-scale-in">
      {showConfetti && <Confetti />}

      <RefMascot mood={MOOD[kind]} size={120} />

      <div className="mt-5 inline-flex items-center gap-2 rounded-(--radius-pill) border border-(--brand-yellow)/30 bg-(--brand-yellow)/10 px-3 py-1 text-(--brand-yellow)">
        <Icon size={15} aria-hidden="true" />
        <span className="eyebrow !text-(--brand-yellow)">{t("Progress")}</span>
      </div>

      <h2 className="mt-3 text-display-sm text-(--text-primary)">{h}</h2>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-(--text-secondary)">{m}</p>

      <Button
        variant="primary"
        size="lg"
        className="mt-7"
        onClick={onContinue}
        rightIcon={<ChevronRight size={18} aria-hidden="true" />}
      >
        {continueLabel ?? t("Continue")}
      </Button>
    </div>
  );
}
