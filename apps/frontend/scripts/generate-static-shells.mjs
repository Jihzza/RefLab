import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const fallbackSiteUrl = 'https://reflab.netlify.app'
const configuredSiteUrl = process.env.URL || fallbackSiteUrl

let siteUrl
try {
  const candidate = new URL(configuredSiteUrl)
  if (!['http:', 'https:'].includes(candidate.protocol)) throw new Error('unsupported protocol')
  siteUrl = candidate.origin
} catch {
  throw new Error(`URL must be an absolute HTTP(S) origin; received ${JSON.stringify(configuredSiteUrl)}`)
}

const distDir = resolve('dist')
const sourceHtml = await readFile(resolve(distDir, 'index.html'), 'utf8')

// The historical SPA catch-all shadows every route declared in netlify.toml.
// Keep routing/status behavior centralized in the reviewed Netlify config.
await rm(resolve(distDir, '_redirects'), { force: true })

const publicRoutes = {
  privacy: {
    title: 'Política de Privacidade — RefLab',
    description: 'Consulta como o RefLab recolhe, utiliza e protege dados pessoais.',
  },
  terms: {
    title: 'Termos de Serviço — RefLab',
    description: 'Consulta os termos aplicáveis à utilização do RefLab.',
  },
  cookies: {
    title: 'Cookies e armazenamento — RefLab',
    description: 'Consulta como o RefLab utiliza cookies e armazenamento local do navegador.',
  },
  support: {
    title: 'Suporte — RefLab',
    description: 'Contacta o suporte do RefLab para questões técnicas, de conta, faturação ou privacidade.',
  },
}

const landingMetadata = {
  title: 'RefLab — Treino para árbitros de futebol',
  description: 'Treino prático para árbitros de futebol: testes, análise de decisões e acompanhamento de desempenho.',
}

function escapeAttribute(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function escapeText(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function replaceMeta(html, selector, value) {
  const escaped = escapeAttribute(value)
  const expression = selector === 'description'
    ? /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i
    : selector === 'robots'
      ? /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i
      : selector.startsWith('og:')
        ? new RegExp(`<meta\\s+property="${selector}"\\s+content="[^"]*"\\s*\\/?>`, 'i')
        : new RegExp(`<meta\\s+name="${selector}"\\s+content="[^"]*"\\s*\\/?>`, 'i')
  const attribute = selector.startsWith('og:') ? 'property' : 'name'
  const element = `<meta ${attribute}="${selector}" content="${escaped}" />`

  return expression.test(html)
    ? html.replace(expression, element)
    : html.replace('</head>', `    ${element}\n  </head>`)
}

function renderShell({ title, description, path = '/', robots = 'index,follow' }) {
  const canonical = new URL(path, `${siteUrl}/`).toString()
  let html = sourceHtml
    .replace(/<title>[^<]*<\/title>/i, `<title>${escapeText(title)}</title>`)
    .replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${escapeAttribute(canonical)}" />`)

  html = replaceMeta(html, 'description', description)
  html = replaceMeta(html, 'robots', robots)
  html = replaceMeta(html, 'og:title', title)
  html = replaceMeta(html, 'og:description', description)
  html = replaceMeta(html, 'og:url', canonical)
  html = replaceMeta(html, 'twitter:title', title)
  html = replaceMeta(html, 'twitter:description', description)
  return html
}

await writeFile(
  resolve(distDir, 'index.html'),
  renderShell({ ...landingMetadata, path: '/' }),
  'utf8',
)

for (const [route, metadata] of Object.entries(publicRoutes)) {
  const routeDir = resolve(distDir, route)
  await mkdir(routeDir, { recursive: true })
  await writeFile(
    resolve(routeDir, 'index.html'),
    renderShell({ ...metadata, path: `/${route}` }),
    'utf8',
  )
}

await writeFile(
  resolve(distDir, 'private.html'),
  renderShell({
    title: 'RefLab — Match Control',
    description: 'Área privada da plataforma RefLab.',
    path: '/app',
    robots: 'noindex,nofollow',
  }),
  'utf8',
)

await writeFile(
  resolve(distDir, '404.html'),
  renderShell({
    title: 'Página não encontrada — RefLab',
    description: 'A página pedida não foi encontrada.',
    path: '/404',
    robots: 'noindex,nofollow',
  }),
  'utf8',
)

const publicRoutePaths = ['/', ...Object.keys(publicRoutes).map((route) => `/${route}`)]
const sitemapEntries = publicRoutePaths
  .map((path) => `  <url>\n    <loc>${escapeText(new URL(path, `${siteUrl}/`).toString())}</loc>\n  </url>`)
  .join('\n')

await writeFile(
  resolve(distDir, 'robots.txt'),
  [
    'User-agent: *',
    'Allow: /',
    'Disallow: /app',
    'Disallow: /admin',
    'Disallow: /auth',
    'Disallow: /legal',
    'Disallow: /reset-password',
    'Disallow: /__forms.html',
    '',
    `Sitemap: ${new URL('/sitemap.xml', `${siteUrl}/`).toString()}`,
    '',
  ].join('\n'),
  'utf8',
)

await writeFile(
  resolve(distDir, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`,
  'utf8',
)

const licensesDir = resolve(distDir, 'licenses')
await mkdir(licensesDir, { recursive: true })
await copyFile(
  resolve('node_modules/@fontsource-variable/inter/LICENSE'),
  resolve(licensesDir, 'inter-OFL-1.1.txt'),
)
