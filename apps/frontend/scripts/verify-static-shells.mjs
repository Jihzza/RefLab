import { access, readFile, readdir } from 'node:fs/promises'
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
const shells = [
  {
    file: 'index.html',
    title: 'RefLab — Treino para árbitros de futebol',
    path: '/',
    robots: 'index,follow',
  },
  {
    file: 'privacy/index.html',
    title: 'Política de Privacidade — RefLab',
    path: '/privacy',
    robots: 'index,follow',
  },
  {
    file: 'terms/index.html',
    title: 'Termos de Serviço — RefLab',
    path: '/terms',
    robots: 'index,follow',
  },
  {
    file: 'cookies/index.html',
    title: 'Cookies e armazenamento — RefLab',
    path: '/cookies',
    robots: 'index,follow',
  },
  {
    file: 'support/index.html',
    title: 'Suporte — RefLab',
    path: '/support',
    robots: 'index,follow',
  },
  {
    file: 'private.html',
    title: 'RefLab — Match Control',
    path: '/app',
    robots: 'noindex,nofollow',
  },
  {
    file: '404.html',
    title: 'Página não encontrada — RefLab',
    path: '/404',
    robots: 'noindex,nofollow',
  },
]

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function assertMatch(html, expression, message) {
  const matches = html.match(new RegExp(expression.source, `${expression.flags.replace('g', '')}g`)) ?? []
  if (matches.length !== 1) {
    throw new Error(`${message}; expected exactly one match, found ${matches.length}`)
  }
}

for (const shell of shells) {
  const html = await readFile(resolve(distDir, shell.file), 'utf8')
  const canonical = new URL(shell.path, `${siteUrl}/`).toString()
  const label = shell.file

  assertMatch(html, new RegExp(`<title>${escapeRegex(shell.title)}</title>`, 'i'), `${label}: invalid title`)
  assertMatch(
    html,
    new RegExp(`<link\\s+rel="canonical"\\s+href="${escapeRegex(canonical)}"\\s*\\/?>`, 'i'),
    `${label}: invalid canonical URL`,
  )
  assertMatch(
    html,
    new RegExp(`<meta\\s+name="robots"\\s+content="${escapeRegex(shell.robots)}"\\s*\\/?>`, 'i'),
    `${label}: invalid robots directive`,
  )
  assertMatch(
    html,
    new RegExp(`<meta\\s+property="og:url"\\s+content="${escapeRegex(canonical)}"\\s*\\/?>`, 'i'),
    `${label}: invalid Open Graph URL`,
  )
  assertMatch(html, /<meta\s+name="description"\s+content="[^"]+"\s*\/?>/i, `${label}: missing description`)
  assertMatch(html, /<meta\s+property="og:title"\s+content="[^"]+"\s*\/?>/i, `${label}: missing Open Graph title`)
  assertMatch(html, /<meta\s+property="og:description"\s+content="[^"]+"\s*\/?>/i, `${label}: missing Open Graph description`)
  assertMatch(html, /<meta\s+name="twitter:title"\s+content="[^"]+"\s*\/?>/i, `${label}: missing Twitter title`)
  assertMatch(html, /<meta\s+name="twitter:description"\s+content="[^"]+"\s*\/?>/i, `${label}: missing Twitter description`)
  assertMatch(html, /<script\s+type="module"\s+crossorigin\s+src="\/assets\/[^"]+\.js"><\/script>/i, `${label}: missing compiled application script`)
}

for (const publicFile of ['__forms.html', 'manifest.webmanifest', 'reflab-mark.svg', 'robots.txt', 'sitemap.xml']) {
  await access(resolve(distDir, publicFile))
}
await access(resolve(distDir, 'licenses/inter-OFL-1.1.txt'))

const robots = await readFile(resolve(distDir, 'robots.txt'), 'utf8')
const expectedSitemapUrl = new URL('/sitemap.xml', `${siteUrl}/`).toString()
if (
  !robots.includes(`Sitemap: ${expectedSitemapUrl}`)
  || !robots.includes('Disallow: /legal')
  || !robots.includes('Disallow: /admin')
) {
  throw new Error('robots.txt must use the configured site origin and exclude private legal/admin routes')
}

const sitemap = await readFile(resolve(distDir, 'sitemap.xml'), 'utf8')
for (const shell of shells.filter((candidate) => candidate.robots === 'index,follow')) {
  const canonical = new URL(shell.path, `${siteUrl}/`).toString()
  assertMatch(
    sitemap,
    new RegExp(`<loc>${escapeRegex(canonical)}</loc>`, 'i'),
    `sitemap.xml: missing or duplicate public URL ${canonical}`,
  )
}
if (
  sitemap.includes('/app')
  || sitemap.includes('/admin')
  || sitemap.includes('/auth/')
  || sitemap.includes('/legal/')
) {
  throw new Error('sitemap.xml must not expose private application routes')
}

const assets = await readdir(resolve(distDir, 'assets'))
if (!assets.some((file) => file.endsWith('.js')) || !assets.some((file) => file.endsWith('.css'))) {
  throw new Error('dist/assets must contain compiled JavaScript and CSS')
}

try {
  await access(resolve(distDir, '_redirects'))
  throw new Error('dist/_redirects must not shadow the reviewed netlify.toml routing rules')
} catch (error) {
  if (error?.code !== 'ENOENT') throw error
}

console.log(`Verified ${shells.length} deploy shells and ${assets.length} compiled assets.`)
