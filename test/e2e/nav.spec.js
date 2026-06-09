const { test, expect } = require("@playwright/test");

test("desktop nav shows section links and hides the hamburger", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.locator('#nav-links a[href="/sobre/"]')).toBeVisible();
  await expect(page.locator('#nav-links a[href="/contato/"]')).toBeVisible();
  await expect(page.locator("#nav-toggle")).toBeHidden();
});

test("mobile hamburger toggles Sobre/Contato", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const sobre = page.locator('#nav-links a[href="/sobre/"]');
  await expect(page.locator("#nav-toggle")).toBeVisible();
  await expect(sobre).toBeHidden();
  await page.locator("#nav-toggle").click();
  await expect(sobre).toBeVisible();
  await expect(page.locator("#nav-toggle")).toHaveAttribute("aria-expanded", "true");
});
