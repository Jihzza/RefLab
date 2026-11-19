const h = require('./harness'); const routes = require('./routes');
const AUTHERR = ['POST /auth/v1/token', { __status: 400, __body: { error: 'invalid_grant', error_description: 'Invalid login credentials', code: 'invalid_credentials', msg: 'Invalid login credentials' } }];
const fill = async (p, sel, v) => p.fill(sel, v);
const tab = async (p, txt) => p.getByRole('button', { name: txt, exact: true }).first().click();
const shots = [
  { file: 'inicio.html', path: '/', auth: false, links: [{ sel: 'button:has-text("Criar conta")', to: 'criar-conta.html' }, { sel: 'button:has-text("Esqueceste-te")', to: 'esqueci.html' }] },
  { file: 'inicio-cookies.html', path: '/', auth: false, ls: { 'cookie-consent': '' }, act: async p => { await p.evaluate(() => localStorage.removeItem('cookie-consent')); await p.reload(); await p.waitForTimeout(800); } },
  { file: 'entrar-erros.html', path: '/', auth: false, act: async p => { await p.locator('form button[type=submit]').first().click(); } },
  { file: 'entrar-errado.html', path: '/', auth: false, fx: [AUTHERR], act: async p => { await fill(p, 'input[type=email]', 'joao.silva@example.com'); await fill(p, 'input[type=password]', 'palavra123'); await p.locator('form button[type=submit]').first().click(); } },
  { file: 'criar-conta.html', path: '/', auth: false, act: async p => tab(p, 'Criar conta') },
  { file: 'criar-conta-erros.html', path: '/', auth: false, act: async p => { await tab(p, 'Criar conta'); await p.waitForTimeout(300); await fill(p, 'input[type=email]', 'joao@'); const pw = p.locator('input[type=password]'); await pw.nth(0).fill('123'); await pw.nth(1).fill('1234'); await p.locator('form button[type=submit]').first().click(); } },
  { file: 'criar-conta-feito.html', path: '/', auth: false, fx: [['POST /auth/v1/signup', { id: 'x', email: 'joao.silva@example.com', identities: [{}] }]], act: async p => { await tab(p, 'Criar conta'); await p.waitForTimeout(300); await fill(p, 'input[type=email]', 'joao.silva@example.com'); const pw = p.locator('input[type=password]'); await pw.nth(0).fill('palavra123'); await pw.nth(1).fill('palavra123'); await p.locator('form button[type=submit]').first().click(); } },
  { file: 'esqueci.html', path: '/', auth: false, act: async p => p.getByText('Esqueceste-te da palavra-passe?').click() },
  { file: 'esqueci-enviado.html', path: '/', auth: false, fx: [['POST /auth/v1/recover', {}]], act: async p => { await p.getByText('Esqueceste-te da palavra-passe?').click(); await p.waitForTimeout(300); await fill(p, 'input[type=email]', 'joao.silva@example.com'); await p.locator('form button[type=submit]').first().click(); } },
  { file: 'nova-passe.html', path: '/reset-password' },
  { file: 'nova-passe-erros.html', path: '/reset-password', act: async p => { const pw = p.locator('input[type=password]'); await pw.nth(0).fill('abc'); await pw.nth(1).fill('abcd'); await p.locator('button[type=submit]').click(); } },
  { file: 'nova-passe-feita.html', path: '/reset-password', fx: [['PUT /auth/v1/user', h.USER]], act: async p => { const pw = p.locator('input[type=password]'); await pw.nth(0).fill('palavra123'); await pw.nth(1).fill('palavra123'); await p.locator('button[type=submit]').click(); }, after: 400 },
  { file: 'nova-passe-invalida.html', path: '/reset-password', auth: false, wait: 3500 },
  { file: 'regresso.html', path: '/auth/callback?code=abc', auth: false, fx: [['POST /auth/v1/token', { __hang: true }]] },
  { file: 'regresso-falhou.html', path: '/auth/callback?code=abc', auth: false, fx: [AUTHERR], wait: 2500 },
  { file: 'legal-privacidade.html', path: '/privacy', auth: false },
  { file: 'legal-termos.html', path: '/terms', auth: false },
  { file: 'legal-cookies.html', path: '/cookies', auth: false },
  { file: 'a-carregar.html', path: '/app/dashboard', fx: [['GET /rest/v1/profiles', { __hang: true }], ['POST /rest/v1/rpc/get_dashboard_stats', { __hang: true }]], wait: 400 },
];
h.run(shots, { routes });
