// Renders the REAL RefLab app (vite dev on :5173) with a fake Supabase, and saves each state as a static page.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now()/1000);
exports.USER = { id:'11111111-1111-1111-1111-111111111111', aud:'authenticated', role:'authenticated', email:'joao.silva@example.com', user_metadata:{ full_name:'João Silva' }, app_metadata:{provider:'email'}, identities:[{provider:'email'}], created_at:'2026-02-01T10:00:00Z' };
function session(user) {
  const jwt = b64({alg:'HS256',typ:'JWT'})+'.'+b64({sub:user.id,exp:now+86400*30,role:'authenticated',aud:'authenticated',email:user.email})+'.sig';
  return { access_token: jwt, refresh_token:'r', expires_in:86400*30, expires_at: now+86400*30, token_type:'bearer', user };
}
// fixtures: array of [matcher, response]; matcher = 'METHOD /path' prefix or function(req,u). response = value | function
function resolve(fx, req, u) {
  const key = req.method() + ' ' + u.pathname;
  for (const [m, resp] of fx) {
    const ok = typeof m === 'function' ? m(req, u) : (key === m || (m.endsWith('*') && key.startsWith(m.slice(0,-1))));
    if (ok) return typeof resp === 'function' ? resp(req, u) : resp;
  }
  return undefined;
}
const OUT = process.env.OUT;
const LOG = [];
async function inlineAndSave(page, file, meta) {
  const html = await page.evaluate(async (meta) => {
    const toData = async (src) => { try { const r = await fetch(src); const b = await r.blob(); return await new Promise(res => { const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(b); }); } catch (e) { return src; } };
    // keep form values
    document.querySelectorAll('input,textarea,select').forEach(el => {
      if (el.type === 'checkbox' || el.type === 'radio') { if (el.checked) el.setAttribute('checked',''); else el.removeAttribute('checked'); }
      else if (el.tagName === 'TEXTAREA') el.textContent = el.value; else if (el.tagName === 'SELECT') { [...el.options].forEach(o => o.selected ? o.setAttribute('selected','') : o.removeAttribute('selected')); } else el.setAttribute('value', el.value);
    });
    const doc = document.documentElement.cloneNode(true);
    doc.querySelectorAll('script, link[rel="modulepreload"], vite-error-overlay').forEach(s => s.remove());
    for (const l of doc.querySelectorAll('link[rel="stylesheet"]')) { if (/fonts\.googleapis/.test(l.href)) continue; try { const t = await (await fetch(l.href)).text(); const st = document.createElement('style'); st.textContent = t; l.replaceWith(st); } catch (e) {} }
    for (const im of doc.querySelectorAll('img[src]')) { const s = im.getAttribute('src'); if (s.startsWith('/') || s.startsWith('http://localhost') || s.startsWith('http://mock.supabase.test')) im.setAttribute('src', await toData(s)); }
    for (const v of doc.querySelectorAll('video[src], source[src]')) v.removeAttribute('src');
    doc.querySelectorAll('[data-vite-dev-id]').forEach(s => s.removeAttribute('data-vite-dev-id'));
    const sy = window.scrollY;
    return '<!DOCTYPE html>\n' + doc.outerHTML.replace('</body>', '<script>window.__SCROLL=' + sy + ';</script></body>');
  }, meta);
  const shim = fs.readFileSync(path.join(__dirname, 'shim.html'), 'utf8');
  const sh = shim.split('__META__').join(JSON.stringify(meta || {}).replace(/</g,'\\u003c'));
  const i = html.indexOf('</head>'); const out = html.slice(0, i) + sh + html.slice(i);
  fs.writeFileSync(path.join(OUT, file), out);
}
exports.run = async function (shots, opts = {}) {
  const br = await chromium.launch();
  for (const s of shots) {
    if (process.env.ONLY && !s.file.includes(process.env.ONLY)) continue;
    const ctx = await br.newContext({ viewport: { width: s.w || 390, height: s.h || 844 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage(); page.setDefaultTimeout(5000);
    const fx = [...(s.fx || []), ...(opts.base || [])];
    const unknown = new Set();
    await page.route('http://mock.supabase.test/**', async r => {
      const req = r.request(), u = new URL(req.url());
      if (req.method() === 'OPTIONS') return r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
      if (u.pathname.startsWith('/storage/v1/object/public/')) return r.fulfill({ status: 200, contentType: 'image/svg+xml', headers: { 'access-control-allow-origin': '*' }, body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="100%" height="100%" fill="#1e5b3a"/><rect x="40" y="40" width="720" height="420" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="4"/><line x1="400" y1="40" x2="400" y2="460" stroke="#fff" stroke-opacity=".6" stroke-width="4"/><circle cx="400" cy="250" r="70" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="4"/><text x="400" y="490" fill="#fff" fill-opacity=".7" font-family="sans-serif" font-size="18" text-anchor="middle">imagem de exemplo</text></svg>' });
      let res = resolve(fx, req, u);
      if (res === undefined) { unknown.add(req.method() + ' ' + u.pathname + u.search.slice(0, 100)); res = req.method() === 'HEAD' ? { __status: 200, __headers: { 'content-range': '*/0' } } : []; }
      if (res && res.__delay) await new Promise(z => setTimeout(z, res.__delay));
      if (res && res.__hang) return; // never answers: loading state
      const status = (res && res.__status) || 200;
      const headers = Object.assign({ 'access-control-allow-origin': '*', 'access-control-expose-headers': '*', 'content-type': 'application/json' }, (res && res.__headers) || {});
      const body = res && res.__body !== undefined ? res.__body : res;
      const accept = req.headers()['accept'] || '';
      let out = body;
      if (accept.includes('vnd.pgrst.object') && Array.isArray(body)) out = body[0] ?? null;
      if (out === null && accept.includes('vnd.pgrst.object')) return r.fulfill({ status: 406, headers, body: JSON.stringify({ code: 'PGRST116', message: 'no rows' }) });
      r.fulfill({ status, headers, body: typeof out === 'string' && res.__raw ? out : JSON.stringify(out ?? null) });
    });
    await page.route('**/*.{mp4,webm}', r => r.abort());
    await page.route(u => /^https?:\/\/(?!localhost|mock\.supabase|fonts\.)/.test(u.toString()), r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#2f3c5c"/></svg>' }));
    const sess = s.auth === false ? null : session(s.user || exports.USER);
    await page.addInitScript(([sess, ls]) => {
      if (!sessionStorage.getItem('__init')) { sessionStorage.setItem('__init', '1'); localStorage.clear(); if (sess) localStorage.setItem('sb-mock-auth-token', JSON.stringify(sess)); for (const k in ls) localStorage.setItem(k, ls[k]); }
    }, [sess, Object.assign({ 'cookie-consent': 'accepted' }, s.ls || {})]);
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto('http://localhost:5173' + s.path, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(s.wait || 900);
    if (s.act) { try { await s.act(page); } catch (e) { errs.push('ACT ' + e.message.split('\n')[0]); } await page.waitForTimeout(s.after || 700); }
    await inlineAndSave(page, s.file, { route: s.path, routes: opts.routes || {}, links: s.links || [] });
    if (process.env.SHOTS) await page.screenshot({ path: path.join(process.env.SHOTS, s.file.replace('.html', '.png')), fullPage: !!s.full });
    LOG.push({ file: s.file, errs, unknown: [...unknown] });
    console.log(s.file, errs.length ? 'ERR ' + errs.join(' | ').slice(0, 300) : 'ok', unknown.size ? 'UNMOCKED ' + [...unknown].join(' ; ').slice(0, 400) : '');
    await ctx.close();
  }
  await br.close();
  return LOG;
};
