import { expect, test } from "@playwright/test";
import { getE2eConfig } from "../helpers/env";

const config = getE2eConfig();

test.describe("Auth - Cadastro (/register)", () => {
  test("exibe todos os campos obrigatórios do formulário de cadastro", async ({
    page,
  }) => {
    await page.goto("/register");

    await expect(page.locator("#reg-email")).toBeVisible();
    await expect(page.locator("#reg-username")).toBeVisible();
    await expect(page.locator("#reg-display-name")).toBeVisible();
    await expect(page.locator("#reg-language")).toBeVisible();
    await expect(page.locator("#reg-password")).toBeVisible();
    await expect(page.locator("#reg-confirm-password")).toBeVisible();
    await expect(page.locator('input[type="checkbox"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("valida campos obrigatórios e bloqueia envio quando inválido", async ({
    page,
  }) => {
    await page.goto("/register");

    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/register/);
    await expect(
      page.locator("p.text-rose-400").first()
    ).toBeVisible();
  });

  test("valida divergência de senha e ausência de aceite ético sem enviar requisição", async ({
    page,
  }) => {
    await page.goto("/register");

    await page.locator("#reg-email").fill("e2e-validation@example.invalid");
    await page.locator("#reg-username").fill("e2e_validator");
    await page.locator("#reg-display-name").fill("E2E Validator");
    await page.locator("#reg-password").fill("StrongPass#2026");
    await page.locator("#reg-confirm-password").fill("DifferentPass#2026");

    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/register/);
    await expect(
      page.getByText(/senhas não coincidem|passwords do not match/i)
    ).toBeVisible();
    await expect(
      page.getByText(/termo ético|ethical commitment/i)
    ).toBeVisible();
  });

  test("realiza cadastro real e exibe tela de confirmação de e-mail", async ({
    page,
  }) => {
    test.skip(
      !config.allowEmails || !config.signupEmail,
      "Pulando cadastro real: E2E_ALLOW_EMAILS !== 'true' ou E2E_SIGNUP_EMAIL não definido."
    );

    await page.goto("/register");

    const username =
      config.signupUsername || `vexor_e2e_${Date.now().toString(36)}`;

    await page.locator("#reg-email").fill(config.signupEmail);
    await page.locator("#reg-username").fill(username);
    await page.locator("#reg-display-name").fill("Vexor E2E Test");
    await page.locator("#reg-password").fill("VexorE2E#2026!Secure");
    await page.locator("#reg-confirm-password").fill("VexorE2E#2026!Secure");
    await page.locator('input[type="checkbox"]').check();

    await page.locator('button[type="submit"]').click();

    await expect(
      page.getByRole("heading", {
        name: /verifique seu e-mail|check your email/i,
      })
    ).toBeVisible({ timeout: 15_000 });
  });
});
