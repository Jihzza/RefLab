const h = require('./harness'); const routes = require('./routes'); const F = require('./fx'); const { LEARN, tabBtn } = require('./s-painel');
const SUB = Object.assign({}, F.ATTEMPTS[0], { id: 'new1', score_correct: 16, score_percent: 80, time_elapsed_seconds: 1122 });
const SUBLOW = Object.assign({}, SUB, { score_correct: 9, score_percent: 45, auto_submitted: true, time_elapsed_seconds: 2400 });
const answers = (n) => F.QUESTIONS.map((q, i) => ({ id: 'aa' + i, attempt_id: 'new1', question_id: q.id, selected_option: i < n ? q.correct_option : (q.correct_option === 'A' ? 'B' : 'A'), is_correct: i < n, confirmed_at: F.day(0), question_bank: q }));
const RES = (att, n) => [
  ['GET /rest/v1/test_attempts', (req, u) => u.searchParams.get('id') ? [att] : (u.searchParams.get('select') === 'score_percent' ? F.ATTEMPTS.map(a => ({ score_percent: a.score_percent })) : u.searchParams.get('select') === 'time_elapsed_seconds' ? F.ATTEMPTS.map(a => ({ time_elapsed_seconds: a.time_elapsed_seconds })) : F.ATTEMPTS)],
  ['GET /rest/v1/test_attempt_answers', answers(n)],
  ['POST /rest/v1/test_attempt_answers', [{ id: 'aa' }]],
  ['PATCH /rest/v1/test_attempt_answers', [{}]],
  ['PATCH /rest/v1/test_attempts', [att]],
  ['POST /rest/v1/rpc/get_attempt_topic_breakdown', n > 12 ? { strong: [{ topic: 'Offside', accuracy: 100, correct: 4, total: 4 }, { topic: 'Fouls', accuracy: 75, correct: 3, total: 4 }], weak: [{ topic: 'Penalties', accuracy: 50, correct: 1, total: 2 }] } : { strong: [{ topic: 'Advantage', accuracy: 100, correct: 2, total: 2 }], weak: [{ topic: 'Handball', accuracy: 25, correct: 1, total: 4 }, { topic: 'VAR', accuracy: 0, correct: 0, total: 2 }] }],
];
const start = async p => { await p.getByRole('button', { name: 'Iniciar teste' }).click(); await p.waitForTimeout(800); };
const opt = (p, i) => p.locator('main .space-y-3 > button').nth(i).click();
const next = p => p.getByRole('button', { name: /^Seguinte$/ }).click();
const allAnswer = async (p, n) => { for (let i = 0; i < 20; i++) { const q = F.QUESTIONS[i]; const k = 'ABCD'.indexOf(q.correct_option); await opt(p, i < n ? k : (k + 1) % 4); await p.waitForTimeout(60); if (i < 19) { await next(p); await p.waitForTimeout(60); } } };
const pick = async (p, right) => { const t = (await p.locator('main h3').first().textContent()).trim(); const q = F.QUESTIONS.find(x => x.question_text === t); const k = 'ABCD'.indexOf(q.correct_option); await p.locator('main .space-y-2 > button').nth(right ? k : (k + 1) % 4).click(); await p.getByRole('button', { name: 'Verificar resposta' }).click(); await p.waitForTimeout(150); };
const quick = async p => { await tabBtn(p, 'Perguntas'); await p.getByRole('button', { name: 'Perguntas rápidas' }).click(); await p.waitForTimeout(800); };
const shots = [
  { file: 'teste-pergunta.html', path: '/app/learn', fx: [...RES(SUB, 16), ...LEARN], act: start },
  { file: 'teste-respondida.html', path: '/app/learn', fx: [...RES(SUB, 16), ...LEARN], act: async p => { await start(p); await opt(p, 1); } },
  { file: 'teste-ultima.html', path: '/app/learn', fx: [...RES(SUB, 16), ...LEARN], act: async p => { await start(p); await allAnswer(p, 16); } },
  { file: 'teste-resultado.html', path: '/app/learn', fx: [...RES(SUB, 16), ...LEARN], full: true, act: async p => { await start(p); await allAnswer(p, 16); await p.getByRole('button', { name: 'Submeter teste' }).click(); await p.waitForTimeout(1200); } },
  { file: 'teste-resultado-baixo.html', path: '/app/learn', fx: [...RES(SUBLOW, 9), ...LEARN], act: async p => { await start(p); await allAnswer(p, 9); await p.getByRole('button', { name: 'Submeter teste' }).click(); await p.waitForTimeout(1200); } },
  { file: 'teste-a-gerar.html', path: '/app/learn', fx: [['POST /rest/v1/rpc/get_random_questions', { __hang: true }], ...LEARN], act: async p => p.getByRole('button', { name: 'Iniciar teste' }).click(), after: 300 },
  { file: 'perguntas-por-lei.html', path: '/app/learn', fx: LEARN, act: async p => { await tabBtn(p, 'Perguntas'); await p.getByRole('button', { name: 'Por lei' }).click(); await p.waitForTimeout(500); await p.locator('main button', { hasText: 'Lei 11' }).first().click().catch(()=>{}); } },
  { file: 'perguntas-por-area.html', path: '/app/learn', fx: LEARN, act: async p => { await tabBtn(p, 'Perguntas'); await p.getByRole('button', { name: 'Por área' }).click(); } },
  { file: 'perguntas-sessao.html', path: '/app/learn', fx: LEARN, act: async p => { await tabBtn(p, 'Perguntas'); await p.getByRole('button', { name: 'Perguntas rápidas' }).click(); await p.waitForTimeout(800); } },
  { file: 'perguntas-certa.html', path: '/app/learn', fx: LEARN, act: async p => { await quick(p); await pick(p, true); } },
  { file: 'perguntas-errada.html', path: '/app/learn', fx: LEARN, act: async p => { await quick(p); await pick(p, false); } },
  { file: 'perguntas-terminar.html', path: '/app/learn', fx: LEARN, act: async p => { await quick(p); await pick(p, false); await p.getByRole('button', { name: 'Terminar sessão' }).last().click(); } },
  { file: 'perguntas-revisao.html', path: '/app/learn', fx: LEARN, full: true, act: async p => { await quick(p); for (const r of [true, false, true]) { await pick(p, r); await p.getByRole('button', { name: /Próxima pergunta/ }).click(); await p.waitForTimeout(250); } await p.getByRole('button', { name: 'Terminar sessão' }).last().click(); await p.waitForTimeout(400); await p.locator('button.bg-\(--error\)').last().click({ force: true }).catch(async () => p.locator('button:text-is("Terminar sessão")').last().click({ force: true })); await p.waitForTimeout(800); } },
  { file: 'videos-sancao.html', path: '/app/learn', fx: LEARN, act: async p => { await tabBtn(p, 'Vídeos'); await p.waitForTimeout(1200); await p.locator('main button', { hasText: 'Pontapé-livre indireto' }).first().click(); await p.getByRole('button', { name: /Seguinte — Sanção/ }).click(); await p.waitForTimeout(200); await p.locator('main button', { hasText: /Sem cartão/ }).first().click(); } },
  { file: 'videos-resultado.html', path: '/app/learn', fx: LEARN, act: async p => { await tabBtn(p, 'Vídeos'); await p.waitForTimeout(1200); await p.locator('main button', { hasText: 'Pontapé-livre indireto' }).first().click(); await p.getByRole('button', { name: /Seguinte — Sanção/ }).click(); await p.waitForTimeout(200); await p.locator('main button', { hasText: /Amarelo|amarelo/ }).first().click(); await p.getByRole('button', { name: 'Confirmar' }).click(); } },
  { file: 'videos-vazio.html', path: '/app/learn', fx: [['GET /rest/v1/video_scenarios', []], ...LEARN], act: async p => tabBtn(p, 'Vídeos'), after: 1500 },
];
h.run(shots, { routes, base: F.base() });
