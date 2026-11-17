import { expect, test } from "@playwright/test";

test.describe("Auth - Proteção de Rotas e Acesso Anônimo", () => {
  test("bloqueia rotas administrativas sem sessão ativa", async ({ page }) => {
    for (const route of ["/admin", "/admin/users", "/admin/audit"]) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    }
  });

  test("bloqueia /cybercrime-research sem sessão ativa", async ({ page }) => {
    await page.goto("/cybercrime-research");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test("permite acesso anônimo às rotas públicas /, /login e /register", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).not.toHaveURL(/\/login/);

    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("#login-email")).toBeVisible();

    await page.goto("/register");
    await expect(page).toHaveURL(/\/register/);
    await expect(page.locator("#reg-email")).toBeVisible();
  });

  test("/profile não expõe dados privados sem sessão", async ({ page }) => {
    await page.goto("/profile");

    await expect(
      page.getByRole("button", { name: /editar perfil|edit profile/i })
    ).toHaveCount(0);

    await expect(
      page.getByText(
        /não autenticado|faça login|sign in|login|entrar|perfil não encontrado/i
      ).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
