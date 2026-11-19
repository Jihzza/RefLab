#!/usr/bin/env python3
"""Pack the RefLab super mockup (index.html + every screen page) into ONE self-contained HTML file Daniel can open on
his phone. Adapted from tertulia-saikan/coord/tools/bundle-super-maquete.py (same mechanics): each page is stored as a
string and loaded into the frame with srcdoc; a small shim stands in for the page address and storage. The CSS block
that every captured page shares is stored once. Usage: python3 empacotar.py <dir with index.html and pages> <out.html>"""
import json, pathlib, re, sys
src_dir = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2])
shell = (src_dir / "index.html").read_text(encoding="utf-8")
raw = {p.name: p.read_text(encoding="utf-8") for p in sorted(src_dir.glob("*.html")) if p.name != "index.html" and not p.name.startswith("super-maquete")}
# the biggest <style> block, if shared by most pages, is stored once
from collections import Counter
blocks = Counter()
for t in raw.values():
    for m in re.finditer(r"<style[^>]*>([\s\S]*?)</style>", t):
        if len(m.group(1)) > 20000: blocks[m.group(1)] += 1
CSS = [b for b, n in blocks.most_common() if n > 1]
pages = {}
for name, t in raw.items():
    for i, b in enumerate(CSS):
        t = t.replace(b, "/*__CSS%d__*/" % i)
    t = re.sub(r"(?<![\w.$])location\.", "__loc.", t)
    t = re.sub(r"(?<![\w.$])localStorage\b", "__ls", t)
    t = re.sub(r"(?<![\w.$])sessionStorage\b", "__ss", t)
    pages[name] = t
SHIM = r"""(function(){
var BASE='https://maquete.reflab/';
var cur=new URL(__U__,BASE);
var STORE=__S__;
function post(m){try{parent.postMessage(m,'*');}catch(e){}}
function go(h){var u=new URL(h,cur);if(u.origin!==cur.origin){location.href=u.href;return;}post({reflab:'nav',u:u.href.slice(BASE.length)});}
window.__loc={get href(){return cur.href},set href(v){go(v)},get search(){return cur.search},set search(v){var u=new URL(cur.href);u.search=v;go(u.href)},
get hash(){return cur.hash},set hash(v){cur.hash=v;jump()},get pathname(){return cur.pathname},get origin(){return cur.origin},
assign:function(v){go(v)},replace:function(v){go(v)},reload:function(){go(cur.href)},toString:function(){return cur.href}};
function mk(kind){var d=STORE[kind]||(STORE[kind]={});return{getItem:function(k){return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null},
setItem:function(k,v){d[k]=String(v);post({reflab:'store',kind:kind,k:k,v:String(v)})},removeItem:function(k){delete d[k];post({reflab:'store',kind:kind,k:k,v:null})},
clear:function(){for(var k in d){delete d[k];post({reflab:'store',kind:kind,k:k,v:null})}}};}
window.__ls=mk('local');window.__ss=mk('session');
function rs(s,t,u){if(u!=null&&u!==''){cur=new URL(u,cur);}}
try{history.replaceState=rs;history.pushState=rs;}catch(e){}
function jump(){var id=decodeURIComponent(cur.hash.slice(1));var el=id&&document.getElementById(id);if(el)el.scrollIntoView();}
addEventListener('click',function(e){if(e.defaultPrevented)return;var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;if(!a)return;
var h=a.getAttribute('href')||'';if(/^(https?:|mailto:|tel:|javascript:)/i.test(h))return;e.preventDefault();
if(h.charAt(0)==='#'){cur.hash=h;jump();try{dispatchEvent(new HashChangeEvent('hashchange'))}catch(x){}return;}go(h);});
addEventListener('submit',function(e){if(!e.defaultPrevented)e.preventDefault();});
})();"""
boot = r"""
<script>
/* Versão num só ficheiro: as páginas vivem aqui dentro e abrem na moldura sem precisar de servidor. */
window.__PAGES = __PAGES__;
window.__CSS = __CSSJS__;
window.__STORE = {local:{}, session:{}};
window.__SHIM = __SHIMJS__;
window.__load = function (frame, u) {
  var file = String(u).split(/[?#]/)[0], html = window.__PAGES[file];
  if (!html) { frame.srcdoc = '<p style="font:16px sans-serif;padding:24px">Esta página não está na maquete.</p>'; return; }
  html = html.replace(/\/\*__CSS(\d+)__\*\//g, function (m, i) { return window.__CSS[+i]; });
  var shim = '<script>' + window.__SHIM.replace('__U__', function () { return JSON.stringify(String(u)); }).replace('__S__', function () { return JSON.stringify(window.__STORE).replace(/<\//g, '<\\/'); }) + '<\/script>';
  var m = html.match(/<head[^>]*>/i);
  var doc = m ? html.slice(0, m.index + m[0].length) + shim + html.slice(m.index + m[0].length) : shim + html;
  window.__n = (window.__n || 0) + 1;
  frame.srcdoc = doc + '<!-- ' + window.__n + ' -->';
};
</script>
"""
def js_str(v):
    s = json.dumps(v, ensure_ascii=False)
    return s.replace("</", "<\\/").replace("<!--", "<\\!--").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
boot = boot.replace("__PAGES__", js_str(pages)).replace("__CSSJS__", js_str(CSS)).replace("__SHIMJS__", js_str(SHIM))
assert shell.count("frame.src = u;") == 1
shell = shell.replace("frame.src = u;", "window.__load(frame, u);")
hook = "const m = e.data; if (!m || m.reflab !== 'pagina' || e.source !== frame.contentWindow) return;"
assert shell.count(hook) == 1
shell = shell.replace(hook, (
    "const m = e.data; if (!m || e.source !== frame.contentWindow) return;\n"
    "    if (m.reflab === 'nav') { show(String(m.u)); return; }\n"
    "    if (m.reflab === 'store') { const d = window.__STORE[m.kind] || (window.__STORE[m.kind] = {}); if (m.v === null) delete d[m.k]; else d[m.k] = m.v; return; }\n"
    "    if (m.reflab !== 'pagina') return;"))
i = shell.index("<script>")
shell = shell[:i] + boot + shell[i:]
out.write_text(shell, encoding="utf-8")
print(out, out.stat().st_size // 1024, "KB,", len(pages), "pages,", len(CSS), "shared CSS blocks")
