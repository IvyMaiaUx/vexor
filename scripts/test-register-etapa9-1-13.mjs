import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const srcRoot = path.join(rootDir, "src");

const MOCK_BROWSER_CLIENT_URL = pathToFileURL(path.join(rootDir, "__vexor_mock__/register-browser-client.mjs")).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/lib/supabase/client") {
      return { url: MOCK_BROWSER_CLIENT_URL, shortCircuit: true };
    }
    let mapped = specifier;
    if (specifier.startsWith("@/")) {
      const candidate = path.join(srcRoot, specifier.slice(2));
      if (fs.existsSync(candidate + ".ts")) {
        mapped = pathToFileURL(candidate + ".ts").href;
      } else if (fs.existsSync(candidate + ".tsx")) {
        mapped = pathToFileURL(candidate + ".tsx").href;
      } else if (fs.existsSync(path.join(candidate, "index.ts"))) {
        mapped = pathToFileURL(path.join(candidate, "index.ts")).href;
      }
    } else if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !path.extname(specifier) &&
      context.parentURL?.startsWith("file:")
    ) {
      const parentDir = path.dirname(fileURLToPath(context.parentURL));
      const candidate = path.resolve(parentDir, specifier);
      if (fs.existsSync(candidate + ".ts")) {
        mapped = pathToFileURL(candidate + ".ts").href;
      }
    }
    return nextResolve(mapped, context);
  },

  load(url, context, nextLoad) {
    if (url === MOCK_BROWSER_CLIENT_URL) {
      return {
        format: "module",
        shortCircuit: true,
        source: `
          export function createClient() {
            return {
              auth: {
                async signUp() {
                  throw new Error("Unexpected fallback to unmocked browser createClient().auth.signUp()");
                },
              },
              from(table) {
                throw new Error("registerWithSupabase must not access table via createClient(): " + table);
              },
              rpc(fn) {
                throw new Error("registerWithSupabase must not call rpc via createClient(): " + fn);
              },
            };
          }
        `,
      };
    }
    return nextLoad(url, context);
  },
});

function makeTrapAuthClient(signUpImpl) {
  return {
    signUp: signUpImpl,
    from(table) {
      throw new Error(`registerWithSupabase must not access table via authClient: ${table}`);
    },
    rpc(fn) {
      throw new Error(`registerWithSupabase must not call rpc via authClient: ${fn}`);
    },
  };
}

const { registerWithSupabase } = await import("../src/features/auth/register-service.ts");
const { validateRegistrationInput } = await import("../src/features/auth/validation.ts");

const mockDict = {
  auth: {
    errors: {
      invalidEmail: "INVALID_EMAIL",
      invalidUsername: "INVALID_USERNAME",
      displayNameLength: "DISPLAY_NAME_LEN",
      passwordLength: "PASSWORD_LEN",
      passwordMismatch: "PASSWORD_MISMATCH",
      ethicsRequired: "ETHICS_REQUIRED",
      emailTaken: "EMAIL_TAKEN",
      usernameTaken: "USERNAME_TAKEN",
      invalidIdentifier: "INVALID_ID",
      invalidCredentials: "INVALID_CREDS",
    },
  },
};

console.log("=== ETAPA 9.1.13 — REGISTRATION TEST SUITE ===");

// 1-6. Form validation tests
const baseValid = {
  email: "analyst@vexor.test",
  username: "sec_analyst",
  displayName: "Sec Analyst",
  password: "StrongPassword123!",
  confirmPassword: "StrongPassword123!",
  preferredLanguage: "pt-BR",
  ethicsAccepted: true,
};

assert.equal(validateRegistrationInput(baseValid, [], mockDict).valid, true);
assert.equal(
  validateRegistrationInput({ ...baseValid, email: "invalid-email" }, [], mockDict).errors.email,
  "INVALID_EMAIL"
);
assert.equal(
  validateRegistrationInput({ ...baseValid, password: "short", confirmPassword: "short" }, [], mockDict).errors.password,
  "PASSWORD_LEN"
);
assert.equal(
  validateRegistrationInput({ ...baseValid, confirmPassword: "DifferentPassword123!" }, [], mockDict).errors.confirmPassword,
  "PASSWORD_MISMATCH"
);
assert.equal(
  validateRegistrationInput({ ...baseValid, displayName: "   " }, [], mockDict).errors.displayName,
  "DISPLAY_NAME_LEN"
);
assert.equal(
  validateRegistrationInput({ ...baseValid, displayName: "A".repeat(61) }, [], mockDict).errors.displayName,
  "DISPLAY_NAME_LEN"
);
assert.equal(
  validateRegistrationInput({ ...baseValid, displayName: "A".repeat(60) }, [], mockDict).valid,
  true
);
console.log("  ✓ Tests 1-6 passed (valid, invalid email, short pwd, mismatch, empty/61+ displayName)");

