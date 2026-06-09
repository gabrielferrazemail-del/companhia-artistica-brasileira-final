const { test, expect } = require("@playwright/test");

test("home shows a full-screen cover with a CTA to exposicoes", async ({ page }) => {
  await page.goto("/");
  const cta = page.locator(".home-cover-cta");
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute("href", "/exposicoes/");
});

test("the home cover fills the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const box = await page.locator(".home-cover").boundingBox();
  expect(box.height).toBeGreaterThan(600);
});

test("clicking the cover CTA navigates to exposicoes", async ({ page }) => {
  await page.goto("/");
  await page.locator(".home-cover-cta").click();
  await expect(page).toHaveURL(/\/exposicoes\/$/);
});
