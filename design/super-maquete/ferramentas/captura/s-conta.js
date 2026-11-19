const h = require('./harness'); const routes = require('./routes'); const F = require('./fx'); const S = require('./fxsocial');
const mins = n => new Date(Date.now() - n * 60e3).toISOString();
const N = (id, type, actor, m, read, ref) => ({ id, user_id: h.USER.id, actor_id: actor ? actor.id : null, reference_id: ref || null, type, title: type, message: '', read, dismissed_permanently: false, next_reminder_at: null, created_at: mins(m), updated_at: mins(m), actor });
const NOTIFS = [
  N('n1', 'liked_post', S.ANA, 12, false, 'p4'), N('n2', 'comment_on_post', S.RUI, 50, false, 'p4'), N('n3', 'mentioned_in_comment', S.ANA, 180, true, 'p1'),
  N('n4', 'new_follower', S.RUI, 600, true), N('n5', 'reposted_post', S.TIAGO, 1500, true, 'p4'), N('n6', 'welcome_to_plan', null, 3000, true),
  N('n7', 'plan_expiration_reminder', null, 4000, true), N('n8', 'profile_incomplete', null, 30000, true), N('n9', 'reply_to_comment', S.ANA, 5000, true, 'p1'), N('n10', 'new_content_available', null, 8000, true),
];
const PREFS = { liked_post: true, comment_on_post: true, reply_to_comment: true, mentioned_in_comment: true, reposted_post: true, new_follower: true, new_message: true, streak_track: true, streak_reminder: true, streak_loss: false, new_content_available: true };
const SUBS = {
  pro: { user_id: h.USER.id, stripe_subscription_id: 'sub_x', price_id: 'price_x', plan: 'pro', status: 'active', current_period_end: new Date(Date.now() + 18 * 864e5).toISOString(), cancel_at_period_end: false, created_at: F.day(12), updated_at: F.day(12) },
};
SUBS.cancel = Object.assign({}, SUBS.pro, { cancel_at_period_end: true });
SUBS.pastdue = Object.assign({}, SUBS.pro, { plan: 'plus', status: 'past_due' });
const INV = { invoices: [ { id: 'in1', number: 'A1B2C3-0002', amount_paid: 499, currency: 'eur', status: 'paid', created: Math.floor(Date.now() / 1000) - 12 * 86400, hosted_invoice_url: 'https://x', invoice_pdf: 'https://x' }, { id: 'in0', number: 'A1B2C3-0001', amount_paid: 499, currency: 'eur', status: 'paid', created: Math.floor(Date.now() / 1000) - 42 * 86400, hosted_invoice_url: 'https://x', invoice_pdf: 'https://x' } ], has_more: false };
const CONTA = [
  ['GET /rest/v1/notifications', NOTIFS], ['PATCH /rest/v1/notifications', []],
  ['POST /rest/v1/rpc/get_user_settings_all', { settings: { messaging_privacy: 'everyone' }, notification_preferences: PREFS }],
  ['POST /rest/v1/rpc/get_blocked_users', [{ id: S.TIAGO.id, username: 'SharpWhistle4821', name: null, photo_url: null, blocked_at: F.day(3) }]],
  ['POST /functions/v1/list-invoices', INV],
  ['POST /rest/v1/rpc/get_profile_feed', []],
];
const base = o => F.base(Object.assign({ unread: 2 }, o));
const shots = [
  { file: 'notificacoes.html', path: '/app/notifications', fx: CONTA, full: true },
  { file: 'notificacoes-vazia.html', path: '/app/notifications', fx: [['GET /rest/v1/notifications', []], ...CONTA] },
  { file: 'definicoes.html', path: '/app/settings', fx: CONTA, full: true },
  { file: 'definicoes-apagar.html', path: '/app/settings', fx: CONTA, act: async p => { await p.getByRole('button', { name: /Eliminar conta|Apagar conta/ }).first().click(); } },
  { file: 'definicoes-limpar.html', path: '/app/settings', fx: CONTA, act: async p => { await p.getByRole('button', { name: /histórico|Limpar/i }).first().click(); } },
  { file: 'planos.html', path: '/app/pricing', fx: CONTA, full: true },
  { file: 'planos-pro.html', path: '/app/pricing', fx: CONTA, base: { sub: SUBS.pro }, full: true },
  { file: 'planos-pro-mudar.html', path: '/app/pricing', fx: CONTA, base: { sub: SUBS.pro }, act: async p => p.getByRole('button', { name: /Mudar para Plus|Switch to Plus/ }).first().click() },
  { file: 'planos-pro-cancelar.html', path: '/app/pricing', fx: CONTA, base: { sub: SUBS.pro }, act: async p => p.getByRole('button', { name: /Cancelar subscrição/ }).first().click() },
  { file: 'planos-a-cancelar.html', path: '/app/pricing', fx: CONTA, base: { sub: SUBS.cancel } },
  { file: 'planos-pagamento-falhou.html', path: '/app/pricing', fx: CONTA, base: { sub: SUBS.pastdue } },
  { file: 'planos-checkout-feito.html', path: '/app/pricing?checkout=success', fx: CONTA },
];
(async () => { for (const s of shots) { if (process.env.ONLY && !s.file.includes(process.env.ONLY)) continue; await h.run([s], { routes, base: base(s.base) }); } })();