// 7. Network / communication error
const netRes = await registerWithSupabase({
  ...baseValid,
  origin: "https://vexor.local",
  authClient: makeTrapAuthClient(async () => {
    throw new Error("ECONNREFUSED");
  }),
});
assert.deepEqual(netRes, { status: "error", errorCode: "network_error" });
console.log("  ✓ Test 7 passed (network error handled safely)");

// 8. SignUp without immediate session (email confirmation required) + metadata check
let capturedSignUpParams = null;
const confirmRes = await registerWithSupabase({
  ...baseValid,
  nextPath: "https://evil.com/phish",
  origin: "https://vexor.local",
  authClient: makeTrapAuthClient(async (params) => {
    capturedSignUpParams = params;
    return {
      data: { user: { id: "u-1", identities: [{ id: "id-1" }] }, session: null },
      error: null,
    };
  }),
});
assert.equal(confirmRes.status, "confirmation_required");
assert.equal(confirmRes.safeRedirectPath, "/catalog");
assert.equal(
  capturedSignUpParams.options.emailRedirectTo,
  "https://vexor.local/auth/callback?next=%2Fcatalog"
);
assert.deepEqual(capturedSignUpParams.options.data, {
  username: "sec_analyst",
  display_name: "Sec Analyst",
  preferred_locale: "pt-BR",
});
assert.equal("role" in capturedSignUpParams.options.data, false);
console.log("  ✓ Test 8 passed (confirmation_required, safe redirect, metadata compatible with handle_new_user)");

// 9. SignUp with immediate session
const authRes = await registerWithSupabase({
  ...baseValid,
  nextPath: "/profile",
  origin: "https://vexor.local",
  authClient: makeTrapAuthClient(async () => ({
    data: { user: { id: "u-2", identities: [{ id: "id-2" }] }, session: { access_token: "ok" } },
    error: null,
  })),
});
assert.deepEqual(authRes, { status: "authenticated", safeRedirectPath: "/profile" });
console.log("  ✓ Test 9 passed (authenticated session response)");

// 10. Already registered email (anti-enumeration for both error code & empty identities)
const dupErrRes = await registerWithSupabase({
  ...baseValid,
  origin: "https://vexor.local",
  authClient: makeTrapAuthClient(async () => ({
    data: { user: null, session: null },
    error: { code: "user_already_exists", message: "User already registered" },
  })),
});
assert.equal(dupErrRes.status, "confirmation_required");

const dupIdentRes = await registerWithSupabase({
  ...baseValid,
  origin: "https://vexor.local",
  authClient: makeTrapAuthClient(async () => ({
    data: { user: { id: "u-3", identities: [] }, session: null },
    error: null,
  })),
});
assert.equal(dupIdentRes.status, "confirmation_required");
console.log("  ✓ Test 10 passed (anti-enumeration for existing email)");

// 11. Security checks & explicit guard against manual profile INSERT / RPC
function stripComments(source) {
  let out = "";
  let i = 0;
  let state = "code"; // code | single | double | template | line_comment | block_comment

  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1] ?? "";

    if (state === "code") {
      if (ch === "'") {
        state = "single";
        out += ch;
        i += 1;
      } else if (ch === '"') {
        state = "double";
        out += ch;
        i += 1;
      } else if (ch === "`") {
        state = "template";
        out += ch;
        i += 1;
      } else if (ch === "/" && next === "/") {
        state = "line_comment";
        i += 2;
      } else if (ch === "/" && next === "*") {
        state = "block_comment";
        i += 2;
      } else {
        out += ch;
        i += 1;
      }
    } else if (state === "single" || state === "double" || state === "template") {
      out += ch;
      if (ch === "\\" && i + 1 < source.length) {
        out += source[i + 1];
        i += 2;
        continue;
      }
      if (
        (state === "single" && ch === "'") ||
        (state === "double" && ch === '"') ||
        (state === "template" && ch === "`")
      ) {
        state = "code";
      }
      i += 1;
    } else if (state === "line_comment") {
      if (ch === "\n") {
        state = "code";
        out += "\n";
      }
      i += 1;
    } else if (state === "block_comment") {
      if (ch === "*" && next === "/") {
        state = "code";
        out += " ";
        i += 2;
      } else {
        i += 1;
      }
    }
  }
  return out;
}

