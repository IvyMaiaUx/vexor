import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getSafeRedirectPath } from "../src/lib/security/redirect.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("=== ETAPA 9.1.12 — AUTH INFRASTRUCTURE TEST SUITE ===");

// 1. Redirect helper unit tests
assert.equal(getSafeRedirectPath(null), "/catalog");
assert.equal(getSafeRedirectPath(undefined), "/catalog");
assert.equal(getSafeRedirectPath(""), "/catalog");
assert.equal(getSafeRedirectPath("   "), "/catalog");
assert.equal(getSafeRedirectPath("/profile"), "/profile");
assert.equal(
  getSafeRedirectPath("/admin/users?tab=1#top"),
  "/admin/users?tab=1#top"
);

// Open redirect & loop protections
assert.equal(getSafeRedirectPath("https://evil.com"), "/catalog");
assert.equal(getSafeRedirectPath("http://evil.com/login"), "/catalog");
assert.equal(getSafeRedirectPath("//evil.com"), "/catalog");
assert.equal(getSafeRedirectPath("/\\evil.com"), "/catalog");
assert.equal(getSafeRedirectPath("javascript:alert(1)"), "/catalog");
assert.equal(getSafeRedirectPath("/catalog\nSet-Cookie: a=1"), "/catalog");
assert.equal(getSafeRedirectPath("/auth/callback?code=abc"), "/catalog");
console.log("  ✓ getSafeRedirectPath passed all internal, external, and loop tests");

// 2. Client & Server Supabase security checks
const clientCode = fs.readFileSync(
  path.join(rootDir, "src/lib/supabase/client.ts"),
  "utf8"
);
assert.match(clientCode, /createBrowserClient/);
assert.doesNotMatch(clientCode, /service_role/i);
assert.doesNotMatch(clientCode, /SUPABASE_SERVICE_ROLE_KEY/);

const serverCode = fs.readFileSync(
  path.join(rootDir, "src/lib/supabase/server.ts"),
  "utf8"
);
assert.match(serverCode, /createServerClient/);
assert.match(serverCode, /await cookies\(\)/);
assert.match(serverCode, /getAll\(/);
assert.match(serverCode, /setAll\(/);
assert.doesNotMatch(serverCode, /let\s+serverClient/);
assert.doesNotMatch(serverCode, /service_role/i);

const authCode = fs.readFileSync(
  path.join(rootDir, "src/lib/supabase/auth.ts"),
  "utf8"
);
assert.match(authCode, /supabase\.auth\.getUser\(\)/);
assert.doesNotMatch(authCode, /localStorage\.(get|set|remove)Item/);
assert.doesNotMatch(authCode, /service_role/i);
console.log("  ✓ Supabase browser/server/auth helpers verified");

// 3. Callback & Proxy checks
const callbackCode = fs.readFileSync(
  path.join(rootDir, "src/app/auth/callback/route.ts"),
  "utf8"
);
assert.match(callbackCode, /exchangeCodeForSession/);
assert.match(callbackCode, /getSafeRedirectPath/);
assert.match(callbackCode, /auth_callback_failed/);
assert.match(callbackCode, /if \(authError \|\| !code \|\| !code\.trim\(\)\)/);

const proxyCode = fs.readFileSync(path.join(rootDir, "src/proxy.ts"), "utf8");
assert.match(proxyCode, /updateSession/);
assert.match(proxyCode, /getUser\(\)/);
assert.doesNotMatch(proxyCode, /localStorage/);
console.log("  ✓ Auth callback route and proxy verified");

// 4. Compatibility check: simulated store preserved
const storeCode = fs.readFileSync(
  path.join(rootDir, "src/features/auth/use-auth-store.ts"),
  "utf8"
);
assert.match(storeCode, /DEMO_PROFILES/);
assert.match(storeCode, /useAuthStore/);
console.log("  ✓ Simulated auth store preserved");

console.log("=== ALL ETAPA 9.1.12 TESTS PASSED ===");
