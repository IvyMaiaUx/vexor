import { expect, test } from "@playwright/test";
import { getE2eConfig } from "../helpers/env";

const config = getE2eConfig();

test.describe("Profile - Edição de Perfil (/profile)", () => {
  test("edita perfil, valida limites, cancela alteração e persiste alteração após reload com restauração", async ({
    page,
  }) => {
    test.skip(
      !config.hasCredentials,
      "Pulando edição de perfil: E2E_EMAIL e E2E_PASSWORD não definidos em .env.e2e.local."
    );

    // 1. Login com conta dedicada
    await page.goto("/login");
    await page.locator("#login-email").fill(config.email);
    await page.locator("#login-password").fill(config.password);
    await page.locator('button[type="submit"]').click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });

    // 2. Navega para /profile e abre modal de edição
    await page.goto("/profile");
    const editBtn = page.getByRole("button", {
      name: /editar perfil|edit profile/i,
    });
    await expect(editBtn).toBeVisible({ timeout: 15_000 });
    await editBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const displayNameInput = dialog.getByLabel(
      /nome de exibição|display name/i
    );
    const bioInput = dialog.getByLabel(/bio/i);
    const languageSelect = dialog.getByLabel(/idioma|language/i);

    const originalDisplayName = await displayNameInput.inputValue();
    const originalBio = await bioInput.inputValue();
    const originalLanguage = await languageSelect.inputValue();

    // 3. Verifica limites de campo (maxLength 60 e 500)
    await expect(displayNameInput).toHaveAttribute("maxlength", "60");
    await expect(bioInput).toHaveAttribute("maxlength", "500");

    // 4. Testa cancelar sem salvar (com diálogo de confirmação)
    await displayNameInput.fill("Alteração Cancelada E2E");
    page.once("dialog", (confirmDialog) => confirmDialog.accept());
    await dialog
      .getByRole("button", { name: /cancelar|cancel/i })
      .click();
    await expect(dialog).toBeHidden();

    // Reabre e confirma que o valor não foi salvo
    await editBtn.click();
    await expect(dialog).toBeVisible();
    await expect(displayNameInput).toHaveValue(originalDisplayName);

    // 5. Edita e salva alterações temporárias
    const tempDisplayName = `Vexor E2E ${Date.now().toString(36).slice(-4)}`;
    const tempBio = "Bio temporária validada via Playwright E2E.";
    const tempLanguage = originalLanguage === "pt-BR" ? "en" : "pt-BR";

    try {
      await displayNameInput.fill(tempDisplayName);
      await bioInput.fill(tempBio);
      await languageSelect.selectOption(tempLanguage);

      await dialog
        .getByRole("button", { name: /salvar|save/i })
        .click();

      await expect(dialog).toBeHidden({ timeout: 15_000 });

      // 6. Recarrega a página e valida persistência real
      await page.reload();
      await expect(
        page.getByRole("heading", { name: tempDisplayName })
      ).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(tempBio)).toBeVisible();
    } finally {
      // 7. Restaura valores originais do perfil
      await editBtn.click();
      await expect(dialog).toBeVisible();
      await displayNameInput.fill(originalDisplayName);
      await bioInput.fill(originalBio);
      await languageSelect.selectOption(originalLanguage);
      await dialog
        .getByRole("button", { name: /salvar|save/i })
        .click();
      await expect(dialog).toBeHidden({ timeout: 15_000 });
    }
  });
});
