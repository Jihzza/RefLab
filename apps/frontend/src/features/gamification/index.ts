/** Public API for the gamification feature ("A Carreira do Árbitro"). */

export { default as RefMascot } from "./components/RefMascot";
export type { MascotMood } from "./components/RefMascot";
export { default as VictoryCard } from "./components/VictoryCard";
export { default as CompletionVictory } from "./components/CompletionVictory";
export { default as TransitionCard } from "./components/TransitionCard";
export type { TransitionKind } from "./components/TransitionCard";
export { default as PlayerProgressCard } from "./components/PlayerProgressCard";
export { default as AchievementBadge } from "./components/AchievementBadge";
export { default as AchievementsSection } from "./components/AchievementsSection";
export { default as Confetti } from "./components/Confetti";
export { useCountUp } from "./hooks/useCountUp";

export {
  XP,
  RANKS,
  ACHIEVEMENTS,
  DAILY_GOAL_XP,
  xpForPracticeAnswer,
  xpForPracticeSession,
  xpForTest,
  xpForVideo,
  levelForXp,
  deriveLifetimeXp,
  dailyGoalProgress,
  evaluateAchievements,
  moodForScore,
  buildVictorySummary,
} from "./engine";

export type {
  Rank,
  LevelInfo,
  AchievementDef,
  AchievementStats,
  LifetimeStats,
  VictorySummary,
  MascotMoodForScore,
  LucideName,
} from "./engine";
