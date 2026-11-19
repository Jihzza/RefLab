const h = require('./harness'); const routes = require('./routes'); const F = require('./fx');
const shots = [
  { file: 'sessao-expirada.html', path: '/app/dashboard', act: async p => { const p2 = await p.context().newPage(); await p2.goto('http://localhost:5173/privacy'); await p2.evaluate(() => localStorage.removeItem('sb-mock-auth-token')); await p2.close(); }, after: 1500 },
  { file: 'pagina-inexistente.html', path: '/app/nada' },
  { file: 'cookies-na-app.html', path: '/app/dashboard', ls: { 'cookie-consent': '' }, act: async p => { await p.evaluate(() => localStorage.removeItem('cookie-consent')); await p.reload(); await p.waitForTimeout(1000); } },
];
h.run(shots, { routes, base: F.base() });
