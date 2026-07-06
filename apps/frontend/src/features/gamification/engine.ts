/**
 * Gamification engine — "A Carreira do Árbitro".
 *
 * Pure, framework-agnostic mechanics so the client and a future server-side
 * award path agree on every number. See docs/GAMIFICATION.md. Rank/achievement
 * names are English keys translated in src/i18n/pt-PT.ts.
 */

export type LucideName =
  | "Award" | "Flame" | "Target" | "Medal" | "Crown" | "Zap" | "ShieldCheck";

// ── XP model (Match Points) ────────────────────────────────────────────────
export const XP = {
  practiceCorrect: 10,
  practiceWrong: 3,
  testBase: 25,
  testPerCorrect: 5,
  testPerfectBonus: 50,
  videoActionCorrect: 8,
  videoSanctionCorrect: 8,
  dailyFirstActivity: 15,
} as const;

export function xpForPracticeAnswer(isCorrect: boolean): number {
  return isCorrect ? XP.practiceCorrect : XP.practiceWrong;
}

export function xpForTest(correct: number, total: number): number {
  const base = XP.testBase + correct * XP.testPerCorrect;
  const perfect = total > 0 && correct === total ? XP.testPerfectBonus : 0;
  return base + perfect;
}

export function xpForPracticeSession(totalAnswered: number, totalCorrect: number): number {
  const wrong = Math.max(0, totalAnswered - totalCorrect);
  return totalCorrect * XP.practiceCorrect + wrong * XP.practiceWrong;
}

export function xpForVideo(actionCorrect: boolean, sanctionCorrect: boolean): number {
  return (actionCorrect ? XP.videoActionCorrect : 0) + (sanctionCorrect ? XP.videoSanctionCorrect : 0);
}

// ── Referee-grade ladder (levels) ──────────────────────────────────────────
export interface Rank {
  index: number;
  /** English key, translated in pt-PT.ts (e.g. "Regional Referee" → "Árbitro Regional"). */
  name: string;
  short: string;
  minXp: number;
}

export const RANKS: Rank[] = [
  { index: 0, name: "Referee Candidate", short: "Candidate", minXp: 0 },
  { index: 1, name: "Trainee Referee", short: "Trainee", minXp: 120 },
  { index: 2, name: "Regional Referee", short: "Regional", minXp: 350 },
  { index: 3, name: "District Referee", short: "District", minXp: 750 },
  { index: 4, name: "National Referee", short: "National", minXp: 1600 },
  { index: 5, name: "Senior National Referee", short: "Senior", minXp: 3200 },
  { index: 6, name: "International (FIFA)", short: "FIFA", minXp: 6500 },
];

export interface LevelInfo {
  rank: Rank;
  nextRank: Rank | null;
  xp: number;
  /** XP accumulated inside the current grade. */
  xpIntoLevel: number;
  /** XP span of the current grade (Infinity-safe for the top grade). */
  xpForLevel: number;
  /** 0..1 progress toward the next grade (1 at the top grade). */
  progress: number;
  xpToNext: number | null;
}

export function levelForXp(xp: number): LevelInfo {
  const safeXp = Math.max(0, Math.floor(xp || 0));
  let rank = RANKS[0];
  for (const r of RANKS) if (safeXp >= r.minXp) rank = r;
  const nextRank = RANKS[rank.index + 1] ?? null;

  if (!nextRank) {
    return {
      rank,
      nextRank: null,
      xp: safeXp,
      xpIntoLevel: safeXp - rank.minXp,
      xpForLevel: 0,
      progress: 1,
      xpToNext: null,
    };
  }

  const xpForLevel = nextRank.minXp - rank.minXp;
  const xpIntoLevel = safeXp - rank.minXp;
  return {
    rank,
    nextRank,
    xp: safeXp,
    xpIntoLevel,
    xpForLevel,
    progress: Math.min(1, xpIntoLevel / xpForLevel),
    xpToNext: nextRank.minXp - safeXp,
  };
}

// ── Deriving a stable lifetime XP from existing stats ──────────────────────
// Until server persistence lands, estimate lifetime XP from lifetime stats so
// the level/XP shown are real and non-decreasing. Mirrors the XP model above.
export interface LifetimeStats {
  questionsAnswered: number;
  overallAccuracy: number | null; // 0..100
  testsCompleted: number;
  averageTestScore?: number | null; // 0..100
}