function assertNoManualProfileWriteInSource(source) {
  const cleaned = stripComments(source);
  assert.doesNotMatch(cleaned, /\.from\s*\(\s*["'`]profiles["'`]\s*\)/);
  assert.doesNotMatch(cleaned, /\.(insert|upsert|rpc)\s*\(/);
}

const registerPageCode = fs.readFileSync(path.join(rootDir, "src/app/register/page.tsx"), "utf8");
const registerServiceCode = fs.readFileSync(path.join(rootDir, "src/features/auth/register-service.ts"), "utf8");
assert.doesNotMatch(registerPageCode, /service_role/i);
assert.doesNotMatch(registerPageCode, /localStorage/);
assert.doesNotMatch(registerPageCode, /registerUser\(/);
assert.doesNotMatch(registerServiceCode, /service_role/i);
assert.doesNotMatch(registerServiceCode, /localStorage/);

assertNoManualProfileWriteInSource(registerServiceCode);
assertNoManualProfileWriteInSource(registerPageCode);
console.log("  ✓ Test 11 passed (no service_role, localStorage, or manual profile INSERT/RPC)");

// 12. Additional registration error scenarios (rate_limited, weak_password, signup_failed) with full trap client
const rateLimitRes = await registerWithSupabase({
  ...baseValid,
  origin: "https://vexor.local",
  authClient: makeTrapAuthClient(async () => ({
    data: { user: null, session: null },
    error: { status: 429, code: "over_request_rate_limit", message: "Too many requests" },
  })),
});
assert.deepEqual(rateLimitRes, { status: "error", errorCode: "rate_limited" });

const weakPwdRes = await registerWithSupabase({
  ...baseValid,
  origin: "https://vexor.local",
  authClient: makeTrapAuthClient(async () => ({
    data: { user: null, session: null },
    error: { status: 422, code: "weak_password", message: "Password should be at least 8 characters" },
  })),
});
assert.deepEqual(weakPwdRes, { status: "error", errorCode: "weak_password" });

const signupFailRes = await registerWithSupabase({
  ...baseValid,
  origin: "https://vexor.local",
  authClient: makeTrapAuthClient(async () => ({
    data: { user: null, session: null },
    error: { status: 500, code: "unexpected_failure", message: "Database error saving new user" },
  })),
});
assert.deepEqual(signupFailRes, { status: "error", errorCode: "signup_failed" });
console.log("  ✓ Test 12 passed (rate_limited, weak_password, signup_failed & trap coverage on all scenarios)");

// 12b. Negative self-tests for stripComments() and manual INSERT/RPC traps
const sampleWithStrings = [
  'const a = "https://vexor.local/auth//callback"; // real comment .insert({})',
  "const b = 'http://test//path'; /* block .from('profiles') */",
  "const c = `https://${'host'}//path`;",
  "const d = 'escaped \\' quote // not comment';",
].join("\n");
const strippedSample = stripComments(sampleWithStrings);
assert.match(strippedSample, /https:\/\/vexor\.local\/auth\/\/callback/);
assert.match(strippedSample, /http:\/\/test\/\/path/);
assert.match(strippedSample, /https:\/\/\$\{'host'\}\/\/path/);
assert.match(strippedSample, /escaped \\' quote \/\/ not comment/);
assert.doesNotMatch(strippedSample, /\.insert\(\{\}\)/);
assert.doesNotMatch(strippedSample, /\.from\('profiles'\)/);

assert.throws(() => assertNoManualProfileWriteInSource('await supabase.from("profiles").insert({ id: "1" });'));
assert.throws(() => assertNoManualProfileWriteInSource("await supabase.rpc('create_profile', {});"));

const trapClient = makeTrapAuthClient(async () => ({ data: { user: null, session: null }, error: null }));
assert.throws(() => trapClient.from("profiles"), /must not access table/);
assert.throws(() => trapClient.rpc("create_profile"), /must not call rpc/);
console.log("  ✓ Test 12b passed (negative self-tests for stripComments & manual INSERT/RPC traps)");

console.log("=== ALL ETAPA 9.1.13 TESTS PASSED ===");
