const h = require('./harness'); const routes = require('./routes'); const F = require('./fx');
const tabBtn = (p, t) => p.locator('button', { hasText: new RegExp('^\\s*' + t + '\\s*$') }).first().click();
const LEARN = [
  ['HEAD /rest/v1/test_attempts', { __headers: { 'content-range': '0-0/2' } }],
  ['GET /rest/v1/test_attempts', (req, u) => u.searchParams.get('select') === 'score_percent' ? F.ATTEMPTS.map(a => ({ score_percent: a.score_percent })).sort((a,b)=> u.searchParams.get('order')?.startsWith('score') ? b.score_percent-a.score_percent : 0) : u.searchParams.get('select') === 'time_elapsed_seconds' ? F.ATTEMPTS.map(a => ({ time_elapsed_seconds: a.time_elapsed_seconds })) : F.ATTEMPTS],
  ['HEAD /rest/v1/question_sessions', { __headers: { 'content-range': '0-0/3' } }],
  ['GET /rest/v1/question_practice_answers', Array.from({ length: 87 }, (_, i) => ({ is_correct: i % 3 !== 0 }))],
  ['GET /rest/v1/question_sessions', [{ total_answered: 10, total_correct: 7 }, { total_answered: 20, total_correct: 14 }]],
  ['GET /rest/v1/question_bank', (req, u) => { const s = u.searchParams.get('select'); if (s === 'law') return F.QUESTIONS.map(q => ({ law: q.law })); if (s === 'topic') return F.QUESTIONS.map(q => ({ topic: q.topic })); return F.QUESTIONS; }],
  ['GET /rest/v1/video_scenarios', [F.VIDEO]],
  ['POST /rest/v1/rpc/get_random_questions', F.QUESTIONS],
  ['POST /rest/v1/test_attempts', [{ id: 'new1', user_id: h.USER.id, test_id: null, status: 'in_progress', started_at: new Date().toISOString(), time_limit_seconds: 2400 }]],
  ['POST /rest/v1/question_sessions', [{ id: 's1', user_id: h.USER.id, mode: 'quick', started_at: new Date().toISOString(), total_answered: 0, total_correct: 0 }]],
  ['POST /rest/v1/question_practice_answers', [{ id: 'pa' }]],
  ['POST /rest/v1/video_attempts', [{ id: 'va' }]],
  ['PATCH /rest/v1/question_sessions', [{ id: 's1' }]],
];
const shots = [
  { file: 'painel.html', path: '/app/dashboard', full: true },
  { file: 'painel-vazio.html', path: '/app/dashboard', fx: [['POST /rest/v1/rpc/get_dashboard_stats', F.STATS_EMPTY]] },
  { file: 'painel-erro.html', path: '/app/dashboard', fx: [['POST /rest/v1/rpc/get_dashboard_stats', { __status: 500, __body: { message: 'boom' } }]] },
  { file: 'painel-a-carregar.html', path: '/app/dashboard', fx: [['POST /rest/v1/rpc/get_dashboard_stats', { __hang: true }]], wait: 300 },
  { file: 'menu.html', path: '/app/dashboard', act: async p => p.locator('header svg[role=button]').first().click() },
  { file: 'aprender.html', path: '/app/learn', fx: LEARN },
  { file: 'aprender-historico.html', path: '/app/learn', fx: LEARN, act: async p => p.getByRole('button', { name: /Histórico|history/i }).first().click() },
  { file: 'perguntas.html', path: '/app/learn', fx: LEARN, act: async p => tabBtn(p, 'Perguntas') },
  { file: 'videos.html', path: '/app/learn', fx: LEARN, act: async p => tabBtn(p, 'Vídeos'), after: 1500 },
  { file: 'cursos.html', path: '/app/learn', fx: LEARN, act: async p => tabBtn(p, 'Cursos') },
  { file: 'recursos.html', path: '/app/learn', fx: LEARN, act: async p => tabBtn(p, 'Recursos') },
  { file: 'testes-lista.html', path: '/app/tests' },
  { file: 'teste-endereco.html', path: '/app/learn/test/react-basics', fx: [['GET /rest/v1/tests', { __status: 406, __body: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: 'The result contains 0 rows' } }]] },
];
module.exports = { LEARN, tabBtn };
if (require.main === module) h.run(shots, { routes, base: F.base() });
