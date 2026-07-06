import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/components/useAuth";
import { fetchDashboardStats } from "@/features/dashboard/api/dashboardApi";
import VictoryCard from "./VictoryCard";
import { buildVictorySummary, deriveLifetimeXp, type VictorySummary } from "../engine";

interface CompletionVictoryProps {
  correct: number;
  total: number;
  xpEarned: number;
  title: string;
  onContinue: () => void;
  onReview?: () => void;
  continueLabel?: string;
  reviewLabel?: string;
}

/**
 * CompletionVictory — self-contained celebration screen for a finished test or
 * practice session. Fetches the player's current stats to compute referee-grade
 * progress + streak, detects level-ups, and renders the VictoryCard. Wiring a
 * flow into the celebration is then just `<CompletionVictory .../>`.
 */
export default function CompletionVictory({
  correct,
  total,
  xpEarned,
  title,
  onContinue,
  onReview,
  continueLabel,
  reviewLabel,
}: CompletionVictoryProps) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<VictorySummary | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      let currentLifetimeXp = 0;
      let streak = 0;

      if (user?.id) {
        try {
          const { data } = await fetchDashboardStats(user.id);
          currentLifetimeXp = deriveLifetimeXp({
            questionsAnswered: data.progress.total_questions_answered,
            overallAccuracy: data.performance.overall_accuracy,
            testsCompleted: data.progress.total_tests_completed,
            averageTestScore: data.performance.pass_rate,
          });
          streak = data.habits.current_streak;
        } catch {
          // Best-effort — fall back to a summary without prior context.
        }
      }

      // Stats already include the run that just finished, so prior = current - earned.
      const priorLifetimeXp = Math.max(0, currentLifetimeXp - xpEarned);
      const built = buildVictorySummary({
        correct,
        total,
        xpEarned,
        priorLifetimeXp,
        streakDays: streak,
        streakExtendedToday: true,
        newlyUnlocked: [],
      });
      if (!cancelled) setSummary(built);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, correct, total, xpEarned]);

  if (!summary) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite">
        <Loader2 className="h-6 w-6 animate-spin text-(--text-muted)" aria-hidden="true" />
      </div>
    );
  }

  return (
    <VictoryCard
      summary={summary}
      title={title}
      onContinue={onContinue}
      onReview={onReview}
      continueLabel={continueLabel}
      reviewLabel={reviewLabel}
    />
  );
}
