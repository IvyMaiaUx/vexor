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
  path.join(rootDir, "__vexor_mock__/auth-store-avatar92.mjs")
).href;
const MOCK_NEXT_IMAGE_URL = pathToFileURL(
  path.join(rootDir, "__vexor_mock__/next-image-avatar92.mjs")
).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/features/auth/use-auth-store") {
      return { url: MOCK_AUTH_STORE_URL, shortCircuit: true };
    }
    if (specifier === "next/image") {
      return { url: MOCK_NEXT_IMAGE_URL, shortCircuit: true };
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
        source: `export function useAuthStore() { return { authMode: "supabase", updateProfile: () => {}, setAuthenticatedSession: () => {}, refreshSession: async () => {} }; }`,
      };
    }
    if (url === MOCK_NEXT_IMAGE_URL) {
      return {
        format: "module",
        shortCircuit: true,
        source: `import React from "react"; export default function Image({ src, alt, width, height, className }) { return React.createElement("img", { src, alt, width, height, className }); }`,
      };
    }

    if (url.endsWith(".ts") || url.endsWith(".tsx")) {
      const source = fs.readFileSync(fileURLToPath(url), "utf8");
      const transpiled = ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
        },
        fileName: fileURLToPath(url),
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

const avatarService = await import(
  pathToFileURL(path.join(srcRoot, "features/profile/avatar-service.ts")).href
);
const { ProfileHeader } = await import(
  pathToFileURL(path.join(srcRoot, "features/profile/profile-header.tsx")).href
);
const { ProfileEditModal } = await import(
  pathToFileURL(path.join(srcRoot, "features/profile/profile-edit-modal.tsx")).href
);
const { getDictionary } = await import(
  pathToFileURL(path.join(srcRoot, "lib/i18n/dictionaries.ts")).href
);
const React = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");

const USER_A_ID = "11111111-1111-4111-8111-111111111111";
const USER_B_ID = "22222222-2222-4222-8222-222222222222";

function makeFakeFile({ name, type, bytes, size }) {
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return {
    name,
    type,
    size: typeof size === "number" ? size : buf.byteLength,
    slice(start = 0, end = buf.byteLength) {
      const sliced = buf.slice(start, end);
      return {
        async arrayBuffer() {
          return sliced.buffer.slice(
            sliced.byteOffset,
            sliced.byteOffset + sliced.byteLength
          );
        },
      };
    },
    async arrayBuffer() {
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    },
  };
}

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const WEBP_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
  0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
]);
const SVG_BYTES = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

function makeProfileInput() {
  return {
    username: "sec_member",
    displayName: "Sec Member",
    bio: "Blue team",
    interests: ["DFIR"],
    githubUrl: "https://github.com/secmember",
    linkedinUrl: "",
    preferredLanguage: "pt-BR",
  };
}

