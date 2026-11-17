import { expect, test } from "@playwright/test";
import { getE2eConfig } from "../helpers/env";

const config = getE2eConfig();

test.describe("Auth - Login (/login)", () => {
  test("exibe os campos e botão de entrada na página de login", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect(page.locator("#login-email")).toBeVisible();
    await expect(page.locator("#login-password")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("valida campos vazios e formato inválido sem quebrar a página", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page
        .locator("main")
        .getByText(
          /Informe um endereço de e-mail válido\.|Please enter a valid email address\./i
        )
    ).toBeVisible();

    await page.locator("#login-email").fill("e2e-short@example.invalid");
    await page.locator("#login-password").fill("123");
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/login/);
    await expect(
      page
        .locator("main")
        .getByText(
          /A senha deve ter pelo menos 8 caracteres\.|Password must be at least 8 characters long\./i
        )
    ).toBeVisible();
  });

  test("exibe erro genérico seguro ao tentar login com credenciais inválidas", async ({
    page,
  }) => {
    await page.route("**/auth/v1/token*", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "invalid_grant",
          error_description: "Invalid login credentials",
        }),
      });
    });

    await page.goto("/login");

    await page.locator("#login-email").fill("invalid-e2e-user@example.invalid");
    await page.locator("#login-password").fill("WrongPassword#2026");
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/login/);
    await expect(
      page
        .locator("main")
        .getByText(
          /Credenciais inválidas|Invalid email or password|Invalid login credentials/i
        )
    ).toBeVisible({ timeout: 10_000 });
  });

  test("realiza login válido, redireciona e mantém sessão ativa", async ({
    page,
  }) => {
    test.skip(
      !config.hasCredentials,
      "Pulando login real: E2E_EMAIL e E2E_PASSWORD não definidos em .env.e2e.local."
    );

    await page.goto("/login");

    await page.locator("#login-email").fill(config.email);
    await page.locator("#login-password").fill(config.password);
    await page.locator('button[type="submit"]').click();

    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });

    const sessionResponse = await page.request.get("/api/auth/session");
    expect(sessionResponse.status()).toBe(200);
    const sessionJson = await sessionResponse.json();
    expect(sessionJson.authenticated).toBe(true);
  });
});
