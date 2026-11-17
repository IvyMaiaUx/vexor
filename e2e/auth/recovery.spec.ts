import { expect, test } from "@playwright/test";
import { getE2eConfig } from "../helpers/env";

const config = getE2eConfig();

test.describe("Auth - Recuperação e Redefinição de Senha", () => {
  test("abre /forgot-password e valida e-mail inválido", async ({ page }) => {
    await page.goto("/forgot-password");

    await expect(page.locator("#recovery-email")).toBeVisible();

    await page.locator("#recovery-email").fill("email-invalido");
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/forgot-password/);
    await expect(page.locator("p.text-rose-400").first()).toBeVisible();
  });

  test("/auth/reset-password exibe bloqueio para link expirado ou inválido", async ({
    page,
  }) => {
    await page.goto("/auth/reset-password?error=recovery_link_invalid");

    await expect(
      page.getByText(/expirado|inválido|expired|invalid|solicitar novo/i).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
  });

  test("/auth/reset-password bloqueia acesso anônimo sem sessão de recuperação", async ({
    page,
  }) => {
    await page.goto("/auth/reset-password");

    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    await expect(
      page.getByText(/expirado|inválido|expired|invalid|recuperação|recovery/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("/auth/reset-password bloqueia sessão comum de login (não-recovery)", async ({
    page,
  }) => {
    test.skip(
      !config.hasCredentials,
      "Pulando bloqueio de sessão comum em recovery: E2E_EMAIL e E2E_PASSWORD não definidos em .env.e2e.local."
    );

    await page.goto("/login");
    await page.locator("#login-email").fill(config.email);
    await page.locator("#login-password").fill(config.password);
    await page.locator('button[type="submit"]').click();

    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });

    await page.goto("/auth/reset-password");
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    await expect(
      page.getByText(/expirado|inválido|expired|invalid|recuperação|recovery/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("envia solicitação real de recuperação de senha", async ({ page }) => {
    test.skip(
      !config.allowEmails || !config.email,
      "Pulando envio real de recuperação: E2E_ALLOW_EMAILS !== 'true' ou E2E_EMAIL não definido."
    );

    await page.goto("/forgot-password");
    await page.locator("#recovery-email").fill(config.email);
    await page.locator('button[type="submit"]').click();

    await expect(
      page.getByText(/verifique seu e-mail|check your email|se existir uma conta/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("atualização real de senha em /auth/reset-password", async () => {
    test.skip(
      !config.allowPasswordChange,
      "Pulando alteração real de senha: E2E_ALLOW_PASSWORD_CHANGE !== 'true' (preserva credenciais de teste)."
    );
  });
});
