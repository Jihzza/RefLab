// One JPEG per screen page (phone width, first screen), rendered from the pages of this folder.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => { const dir = path.resolve(process.argv[2]); const br = await chromium.launch(); const p = await br.newPage({ viewport: { width: 390, height: 844 } });
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'index.html' && !f.startsWith('super-maquete'))) {
    await p.goto('file://' + path.join(dir, f)); await p.waitForTimeout(350);
    await p.screenshot({ path: path.join(dir, 'imagens', f.replace('.html', '.jpg')), type: 'jpeg', quality: 72 }); }
  await br.close(); })();
