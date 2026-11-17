import fs from "node:fs";
import path from "node:path";

/**
 * Lightweight loader for `.env.e2e.local` so Playwright tests do not require
 * extra dependencies like `dotenv`. Existing process.env variables take precedence.
 */
export function loadE2eEnvFile(
  filePath = path.resolve(process.cwd(), ".env.e2e.local")
): void {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

export function getE2eConfig() {
  loadE2eEnvFile();

  const baseUrl = process.env.E2E_BASE_URL?.trim() || "http://localhost:3000";
  const email = process.env.E2E_EMAIL?.trim() || "";
  const password = process.env.E2E_PASSWORD?.trim() || "";
  const allowEmails = process.env.E2E_ALLOW_EMAILS?.trim() === "true";
  const allowPasswordChange =
    process.env.E2E_ALLOW_PASSWORD_CHANGE?.trim() === "true";
  const signupEmail = process.env.E2E_SIGNUP_EMAIL?.trim() || "";
  const signupUsername = process.env.E2E_SIGNUP_USERNAME?.trim() || "";

  return {
    baseUrl,
    email,
    password,
    hasCredentials: Boolean(email && password),
    allowEmails,
    allowPasswordChange,
    signupEmail,
    signupUsername,
  };
}
