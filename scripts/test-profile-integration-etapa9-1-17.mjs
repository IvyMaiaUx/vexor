import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const srcRoot = path.join(rootDir, "src");

const MOCK_AUTH_STORE_URL = pathToFileURL(
  path.join(rootDir, "__vexor_mock__/auth-store-prof17.mjs")
).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/features/auth/use-auth-store") {
      return { url: MOCK_AUTH_STORE_URL, shortCircuit: true };
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
      } else if (fs.existsSync(candidate + ".tsx")) {
        mapped = pathToFileURL(candidate + ".tsx").href;
      }
    }
    return nextResolve(mapped, context);
  },
  load(url, context, nextLoad) {
    if (url === MOCK_AUTH_STORE_URL) {
      return {
        format: "module",
        shortCircuit: true,
        source: `
          export function useAuthStore() {
            return {
              authMode: "supabase",
              updateProfile: () => {},
              setAuthenticatedSession: () => {},
              refreshSession: async () => ({}),
            };
          }
        `,
      };
    }

    if (url.startsWith("file:") && url.endsWith(".tsx")) {
      const filePath = fileURLToPath(url);
      const source = fs.readFileSync(filePath, "utf8");
      const transpiled = ts.transpileModule(source, {
        fileName: filePath,
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
        },
      });
      return {
        format: "module",
        shortCircuit: true,
        source: transpiled.outputText,
      };
    }

    return nextLoad(url, context);
  },
});

const {
  readOwnProfile,
  readPublicProfileByUsername,
  updateOwnProfile,
} = await import("../src/features/profile/profile-service.ts");

function makeProfileRow(overrides = {}) {
  return {
    id: "user-1",
    username: "sec_analyst",
    display_name: "Sec Analyst",
    avatar_url: "https://cdn.vexor.test/avatar.png",
    bio: "Blue team specialist",
    interests: ["DFIR", "SIEM"],
    github_url: "https://github.com/sec-analyst",
    linkedin_url: "https://linkedin.com/in/sec-analyst",
    preferred_locale: "pt-BR",
    role: "member",
    is_suspended: false,
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
    ...overrides,
  };
}

