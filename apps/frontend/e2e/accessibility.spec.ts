import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

const publicRoutes = ['/', '/support', '/privacy', '/terms', '/cookies'] as const
const fixtureScreens = [
  'dashboard',
  'social',
  'moderation',
  'messages',
  'pricing',
  'profile',
  'settings',
  'learn',
  'test',
  'results',
  'video',
  'notifications',
  'navigation',
] as const

type Finding = {
  route: string
  id: string
  impact: string | null
  targets: string[]
}

async function scan(page: Page, route: string): Promise<Finding[]> {
  await page.goto(route, { waitUntil: 'networkidle' })
  await page.locator('#root > *').first().waitFor({ state: 'visible' })
  await page.evaluate(() => document.fonts.ready)

  const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze()
  return results.violations.map((violation) => ({
    route,
    id: violation.id,
    impact: violation.impact,
    targets: violation.nodes.flatMap((node) => node.target.map(String)),
  }))
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })
})

for (const route of publicRoutes) {
  test(`${route} has no automated WCAG A/AA violations`, async ({ page }) => {
    const findings = await scan(page, route)
    expect(findings, JSON.stringify(findings, null, 2)).toEqual([])
  })
}

for (const screen of fixtureScreens) {
  test(`${screen} fixture has no automated WCAG A/AA violations`, async ({ page }) => {
    const route = `/visual-lab.html?screen=${screen}`
    const findings = await scan(page, route)
    expect(findings, JSON.stringify(findings, null, 2)).toEqual([])
  })
}