export function deriveLifetimeXp(s: LifetimeStats): number {
  const acc = (s.overallAccuracy ?? 0) / 100;
  const correct = Math.round(s.questionsAnswered * acc);
  const wrong = Math.max(0, s.questionsAnswered - correct);
  const practiceXp = correct * XP.practiceCorrect + wrong * XP.practiceWrong;
  const avg = (s.averageTestScore ?? s.overallAccuracy ?? 0) / 100;
  const testXp = s.testsCompleted * (XP.testBase + Math.round(20 * avg) * XP.testPerCorrect / 4);
  return Math.round(practiceXp + testXp);
}

// ── Daily goal ─────────────────────────────────────────────────────────────
export const DAILY_GOAL_XP = 30;

export function dailyGoalProgress(xpToday: number, goal: number = DAILY_GOAL_XP) {
  return {
    goal,
    xpToday: Math.max(0, xpToday),
    progress: Math.min(1, Math.max(0, xpToday) / goal),
    reached: xpToday >= goal,
  };
}

// ── Achievements ───────────────────────────────────────────────────────────
export interface AchievementDef {
  id: string;
  name: string; // English key
  description: string; // English key
  icon: LucideName;
}

export interface AchievementStats {
  questionsAnswered: number;
  streakDays: number;
  hadPerfectTest: boolean;
  bestTopicAccuracy: number | null; // 0..100
  bestTopicVolume: number; // questions in that topic
  dailyGoalDaysInARow: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_whistle", name: "First Whistle", description: "Complete your first training activity.", icon: "Award" },
  { id: "flawless", name: "Flawless", description: "Score 100% on a test.", icon: "ShieldCheck" },
  { id: "centurion", name: "Centurion", description: "Answer 100 questions.", icon: "Medal" },
  { id: "iron_streak", name: "Iron Streak", description: "Reach a 7-day training streak.", icon: "Flame" },
  { id: "marathoner", name: "Marathoner", description: "Reach a 30-day training streak.", icon: "Zap" },
  { id: "specialist", name: "Specialist", description: "Reach 90% accuracy in a topic (10+ questions).", icon: "Target" },
  { id: "early_riser", name: "Consistent", description: "Hit your daily goal 5 days running.", icon: "Crown" },
];

export function evaluateAchievements(s: AchievementStats): Set<string> {
  const unlocked = new Set<string>();
  if (s.questionsAnswered > 0) unlocked.add("first_whistle");
  if (s.hadPerfectTest) unlocked.add("flawless");
  if (s.questionsAnswered >= 100) unlocked.add("centurion");
  if (s.streakDays >= 7) unlocked.add("iron_streak");
  if (s.streakDays >= 30) unlocked.add("marathoner");
  if ((s.bestTopicAccuracy ?? 0) >= 90 && s.bestTopicVolume >= 10) unlocked.add("specialist");
  if (s.dailyGoalDaysInARow >= 5) unlocked.add("early_riser");
  return unlocked;
}

// ── Victory summary (what a completion screen needs) ───────────────────────
export type MascotMoodForScore = "celebrate" | "cheer" | "neutral" | "sad";

export function moodForScore(percent: number): MascotMoodForScore {
  if (percent >= 90) return "celebrate";
  if (percent >= 70) return "cheer";
  if (percent >= 40) return "neutral";
  return "sad";
}

export interface VictorySummary {
  scorePercent: number;
  correct: number;
  total: number;
  xpEarned: number;
  /** Level info BEFORE and AFTER this session, to detect a level-up. */
  levelBefore: LevelInfo;
  levelAfter: LevelInfo;
  leveledUp: boolean;
  streakDays: number;
  streakExtendedToday: boolean;
  newAchievements: AchievementDef[];
}

/** Build a victory summary from a completed run + the player's prior lifetime XP. */
export function buildVictorySummary(params: {
  correct: number;
  total: number;
  xpEarned: number;
  priorLifetimeXp: number;
  streakDays: number;
  streakExtendedToday: boolean;
  newlyUnlocked?: AchievementDef[];
}): VictorySummary {
  const scorePercent = params.total > 0 ? Math.round((params.correct / params.total) * 100) : 0;
  const levelBefore = levelForXp(params.priorLifetimeXp);
  const levelAfter = levelForXp(params.priorLifetimeXp + params.xpEarned);
  return {
    scorePercent,
    correct: params.correct,
    total: params.total,
    xpEarned: params.xpEarned,
    levelBefore,
    levelAfter,
    leveledUp: levelAfter.rank.index > levelBefore.rank.index,
    streakDays: params.streakDays,
    streakExtendedToday: params.streakExtendedToday,
    newAchievements: params.newlyUnlocked ?? [],
  };
}