function makeSupabaseProfileMock({
  user = { id: "user-1", email: "analyst@vexor.test" },
  userError = null,
  throwOnGetUser = false,
  selectRow = makeProfileRow(),
  selectError = null,
  publicRow = null,
  publicError = null,
  updateRow = makeProfileRow(),
  updateError = null,
  onFromTable = null,
  onUpdatePayload = null,
  onUpdateEqId = null,
} = {}) {
  return {
    auth: {
      async getUser() {
        if (throwOnGetUser) {
          throw new Error("ECONNREFUSED");
        }
        return { data: { user }, error: userError };
      },
    },
    from(table) {
      onFromTable?.(table);
      return {
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  if (table === "public_profiles") {
                    return { data: publicRow, error: publicError };
                  }
                  return { data: selectRow, error: selectError };
                },
              };
            },
          };
        },
        update(values) {
          onUpdatePayload?.(values);
          return {
            eq(_col, id) {
              onUpdateEqId?.(id);
              return {
                select() {
                  return {
                    async maybeSingle() {
                      return { data: updateRow, error: updateError };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

console.log("=== ETAPA 9.1.17 — REAL PROFILE INTEGRATION TEST SUITE (OFFLINE MOCKS) ===");

// 1. Read tests
{
  // 1a. Existing active profile
  const resOk = await readOwnProfile({
    client: makeSupabaseProfileMock(),
  });
  assert.equal(resOk.status, "authenticated");
  assert.equal(resOk.profile.id, "user-1");
  assert.equal(resOk.profile.username, "sec_analyst");
  assert.equal(resOk.profile.email, "analyst@vexor.test");

  // 1b. Suspended profile -> explicit `suspended` state
  const resSuspended = await readOwnProfile({
    client: makeSupabaseProfileMock({
      selectRow: makeProfileRow({ is_suspended: true }),
    }),
  });
  assert.equal(resSuspended.status, "suspended");
  assert.equal(resSuspended.profile.isSuspended, true);

  // 1c. Missing profile -> `profile_missing` (does NOT auto-create)
  const resMissing = await readOwnProfile({
    client: makeSupabaseProfileMock({ selectRow: null }),
  });
  assert.deepEqual(resMissing, {
    status: "profile_missing",
    profile: null,
    userId: "user-1",
  });

  // 1d. Unauthenticated user -> `unauthenticated`
  const resUnauth = await readOwnProfile({
    client: makeSupabaseProfileMock({ user: null }),
  });
  assert.deepEqual(resUnauth, { status: "unauthenticated", profile: null });

  // 1e. Connection error -> `connection_error`
  const resConnErr = await readOwnProfile({
    client: makeSupabaseProfileMock({ throwOnGetUser: true }),
  });
  assert.deepEqual(resConnErr, { status: "connection_error", profile: null });

  // 1f. Identity mismatch (`row.id !== user.id`) -> rejected as `profile_missing`
  const resMismatch = await readOwnProfile({
    client: makeSupabaseProfileMock({
      user: { id: "user-1", email: "a@vexor.test" },
      selectRow: makeProfileRow({ id: "user-other" }),
    }),
  });
  assert.equal(resMismatch.status, "profile_missing");

  // 1g. Incomplete / nullable fields mapped safely
  const resIncomplete = await readOwnProfile({
    client: makeSupabaseProfileMock({
      selectRow: makeProfileRow({
        display_name: null,
        avatar_url: null,
        bio: null,
        github_url: null,
        linkedin_url: null,
        interests: [],
      }),
    }),
  });
  assert.equal(resIncomplete.status, "authenticated");
  assert.equal(resIncomplete.profile.displayName, "sec_analyst");
  assert.equal(resIncomplete.profile.avatarUrl, undefined);

  // 1h. Public profile lookup uses `public_profiles` view and omits admin fields
  let queriedTable = null;
  const resPublic = await readPublicProfileByUsername("@Sec_Analyst", {
    client: makeSupabaseProfileMock({
      onFromTable: (t) => {
        queriedTable = t;
      },
      publicRow: {
        id: "user-1",
        username: "sec_analyst",
        display_name: "Sec Analyst",
        avatar_url: null,
        bio: "Public bio",
        interests: ["AppSec"],
        github_url: null,
        linkedin_url: null,
        preferred_locale: "pt-BR",
        created_at: "2026-11-10T00:00:00Z",
      },
    }),
  });
  assert.equal(queriedTable, "public_profiles");
  assert.equal(resPublic.status, "found");
  assert.equal(resPublic.profile.username, "sec_analyst");
  assert.equal(resPublic.profile.email, "");

  const resPublicNotFound = await readPublicProfileByUsername("unknown_user", {
    client: makeSupabaseProfileMock({ publicRow: null }),
  });
  assert.equal(resPublicNotFound.status, "not_found");

  console.log("  ✓ Profile read tests passed");
}

// 2. Update tests
{
  const validInput = {
    username: "new_handle",
    displayName: "New Display Name",
    bio: "Updated bio",
    interests: ["DFIR", "AppSec"],
    avatarUrl: "https://cdn.vexor.test/new.png",
    githubUrl: "https://github.com/new-handle",
    linkedinUrl: "https://linkedin.com/in/new-handle",
    preferredLanguage: "en",
  };

  // 2a. Valid update sends ONLY allowlisted writable columns
  let capturedPayload = null;
  let capturedEqId = null;
  const updOk = await updateOwnProfile(validInput, {
    locale: "pt-BR",
    expectedUserId: "user-1",
    client: makeSupabaseProfileMock({
      onUpdatePayload: (p) => {
        capturedPayload = p;
      },
      onUpdateEqId: (id) => {
        capturedEqId = id;
      },
      updateRow: makeProfileRow({
        username: "new_handle",
        display_name: "New Display Name",
        preferred_locale: "en",
      }),
    }),
  });
  assert.equal(updOk.status, "update_success");
  assert.equal(capturedEqId, "user-1");
  assert.equal("role" in capturedPayload, false);
  assert.equal("is_suspended" in capturedPayload, false);
  assert.equal("id" in capturedPayload, false);
  assert.equal("created_at" in capturedPayload, false);
  assert.equal(capturedPayload.username, "new_handle");

  // 2b. Invalid username
  const badUsername = await updateOwnProfile(
    { ...validInput, username: "INVALID HANDLE!" },
    { locale: "pt-BR", client: makeSupabaseProfileMock() }
  );
  assert.equal(badUsername.status, "update_error");
  assert.equal(badUsername.errorCode, "validation_error");

  // 2c. Invalid display name (> 60 chars)
  const badDisplay = await updateOwnProfile(
    { ...validInput, displayName: "A".repeat(61) },
    { locale: "pt-BR", client: makeSupabaseProfileMock() }
  );
  assert.equal(badDisplay.status, "update_error");
  assert.equal(badDisplay.errorCode, "validation_error");

  // 2d. Bio out of bounds (> 500 chars)
  const badBio = await updateOwnProfile(
    { ...validInput, bio: "B".repeat(501) },
    { locale: "pt-BR", client: makeSupabaseProfileMock() }
  );
  assert.equal(badBio.status, "update_error");
  assert.equal(badBio.errorCode, "validation_error");

  // 2e. Attempt to alter `role` or `is_suspended` or `id` -> blocked before DB
  let dbCalledOnForbidden = false;
  for (const extra of [
    { role: "admin" },
    { is_suspended: false },
    { isSuspended: false },
    { id: "other-user" },
  ]) {
    const resForbidden = await updateOwnProfile(
      { ...validInput, ...extra },
      {
        locale: "pt-BR",
        client: makeSupabaseProfileMock({
          onUpdatePayload: () => {
            dbCalledOnForbidden = true;
          },
        }),
      }
    );
    assert.equal(resForbidden.status, "update_error");
    assert.equal(resForbidden.errorCode, "forbidden_field");
  }
  assert.equal(dbCalledOnForbidden, false);

  // 2f. RLS failure (`42501` or empty `maybeSingle()`)
  const rlsErr = await updateOwnProfile(validInput, {
    locale: "pt-BR",
    client: makeSupabaseProfileMock({
      updateRow: null,
      updateError: { code: "42501", message: "new row violates row-level security policy" },
    }),
  });
  assert.equal(rlsErr.status, "update_error");
  assert.equal(rlsErr.errorCode, "rls_denied");

  const rlsEmpty = await updateOwnProfile(validInput, {
    locale: "pt-BR",
    client: makeSupabaseProfileMock({ updateRow: null, updateError: null }),
  });
  assert.equal(rlsEmpty.status, "update_error");
  assert.equal(rlsEmpty.errorCode, "rls_denied");

  // 2g. Trying to modify another user's profile (`expectedUserId !== auth.uid()`)
  let dbCalledOnOther = false;
  const otherUserErr = await updateOwnProfile(validInput, {
    locale: "pt-BR",
    expectedUserId: "victim-user-2",
    client: makeSupabaseProfileMock({
      user: { id: "attacker-user-1", email: "a@vexor.test" },
      onUpdatePayload: () => {
        dbCalledOnOther = true;
      },
    }),
  });
  assert.equal(otherUserErr.status, "update_error");
  assert.equal(otherUserErr.errorCode, "identity_mismatch");
  assert.equal(dbCalledOnOther, false);

  // 2h. Duplicate username (`23505`)
  const dupErr = await updateOwnProfile(validInput, {
    locale: "pt-BR",
    client: makeSupabaseProfileMock({
      updateRow: null,
      updateError: { code: "23505", message: "duplicate key value violates unique constraint" },
    }),
  });
  assert.equal(dupErr.status, "update_error");
  assert.equal(dupErr.errorCode, "username_taken");

  // 2i. Network error
  const netErr = await updateOwnProfile(validInput, {
    locale: "pt-BR",
    client: makeSupabaseProfileMock({ throwOnGetUser: true }),
  });
  assert.equal(netErr.status, "update_error");
  assert.equal(netErr.errorCode, "connection_error");

  console.log("  ✓ Profile update & security tests passed");
}

// 3. PROF-AUD-01 Modal lifecycle & user-switch isolation tests
{
  const React = await import("react");
  const ReactDOMServer = await import("react-dom/server");
  const { getDictionary } = await import("../src/lib/i18n/dictionaries.ts");
  const { ProfileEditModal } = await import(
    "../src/features/profile/profile-edit-modal.tsx"
  );

  const dict = getDictionary("pt-BR");
  const userA = {
    id: "user-a",
    username: "alice_sec",
    displayName: "Alice Security",
    email: "alice@vexor.test",
    preferredLanguage: "pt-BR",
    role: "member",
    isSuspended: false,
    createdAt: "2026-11-10T00:00:00Z",
    bio: "Alice bio",
    interests: ["AppSec"],
  };
  const userB = {
    id: "user-b",
    username: "bob_dfir",
    displayName: "Bob DFIR",
    email: "bob@vexor.test",
    preferredLanguage: "en",
    role: "member",
    isSuspended: false,
    createdAt: "2026-11-11T00:00:00Z",
    bio: "Bob bio",
    interests: ["DFIR"],
  };

  // Closed modal unmounts inner form
  const closedHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProfileEditModal, {
      profile: userA,
      locale: "pt-BR",
      dict,
      isOpen: false,
      onClose: () => {},
    })
  );
  assert.equal(closedHtml, "");

  // Open modal for User A
  const openAHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProfileEditModal, {
      profile: userA,
      locale: "pt-BR",
      dict,
      isOpen: true,
      onClose: () => {},
    })
  );
  assert.equal(openAHtml.includes("alice_sec"), true);
  assert.equal(openAHtml.includes("Alice Security"), true);
  assert.equal(openAHtml.includes("Alice bio"), true);

  // Switch to User B -> renders User B values cleanly
  const openBHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProfileEditModal, {
      profile: userB,
      locale: "pt-BR",
      dict,
      isOpen: true,
      onClose: () => {},
    })
  );
  assert.equal(openBHtml.includes("bob_dfir"), true);
  assert.equal(openBHtml.includes("Bob DFIR"), true);
  assert.equal(openBHtml.includes("alice_sec"), false);

  // Verify keying by profile.id & unmount-on-close in source
  const modalSrc = fs.readFileSync(
    path.join(srcRoot, "features/profile/profile-edit-modal.tsx"),
    "utf8"
  );
  assert.equal(modalSrc.includes("if (!props.isOpen)"), true);
  assert.equal(modalSrc.includes("key={props.profile.id}"), true);

  console.log("  ✓ PROF-AUD-01 modal lifecycle & user-switch tests passed");
}

// 4. PROF-AUD-02 Session sync & signOutError preservation tests
{
  const {
    applyAuthenticatedSessionToStorage,
    performConsistentSignOut,
    readSyncMeta,
    resetSyncCoordinatorForTests,
    syncClientSessionFromServer,
  } = await import("../src/features/auth/session-sync.ts");

  resetSyncCoordinatorForTests();
  const storeMap = new Map();
  const storage = {
    getItem: (k) => (storeMap.has(k) ? storeMap.get(k) : null),
    setItem: (k, v) => storeMap.set(k, v),
    removeItem: (k) => storeMap.delete(k),
  };

  const sampleProfile = {
    id: "user-1",
    username: "sec_analyst",
    displayName: "Sec Analyst",
    email: "analyst@vexor.test",
    preferredLanguage: "pt-BR",
    role: "member",
    isSuspended: false,
    createdAt: "2026-11-10T00:00:00Z",
  };

  // 4a. Failed logout sets signOutError: true
  const failedSignOut = await performConsistentSignOut({
    storage,
    serverLogout: async () => ({ ok: false }),
    clientSignOut: async () => {},
  });
  assert.equal(failedSignOut.ok, false);
  assert.equal(readSyncMeta(storage).signOutError, true);

  // 4b. Profile update sync via applyAuthenticatedSessionToStorage MUST preserve signOutError: true
  const afterProfileSync = applyAuthenticatedSessionToStorage(
    storage,
    sampleProfile
  );
  assert.equal(afterProfileSync.authMode, "supabase");
  assert.equal(afterProfileSync.signOutError, true);
  assert.equal(readSyncMeta(storage).signOutError, true);

  // 4c. Subsequent server session sync MUST also preserve signOutError: true
  await syncClientSessionFromServer({
    storage,
    fetchSession: async () => ({
      ok: true,
      status: 200,
      data: {
        authenticated: true,
        status: "authenticated",
        user: { id: "user-1", email: "analyst@vexor.test" },
        profile: {
          id: "user-1",
          username: "sec_analyst",
          display_name: "Sec Analyst",
          avatar_url: null,
          bio: null,
          interests: [],
          github_url: null,
          linkedin_url: null,
          preferred_locale: "pt-BR",
          role: "member",
          is_suspended: false,
          created_at: "2026-11-10T00:00:00Z",
        },
      },
    }),
  });
  assert.equal(readSyncMeta(storage).signOutError, true);

  // 4d. Successful logout clears signOutError and resets isSigningOut
  const okSignOut = await performConsistentSignOut({
    storage,
    serverLogout: async () => ({ ok: true }),
    clientSignOut: async () => {},
  });
  assert.equal(okSignOut.ok, true);
  assert.equal(readSyncMeta(storage).signOutError, false);
  assert.equal(readSyncMeta(storage).isSigningOut, false);

  // 4e. Single-flight deduplication check
  let fetchCalls = 0;
  const p1 = syncClientSessionFromServer({
    storage,
    fetchSession: async () => {
      fetchCalls += 1;
      await new Promise((r) => setTimeout(r, 15));
      return {
        ok: true,
        status: 200,
        data: { authenticated: false, status: "unauthenticated", user: null, profile: null },
      };
    },
  });
  const p2 = syncClientSessionFromServer({
    storage,
    fetchSession: async () => {
      fetchCalls += 1;
      return {
        ok: true,
        status: 200,
        data: { authenticated: false, status: "unauthenticated", user: null, profile: null },
      };
    },
  });
  await Promise.all([p1, p2]);
  assert.equal(fetchCalls, 1);

  console.log("  ✓ PROF-AUD-02 signOutError preservation & single-flight tests passed");
}

console.log("=== ALL ETAPA 9.1.17 PROFILE TESTS PASSED ===");
