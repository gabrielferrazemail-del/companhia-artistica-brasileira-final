const { test, expect } = require("@playwright/test");

// Estado deslogado da /entrar/: só o botão de login; ações de logado escondidas
// (garantido pela regra [hidden]{display:none!important} + markup com hidden).
test("logged-out entrar shows only the login button", async ({ page }) => {
  await page.goto("/entrar/");
  await expect(page.locator("[data-login]")).toBeVisible();
});

test("logged-out entrar hides the profile/painel/logout actions", async ({ page }) => {
  await page.goto("/entrar/");
  const actions = page.locator(".auth-actions");
  await expect(actions).toBeHidden();
  await expect(actions.locator('a[href="/painel/"]')).toBeHidden();
  await expect(actions.locator('a[href="/minha-conta/"]')).toBeHidden();
  await expect(actions.locator("[data-logout]")).toBeHidden();
});
