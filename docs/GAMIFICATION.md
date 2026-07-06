# RefLab Gamification — "A Carreira do Árbitro"

A serious, motivating progression layer — Duolingo-style habit mechanics, but
framed around a real refereeing career. Tone: respectable, professional, never
childish. The mascot is a sharp-eyed official ("Hawk"), used only in celebratory
/ transitional moments, never as chrome.

## Design principles
- **Authentic theme.** Levels are real referee grades; XP is "match points"; the
  streak is a training streak. Nothing arbitrary or cutesy.
- **Reward effort, not just correctness.** Wrong answers still grant a little XP
  (you showed up and trained). Perfect runs get a bonus.
- **Habit loop:** train → earn XP + keep streak → hit daily goal → climb grade →
  return tomorrow. Every completion ends on a Victory card that makes progress
  legible.
- **Serious celebration.** Motion and mascot are refined (fade/scale, subtle
  confetti in brand colors), not bouncy or loud.

## XP model (Match Points)
Computed centrally in `engine.ts` so client + (future) server agree.
- Practice question: correct **+10**, incorrect **+3** (effort).
- Test completion: base **+25**, **+5 per correct** answer, perfect-score bonus **+50**.
- Video decision: correct action **+8**, correct sanction **+8**.
- First activity of the day: **+15** ("apito inicial").

`lifetimeXp` is the sum of all awarded XP. Until server persistence lands (see
Persistence), the app derives a stable estimate of lifetimeXp from existing
lifetime stats (questions answered + accuracy + tests completed) so levels/XP are
real and non-decreasing across sessions.

## Levels = Referee grades (rank ladder)
Authentic Portuguese progression; each grade has an XP threshold.
| # | Grade | XP |
|---|-------|----|
| 1 | Candidato a Árbitro | 0 |
| 2 | Árbitro Estagiário | 120 |
| 3 | Árbitro Regional | 350 |
| 4 | Árbitro Distrital | 750 |
| 5 | Árbitro Nacional | 1600 |
| 6 | Árbitro Nacional Sénior | 3200 |
| 7 | Categoria Internacional (FIFA) | 6500 |

Level-up triggers a Transition card ("Subiste de categoria").

## Streak
Consecutive calendar days with ≥1 training activity. Derived from the existing
`user_activity_days` table (no new data needed). A 7/30/100-day streak unlocks
achievements and a Transition card.

## Daily goal
Default target: **30 XP/day** (adjustable later). Shown as a ring that fills as
the day's XP accrues; reaching it fires a Transition card and protects the streak.

## Achievements (badges)
Evaluated in `engine.ts` from available stats. Referee-themed, understated:
- **Primeiro Apito** — first training activity.
- **Sem Falhas** — a perfect test (100%).
- **Centurião** — 100 questions answered.
- **Sequência de Ferro** — 7-day streak.
- **Maratonista** — 30-day streak.
- **Especialista** — a topic at ≥90% over ≥10 questions.
- **Madrugador** — hit the daily goal 5 days running.

## Cards
- **VictoryCard** — end of a test/practice session. Score `numeral`, XP earned
  (count-up), streak status, level progress bar (+ level-up state), any
  achievements unlocked, mascot mood by performance, primary Continue CTA.
- **TransitionCard** — lightweight interstitial for a single moment: `levelUp`,
  `streak`, `dailyGoal`, `milestone`, `encouragement`. Mascot + one line + CTA.

## Persistence (production recommendation — NOT applied to a live DB here)
For authoritative, tamper-proof XP the award should happen server-side inside the
existing SECURITY DEFINER grading RPCs (`grade_practice_answer`,
`submit_test_attempt`) writing to a new `user_xp_events` ledger + a `user_stats`
rollup (total_xp, current_streak, best_streak, daily_xp/date, unlocked
achievements). Client reads the rollup; the engine's XP formula mirrors the
server's. Until then the client derives values from existing stats — visually
complete and correct, just not yet the source of truth. See migration
`20260706_0057_gamification.sql` (written, additive, untested — apply on a
branch).
```
