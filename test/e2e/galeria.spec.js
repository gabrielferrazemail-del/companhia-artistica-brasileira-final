const { test, expect } = require("@playwright/test");

const EXPO = "/exposicoes/delirios-anatomicos/";

test("expo page has no decorative color blobs", async ({ page }) => {
  await page.goto(EXPO);
  await expect(page.locator(".blobs, .blob")).toHaveCount(0);
});

test("lightbox opens with caption and credit and closes on Escape", async ({ page }) => {
  await page.goto(EXPO);
  const firstImg = page.locator(".s-gallery .tile img").first();
  await firstImg.scrollIntoViewIfNeeded();
  await firstImg.click();

  const lightbox = page.locator(".lightbox");
  await expect(lightbox).toBeVisible();
  await expect(lightbox.locator(".lightbox-img")).toBeVisible();
  // seed do Delírios tem legenda + crédito em todas as fotos
  await expect(lightbox.locator(".lightbox-caption")).not.toBeEmpty();
  await expect(lightbox.locator(".lightbox-credit")).toContainText("Crédito:");

  await page.keyboard.press("Escape");
  await expect(lightbox).toHaveCount(0);
});

test("admin photo fields use Crédito (no fotógrafo) and are optional", async ({ page }) => {
  await page.goto("/painel/editar/");
  const tpl = page.locator("#tpl-photo");
  const html = await tpl.evaluate((t) => t.innerHTML);
  expect(html).toContain('placeholder="Crédito"');
  expect(html).not.toContain("fotógrafo");
  expect(html).not.toContain("required");
  expect(html).toContain("img-frame");
});