function createMockSupabase({
  user = { id: USER_A_ID, email: "member@vexor.sec" },
  uploadError = null,
  profileUpdateError = null,
  publicUrlBase = "https://zcjudcbckcxwnfnrjfte.supabase.co",
} = {}) {
  const calls = {
    uploads: [],
    removes: [],
    profileUpdates: [],
  };

  return {
    calls,
    auth: {
      async getUser() {
        return { data: { user }, error: null };
      },
    },
    storage: {
      from(bucket) {
        assert.equal(bucket, "avatars");
        return {
          async upload(objectPath, _body, options) {
            calls.uploads.push({ objectPath, options });
            if (uploadError) {
              return { data: null, error: uploadError };
            }
            return { data: { path: objectPath }, error: null };
          },
          getPublicUrl(objectPath) {
            return {
              data: {
                publicUrl: `${publicUrlBase}/storage/v1/object/public/avatars/${objectPath}`,
              },
            };
          },
          async remove(paths) {
            calls.removes.push(paths);
            return { data: [], error: null };
          },
        };
      },
    },
    from(table) {
      assert.equal(table, "profiles");
      return {
        update(values) {
          calls.profileUpdates.push(values);
          return {
            eq() {
              return {
                select() {
                  return {
                    async maybeSingle() {
                      if (profileUpdateError) {
                        return { data: null, error: profileUpdateError };
                      }
                      return {
                        data: {
                          id: user.id,
                          username: values.username ?? "sec_member",
                          display_name: values.display_name,
                          avatar_url: values.avatar_url,
                          bio: values.bio,
                          interests: values.interests ?? [],
                          github_url: values.github_url,
                          linkedin_url: values.linkedin_url,
                          preferred_locale: values.preferred_locale ?? "pt-BR",
                          role: "member",
                          is_suspended: false,
                          created_at: "2026-11-10T00:00:00Z",
                        },
                        error: null,
                      };
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

console.log("=== ETAPA 9.2 — AVATAR UPLOAD & SUPABASE STORAGE TESTS ===");

// 1. Valid PNG upload + replacement of previous owned avatar
{
  const oldOwnedUrl = `https://zcjudcbckcxwnfnrjfte.supabase.co/storage/v1/object/public/avatars/${USER_A_ID}/old-avatar.png`;
  const client = createMockSupabase();
  const res = await avatarService.uploadAndPersistAvatar({
    file: makeFakeFile({ name: "avatar.png", type: "image/png", bytes: PNG_BYTES }),
    profileInput: makeProfileInput(),
    previousAvatarUrl: oldOwnedUrl,
    expectedUserId: USER_A_ID,
    locale: "pt-BR",
    client,
  });

  assert.equal(res.status, "upload_success");
  assert.ok(res.objectPath.startsWith(`${USER_A_ID}/`));
  assert.ok(res.objectPath.endsWith(".png"));
  assert.equal(res.profile.avatarUrl, res.publicUrl);
  assert.equal(res.previousRemoved, true);
  assert.deepEqual(client.calls.removes, [[`${USER_A_ID}/old-avatar.png`]]);
  console.log("  ✓ 1. Upload de PNG válido e substituição do avatar anterior");
}

// 2. Valid JPEG upload
{
  const client = createMockSupabase();
  const res = await avatarService.uploadAndPersistAvatar({
    file: makeFakeFile({ name: "photo.jpeg", type: "image/jpeg", bytes: JPEG_BYTES }),
    profileInput: makeProfileInput(),
    expectedUserId: USER_A_ID,
    locale: "en",
    client,
  });
  assert.equal(res.status, "upload_success");
  assert.ok(res.objectPath.endsWith(".jpg"));
  console.log("  ✓ 2. Upload de JPEG válido");
}

// 3. Valid WEBP upload
{
  const client = createMockSupabase();
  const res = await avatarService.uploadAndPersistAvatar({
    file: makeFakeFile({ name: "pic.webp", type: "image/webp", bytes: WEBP_BYTES }),
    profileInput: makeProfileInput(),
    expectedUserId: USER_A_ID,
    locale: "en",
    client,
  });
  assert.equal(res.status, "upload_success");
  assert.ok(res.objectPath.endsWith(".webp"));
  console.log("  ✓ 3. Upload de WEBP válido");
}

// 4. File > 2 MB rejected
{
  const client = createMockSupabase();
  const res = await avatarService.uploadAndPersistAvatar({
    file: makeFakeFile({
      name: "huge.png",
      type: "image/png",
      bytes: PNG_BYTES,
      size: avatarService.AVATAR_MAX_BYTES + 1,
    }),
    profileInput: makeProfileInput(),
    locale: "pt-BR",
    client,
  });
  assert.equal(res.status, "upload_error");
  assert.equal(res.errorCode, "file_too_large");
  assert.equal(client.calls.uploads.length, 0);
  console.log("  ✓ 4. Arquivo acima de 2 MB bloqueado");
}

// 5. SVG blocked (MIME, extension, and spoofed magic bytes)
{
  const v1 = await avatarService.validateAvatarFile(
    makeFakeFile({ name: "evil.svg", type: "image/svg+xml", bytes: SVG_BYTES }),
    "pt-BR"
  );
  assert.equal(v1.valid, false);
  assert.equal(v1.errorCode, "svg_blocked");

  const v2 = await avatarService.validateAvatarFile(
    makeFakeFile({ name: "spoofed.png", type: "image/png", bytes: SVG_BYTES }),
    "pt-BR"
  );
  assert.equal(v2.valid, false);
  assert.equal(v2.errorCode, "svg_blocked");
  console.log("  ✓ 5. SVG bloqueado (MIME, extensão e magic bytes falsificados)");
}

// 6. Incompatible MIME / extension / magic-byte mismatch
{
  const vGif = await avatarService.validateAvatarFile(
    makeFakeFile({ name: "anim.gif", type: "image/gif", bytes: PNG_BYTES }),
    "en"
  );
  assert.equal(vGif.valid, false);
  assert.equal(vGif.errorCode, "invalid_mime_type");

  const vExtMismatch = await avatarService.validateAvatarFile(
    makeFakeFile({ name: "fake.jpg", type: "image/png", bytes: PNG_BYTES }),
    "en"
  );
  assert.equal(vExtMismatch.valid, false);
  assert.equal(vExtMismatch.errorCode, "mime_extension_mismatch");

  const vMagicMismatch = await avatarService.validateAvatarFile(
    makeFakeFile({ name: "fake.jpg", type: "image/jpeg", bytes: PNG_BYTES }),
    "en"
  );
  assert.equal(vMagicMismatch.valid, false);
  assert.equal(vMagicMismatch.errorCode, "invalid_magic_bytes");
  console.log("  ✓ 6. MIME type, extensão e magic bytes incompatíveis rejeitados");
}

// 7 & 10. Upload failure preserves previous avatar & never updates profile
{
  const oldUrl = `https://zcjudcbckcxwnfnrjfte.supabase.co/storage/v1/object/public/avatars/${USER_A_ID}/keep-me.png`;
  const client = createMockSupabase({
    uploadError: { message: "new row violates row-level security policy", statusCode: 403 },
  });
  const res = await avatarService.uploadAndPersistAvatar({
    file: makeFakeFile({ name: "avatar.png", type: "image/png", bytes: PNG_BYTES }),
    profileInput: makeProfileInput(),
    previousAvatarUrl: oldUrl,
    expectedUserId: USER_A_ID,
    locale: "pt-BR",
    client,
  });
  assert.equal(res.status, "upload_error");
  assert.equal(res.errorCode, "upload_rls_denied");
  assert.equal(client.calls.profileUpdates.length, 0);
  assert.equal(client.calls.removes.length, 0);
  console.log("  ✓ 7 & 10. Falha no upload preserva avatar anterior e não altera perfil");
}

// 8 & 10. Profile update failure rolls back uploaded orphan and preserves previous avatar
{
  const oldUrl = `https://zcjudcbckcxwnfnrjfte.supabase.co/storage/v1/object/public/avatars/${USER_A_ID}/keep-me.png`;
  const client = createMockSupabase({
    profileUpdateError: { code: "42501", message: "permission denied", status: 403 },
  });
  const res = await avatarService.uploadAndPersistAvatar({
    file: makeFakeFile({ name: "avatar.png", type: "image/png", bytes: PNG_BYTES }),
    profileInput: makeProfileInput(),
    previousAvatarUrl: oldUrl,
    expectedUserId: USER_A_ID,
    locale: "pt-BR",
    client,
  });
  assert.equal(res.status, "upload_error");
  assert.equal(res.errorCode, "rls_denied");
  assert.equal(res.orphanCleanedUp, true);
  assert.equal(client.calls.uploads.length, 1);
  assert.equal(client.calls.removes.length, 1);
  assert.deepEqual(client.calls.removes[0], [client.calls.uploads[0].objectPath]);
  console.log("  ✓ 8 & 10. Falha no perfil limpa órfão no Storage e preserva avatar anterior");
}

// 9. Duplicate submit guard verified in ProfileEditModal source
{
  const modalSource = fs.readFileSync(
    path.join(srcRoot, "features/profile/profile-edit-modal.tsx"),
    "utf8"
  );
  assert.ok(modalSource.includes("inFlightRef"));
  assert.ok(modalSource.includes("if (inFlightRef.current || isSubmitting)"));
  assert.ok(!modalSource.includes('type="url"\n              value={avatarUrl}'));
  console.log("  ✓ 9. Prevenção de envio duplicado (single-flight guard) e remoção do campo manual");
}

// 11. Unauthenticated upload attempt rejected before touching Storage
{
  const client = createMockSupabase({ user: null });
  const res = await avatarService.uploadAndPersistAvatar({
    file: makeFakeFile({ name: "avatar.png", type: "image/png", bytes: PNG_BYTES }),
    profileInput: makeProfileInput(),
    locale: "pt-BR",
    client,
  });
  assert.equal(res.status, "upload_error");
  assert.equal(res.errorCode, "unauthenticated");
  assert.equal(client.calls.uploads.length, 0);
  console.log("  ✓ 11. Tentativa sem usuário autenticado bloqueada");
}

// 12. Cross-user path isolation
{
  const foreignUrl = `https://zcjudcbckcxwnfnrjfte.supabase.co/storage/v1/object/public/avatars/${USER_B_ID}/other-user.png`;
  assert.equal(
    avatarService.extractOwnedAvatarStoragePath(foreignUrl, USER_A_ID),
    null
  );
  const traversalUrl = `https://zcjudcbckcxwnfnrjfte.supabase.co/storage/v1/object/public/avatars/${USER_A_ID}/../${USER_B_ID}/other.png`;
  assert.equal(
    avatarService.extractOwnedAvatarStoragePath(traversalUrl, USER_A_ID),
    null
  );
  const client = createMockSupabase();
  const res = await avatarService.uploadAndPersistAvatar({
    file: makeFakeFile({ name: "avatar.png", type: "image/png", bytes: PNG_BYTES }),
    profileInput: makeProfileInput(),
    previousAvatarUrl: foreignUrl,
    expectedUserId: USER_A_ID,
    locale: "en",
    client,
  });
  assert.equal(res.status, "upload_success");
  assert.equal(res.previousRemoved, false);
  assert.equal(client.calls.removes.length, 0);
  assert.throws(() => avatarService.buildAvatarObjectPath("../evil", "image/png"));
  console.log("  ✓ 12. Isolamento estrito de pasta por usuário autenticado");
}

// 13. Visual update rendering (SSR ProfileHeader & ProfileEditModal)
{
  const dictPt = getDictionary("pt-BR");
  const updatedUrl = `https://zcjudcbckcxwnfnrjfte.supabase.co/storage/v1/object/public/avatars/${USER_A_ID}/new-pic.png`;
  const profile = {
    id: USER_A_ID,
    username: "sec_member",
    displayName: "Sec Member",
    email: "member@vexor.sec",
    preferredLanguage: "pt-BR",
    role: "member",
    isSuspended: false,
    createdAt: "2026-11-10T00:00:00Z",
    avatarUrl: updatedUrl,
    interests: ["DFIR"],
  };

  const headerHtml = renderToStaticMarkup(
    React.createElement(ProfileHeader, {
      profile,
      stats: { resourcesSubmitted: 1, topicsCreated: 2, postsCreated: 3, acceptedSolutions: 1, reputationPoints: 50 },
      isCurrentUser: true,
      locale: "pt-BR",
      dict: dictPt,
      onOpenEdit: () => {},
    })
  );
  assert.ok(headerHtml.includes(updatedUrl));

  const modalHtml = renderToStaticMarkup(
    React.createElement(ProfileEditModal, {
      profile,
      locale: "pt-BR",
      dict: dictPt,
      isOpen: true,
      onClose: () => {},
    })
  );
  assert.ok(modalHtml.includes('type="file"'));
  assert.ok(modalHtml.includes('accept="image/png,image/jpeg,image/webp"'));
  assert.ok(modalHtml.includes(updatedUrl));
  console.log("  ✓ 13. Renderização visual atualizada (ProfileHeader & ProfileEditModal)");
}

console.log("=== ALL ETAPA 9.2 AVATAR UPLOAD TESTS PASSED ===");
