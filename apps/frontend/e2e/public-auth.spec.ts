import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })
})

test('public landing renders the Free-first launch offer and legal notices', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' })

  await expect(page.locator('h1')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Gratuito' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Pro' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Em breve' }).first()).toBeDisabled()
  await expect(page.getByRole('link', { name: /licen[çc]a da fonte inter/i })).toHaveAttribute(
    'href',
    '/licenses/inter-OFL-1.1.txt',
  )
})

test('keyboard focus stays above the browser-storage notice on the support form', async ({ page }) => {
  await page.goto('/support', { waitUntil: 'networkidle' })

  const submit = page.getByRole('button', { name: /enviar pedido/i })
  const notice = page.getByRole('region', { name: /aviso de cookies e armazenamento/i })
  await expect(submit).toBeVisible()
  await expect(notice).toBeVisible()

  for (let index = 0; index < 20; index += 1) {
    await page.keyboard.press('Tab')
    if (await submit.evaluate((element) => element === document.activeElement)) break
  }

  await expect(submit).toBeFocused()
  const [submitBox, noticeBox] = await Promise.all([submit.boundingBox(), notice.boundingBox()])
  expect(submitBox).not.toBeNull()
  expect(noticeBox).not.toBeNull()
  expect(submitBox!.y + submitBox!.height).toBeLessThanOrEqual(noticeBox!.y - 8)
})

for (const policyPath of ['/privacy', '/terms', '/cookies']) {
  test(`${policyPath} has no decorative blank-scroll overflow`, async ({ page }) => {
    await page.goto(policyPath, { waitUntil: 'networkidle' })

    const dimensions = await page.evaluate(() => ({
      documentHeight: document.documentElement.scrollHeight,
      rootHeight: Math.ceil(document.querySelector('#root')?.getBoundingClientRect().height ?? 0),
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }))

    expect(dimensions.rootHeight).toBeGreaterThan(0)
    expect(dimensions.documentHeight).toBeLessThanOrEqual(dimensions.rootHeight + 2)
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1)
  })
}

for (const protectedPath of ['/app/dashboard', '/admin/moderation', '/legal/accept']) {
  test(`unauthenticated direct visit to ${protectedPath} fails closed to login`, async ({ page }) => {
    await page.goto(protectedPath, { waitUntil: 'networkidle' })

    await expect(page).toHaveURL(/\?auth=login&returnTo=/)
    await expect(page.locator('#auth-login-tab')).toHaveAttribute('aria-selected', 'true')
    const returnTo = new URL(page.url()).searchParams.get('returnTo')
    expect(returnTo).toBe(protectedPath === '/legal/accept' ? '/app/dashboard' : protectedPath)
  })
}
