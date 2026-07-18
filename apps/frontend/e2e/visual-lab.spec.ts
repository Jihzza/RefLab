import { expect, test } from '@playwright/test'

const screens = [
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

for (const screen of screens) {
  test(`${screen} fixture renders without runtime or horizontal-overflow errors`, async ({
    page,
  }, testInfo) => {
    const pageErrors: string[] = []
    const consoleErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })

    await page.goto(`/visual-lab.html?screen=${screen}`, { waitUntil: 'networkidle' })
    await page.locator('#root > *').first().waitFor({ state: 'visible' })
    await page.evaluate(() => document.fonts.ready)
    if (screen === 'navigation') {
      await page.getByRole('button', { name: 'Abrir menu' }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
    }

    const measurements = await page.evaluate(() => ({
      bodyWidth: document.body.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      textLength: document.body.innerText.trim().length,
    }))

    expect(measurements.textLength).toBeGreaterThan(20)
    expect(measurements.bodyWidth).toBeLessThanOrEqual(measurements.viewportWidth + 1)
    expect(pageErrors).toEqual([])
    expect(consoleErrors).toEqual([])

    const viewport = page.viewportSize()
    await page.screenshot({
      path: testInfo.outputPath(
        `${screen}-${testInfo.project.name}-${viewport?.width ?? 0}x${viewport?.height ?? 0}.png`,
      ),
      fullPage: true,
    })
  })
}
