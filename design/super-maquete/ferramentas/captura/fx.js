const h = require('./harness');
const U = h.USER.id;
const day = n => { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d.toISOString(); };
const date = n => day(n).slice(0, 10);
exports.day = day;
exports.PROFILE = { id: U, username: 'joaosilva', username_customized: true, role: 'user', name: 'João Silva', email: h.USER.email, photo_url: null, last_login_at: day(0), created_at: '2026-02-01T10:00:00Z', updated_at: day(1) };
const q = (id, text, a, b, c, d, ok, topic, law) => ({ id: 'q' + id, question_text: text, option_a: a, option_b: b, option_c: c, option_d: d, correct_option: ok, topic, law, created_at: '2026-02-13T00:00:00Z', updated_at: '2026-02-13T00:00:00Z' });
exports.QUESTIONS = [
  q(1, 'A player is in an offside position. When is the offence penalised?', 'As soon as they are in an offside position', 'When they become involved in active play', 'When the ball crosses the halfway line', 'When any teammate touches the ball', 'B', 'Offside', 11),
  q(2, 'An attacker is level with the second-last defender. Are they offside?', 'Yes, level is offside', 'No, level is onside', 'Only if the ball is in the air', 'It depends on the phase of play', 'B', 'Offside', 11),
  q(3, 'A player uses excessive force when challenging an opponent. What is the minimum sanction?', 'Caution (yellow card)', 'Sending off (red card)', 'Indirect free kick only', 'Verbal warning', 'B', 'Fouls', 12),
  q(4, 'What restart is given when a player impedes the progress of an opponent without any contact?', 'Direct free kick', 'Indirect free kick', 'Drop ball', 'No foul — play continues', 'B', 'Fouls', 12),
  q(5, 'Where does the arm begin for handball decisions according to IFAB?', 'At the wrist', 'At the elbow', 'At the bottom of the armpit', 'At the shoulder joint', 'C', 'Handball', 12),
  q(6, 'During a penalty kick, the goalkeeper moves off the goal line before the ball is kicked and saves the shot. What is the decision?', 'Goal kick', 'Retake the penalty kick', 'Indirect free kick to the defending team', 'Play continues', 'B', 'Penalties', 14),
  q(7, 'What signal does the referee use to indicate advantage?', 'Blowing the whistle twice', 'Raising both arms upward', 'Sweeping one or both arms upward in the direction of play', 'Pointing at the fouled player', 'C', 'Advantage', 12),
  q(8, 'A player removes their shirt while celebrating a goal. What is the sanction?', 'No sanction — it is a normal celebration', 'Verbal warning', 'Caution (yellow card)', 'Sending off (red card)', 'C', 'Cards', 12),
  q(9, 'What does OFR stand for in VAR protocol?', 'Official Field Review', 'On-Field Review', 'Official Footage Replay', 'Onsite Final Review', 'B', 'VAR', null),
  q(10, 'How far must opponents stand from the ball on a free kick?', 'At least 5 metres', 'At least 9.15 metres (10 yards)', 'At least 11 metres', 'At least 7 metres', 'B', 'Free Kicks', 13),
];
while (exports.QUESTIONS.length < 20) { const b = exports.QUESTIONS[exports.QUESTIONS.length % 10]; exports.QUESTIONS.push(Object.assign({}, b, { id: b.id + 'x' + exports.QUESTIONS.length })); }
exports.STATS = {
  performance: { overall_accuracy: 72.5, accuracy_by_topic: [ { topic: 'Offside', accuracy: 85.7, total_questions: 35 }, { topic: 'Fouls', accuracy: 75, total_questions: 28 }, { topic: 'Handball', accuracy: 66.7, total_questions: 21 }, { topic: 'Penalties', accuracy: 50, total_questions: 14 }, { topic: 'VAR', accuracy: 40, total_questions: 10 } ], match_simulation_accuracy: 50, pass_rate: 33.3 },
  progress: { accuracy_change: 12.5, accuracy_this_week: 78, accuracy_last_week: 65.5, total_questions_answered: 148, total_tests_completed: 6, total_tests_passed: 2, average_test_duration: 845, last_test_duration: 588 },
  habits: { calendar: Array.from({ length: 30 }, (_, i) => ({ date: date(29 - i), active: [0, 1, 2, 4, 5, 9, 10, 11, 12, 13, 14, 15, 18, 22, 23, 27].includes(29 - i) })), current_streak: 3, longest_streak: 7, active_days_last_7: 4 },
};
exports.STATS_EMPTY = {
  performance: { overall_accuracy: null, accuracy_by_topic: [], match_simulation_accuracy: null, pass_rate: null },
  progress: { accuracy_change: null, accuracy_this_week: null, accuracy_last_week: null, total_questions_answered: 0, total_tests_completed: 0, total_tests_passed: 0, average_test_duration: null, last_test_duration: null },
  habits: { calendar: Array.from({ length: 30 }, (_, i) => ({ date: date(29 - i), active: false })), current_streak: 0, longest_streak: 0, active_days_last_7: 0 },
};
const att = (n, c, secs) => ({ id: 'a' + n, user_id: U, test_id: null, status: 'submitted', started_at: day(n), submitted_at: day(n), score_correct: c, score_total: 20, score_percent: c * 5, time_limit_seconds: 2400, time_elapsed_seconds: secs, auto_submitted: false, updated_at: day(n) });
exports.ATTEMPTS = [att(0, 16, 1122), att(2, 12, 1510), att(5, 18, 905), att(8, 11, 1900), att(12, 14, 1300)];
exports.VIDEO = { id: 'v1', title: 'Offside Analysis 1', description: 'Analyze this offside situation and determine the correct referee decision.', video_url: 'offside-analysis-1.mp4', topic: 'Offside', correct_action: 'Indirect free kick', correct_sanction: 'No card', is_active: true, created_at: '2026-02-22T00:00:00Z', updated_at: '2026-02-22T00:00:00Z' };
// fixtures used by every signed-in page
exports.base = (o = {}) => [
  ['GET /auth/v1/user', h.USER],
  ['GET /rest/v1/profiles', [exports.PROFILE]],
  ['PATCH /rest/v1/profiles', [exports.PROFILE]],
  ['GET /rest/v1/stripe_subscriptions', o.sub ? [o.sub] : []],
  ['HEAD /rest/v1/notifications', { __headers: { 'content-range': '0-0/' + (o.unread ?? 1) } }],
  ['POST /rest/v1/rpc/get_total_unread_count', o.msgs ?? 2],
  ['POST /rest/v1/rpc/get_dashboard_stats', o.stats || exports.STATS],
];
