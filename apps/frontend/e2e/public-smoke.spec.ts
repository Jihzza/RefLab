import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const publicRoutes = ["/", "/privacy", "/terms", "/cookies"];

for (const route of publicRoutes) {
  test(`${route} renders without horizontal overflow or serious accessibility violations`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("body")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const launchBlockingViolations = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );
    expect(launchBlockingViolations).toEqual([]);
  });
}

test("protected application routes do not expose authenticated content to a guest", async ({ page }) => {
  await page.goto("/app/dashboard");
  await expect(page).toHaveURL(/\/$/);
});

test("unknown routes render a useful not-found state", async ({ page }) => {
  await page.goto("/this-route-does-not-exist");
  await expect(page.getByRole("heading")).toBeVisible();
});

test("launch signup exposes legal notice and keeps disabled integrations out of the UI", async ({ page }) => {
  await page.goto("/");
  await page.locator("#auth-signup-tab").click();

  const authPanel = page.locator("#auth-panel");
  await expect(authPanel.locator('a[href="/terms"]')).toBeVisible();
  await expect(authPanel.locator('a[href="/privacy"]')).toBeVisible();
  await expect(authPanel.getByRole("button", { name: /google/i })).toHaveCount(0);
  await expect(authPanel.getByLabel("Verificação de segurança")).toHaveCount(0);
});
