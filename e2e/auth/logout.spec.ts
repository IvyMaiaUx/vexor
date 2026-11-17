import { expect, test } from "@playwright/test";
import { getE2eConfig } from "../helpers/env";

const config = getE2eConfig();

test.describe("Auth - Logout", () => {
  test("realiza logout, limpa sessão e volta a bloquear rotas protegidas", async ({
    page,
  }) => {
    test.skip(
      !config.hasCredentials,
      "Pulando logout real: E2E_EMAIL e E2E_PASSWORD não definidos em .env.e2e.local."
    );

    await page.goto("/login");
    await page.locator("#login-email").fill(config.email);
    await page.locator("#login-password").fill(config.password);
    await page.locator('button[type="submit"]').click();

    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });

    const signOutBtn = page
      .getByRole("button", { name: /^(sair|sign out|encerrar sessão)$/i })
      .first();
    await expect(signOutBtn).toBeVisible({ timeout: 10_000 });
    await signOutBtn.click();

    await expect
      .poll(
        async () => {
          const res = await page.request.get("/api/auth/session");
          const data = await res.json();
          return Boolean(data.authenticated);
        },
        { timeout: 15_000 }
      )
      .toBe(false);

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

    await page.goto("/cybercrime-research");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
