const { chromium } = require('playwright');
(async()=>{ const br=await chromium.launch(); const [f,o,w,hh,full]=process.argv.slice(2); const p=await br.newPage({viewport:{width:+w||390,height:+hh||844}});
await p.goto('file://'+require('path').resolve(f)); await p.waitForTimeout(800); await p.screenshot({path:o,fullPage:full==='1'}); await br.close();})();
