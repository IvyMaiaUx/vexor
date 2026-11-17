import type { SupportedLocale } from "@/config/site";
import type { AuthUserProfile, ProfileUpdateInput } from "@/features/auth/validation";
import { createClient } from "@/lib/supabase/client";
import {
  type ProfileSupabaseClientLike,
  type ProfileUpdateErrorCode,
  updateOwnProfile,
} from "./profile-service";

export const AVATAR_BUCKET = "avatars" as const;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 MB (matches storage.buckets.file_size_limit)
export const AVATAR_ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type AvatarAllowedMimeType = (typeof AVATAR_ALLOWED_MIME_TYPES)[number];

const MIME_TO_EXTENSIONS: Record<AvatarAllowedMimeType, readonly string[]> = {
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
};

const MIME_TO_CANONICAL_EXT: Record<AvatarAllowedMimeType, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export interface AvatarStorageError {
  message?: string;
  statusCode?: string | number;
  status?: number;
}

export interface AvatarStorageBucketClient {
  upload: (
    path: string,
    fileBody: Blob | File | ArrayBuffer | Uint8Array,
    options?: {
      cacheControl?: string;
      contentType?: string;
      upsert?: boolean;
    }
  ) => Promise<{
    data: { path: string } | null;
    error: AvatarStorageError | null;
  }>;
  getPublicUrl: (path: string) => {
    data: { publicUrl: string };
  };
  remove: (paths: string[]) => Promise<{
    data: unknown;
    error: AvatarStorageError | null;
  }>;
}

export interface AvatarSupabaseClientLike extends ProfileSupabaseClientLike {
  storage: {
    from: (bucket: string) => AvatarStorageBucketClient;
  };
}

export interface AvatarFileLike {
  name: string;
  size: number;
  type: string;
  slice?: (start?: number, end?: number) => Blob;
  arrayBuffer?: () => Promise<ArrayBuffer>;
}

export type AvatarValidationErrorCode =
  | "missing_file"
  | "empty_file"
  | "file_too_large"
  | "svg_blocked"
  | "invalid_mime_type"
  | "invalid_extension"
  | "mime_extension_mismatch"
  | "invalid_magic_bytes";

export type AvatarValidationResult =
  | {
      valid: true;
      mimeType: AvatarAllowedMimeType;
      extension: string;
    }
  | {
      valid: false;
      errorCode: AvatarValidationErrorCode;
      message: string;
    };

export type AvatarUploadErrorCode =
  | AvatarValidationErrorCode
  | ProfileUpdateErrorCode
  | "upload_rls_denied"
  | "upload_failed"
  | "invalid_public_url";

export type AvatarUploadResult =
  | {
      status: "upload_success";
      profile: AuthUserProfile;
      objectPath: string;
      publicUrl: string;
      previousRemoved: boolean;
    }
  | {
      status: "upload_error";
      errorCode: AvatarUploadErrorCode;
      message: string;
      orphanCleanedUp?: boolean;
      fieldErrors?: Partial<Record<keyof ProfileUpdateInput, string>>;
    };

function extractFileExtension(fileName: string): string {
  const cleanName = fileName.trim().split("?")[0].split("#")[0];
  const lastDot = cleanName.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === cleanName.length - 1) {
    return "";
  }
  return cleanName.slice(lastDot + 1).toLowerCase();
}

function getValidationErrorMessage(
  code: AvatarValidationErrorCode,
  locale: SupportedLocale
): string {
  const isPt = locale === "pt-BR";
  switch (code) {
    case "missing_file":
      return isPt
        ? "Selecione uma imagem para enviar."
        : "Select an image to upload.";
    case "empty_file":
      return isPt
        ? "O arquivo selecionado está vazio."
        : "The selected file is empty.";
    case "file_too_large":
      return isPt
        ? "A imagem excede o limite máximo de 2 MB."
        : "The image exceeds the maximum size of 2 MB.";
    case "svg_blocked":
      return isPt
        ? "Arquivos SVG não são permitidos por motivos de segurança. Use PNG, JPEG ou WEBP."
        : "SVG files are not allowed for security reasons. Use PNG, JPEG, or WEBP.";
    case "invalid_mime_type":
    case "invalid_extension":
      return isPt
        ? "Formato inválido. Envie uma imagem PNG, JPEG ou WEBP."
        : "Invalid format. Upload a PNG, JPEG, or WEBP image.";
    case "mime_extension_mismatch":
      return isPt
        ? "A extensão do arquivo não corresponde ao tipo real da imagem."
        : "The file extension does not match the image MIME type.";
    case "invalid_magic_bytes":
      return isPt
        ? "O conteúdo do arquivo não corresponde a uma imagem PNG, JPEG ou WEBP válida."
        : "The file contents do not match a valid PNG, JPEG, or WEBP image.";
  }
}

/**
 * Inspects the first bytes of a file to verify its binary signature matches
 * PNG, JPEG, or WEBP and is not an XML/SVG payload disguised with an image extension.
 */
export function inspectAvatarMagicBytes(
  bytes: Uint8Array
): AvatarAllowedMimeType | "svg_signature" | "unknown" {
  if (bytes.length < 4) {
    return "unknown";
  }

  // Check for XML/SVG text signature (leading whitespace + '<svg' or '<?xml')
  const headText = new TextDecoder("utf-8", { fatal: false })
    .decode(bytes.slice(0, Math.min(bytes.length, 64)))
    .trimStart()
    .toLowerCase();
  if (headText.startsWith("<svg") || headText.startsWith("<?xml")) {
    return "svg_signature";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  // WEBP: "RIFF" at 0..3 and "WEBP" at 8..11
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return "unknown";
}

/**
 * Synchronous metadata validation for avatar files (size, MIME, extension, SVG block).
 */
export function validateAvatarFileMetadata(
  file: AvatarFileLike | null | undefined,
  locale: SupportedLocale
): AvatarValidationResult {
  if (!file) {
    return {
      valid: false,
      errorCode: "missing_file",
      message: getValidationErrorMessage("missing_file", locale),
    };
  }

  if (typeof file.size !== "number" || file.size <= 0) {
    return {
      valid: false,
      errorCode: "empty_file",
      message: getValidationErrorMessage("empty_file", locale),
    };
  }

  if (file.size > AVATAR_MAX_BYTES) {
    return {
      valid: false,
      errorCode: "file_too_large",
      message: getValidationErrorMessage("file_too_large", locale),
    };
  }

  const normalizedMime = (file.type || "").trim().toLowerCase();
  const ext = extractFileExtension(file.name || "");

  if (
    normalizedMime === "image/svg+xml" ||
    normalizedMime.includes("svg") ||
    ext === "svg" ||
    ext === "svgz"
  ) {
    return {
      valid: false,
      errorCode: "svg_blocked",
      message: getValidationErrorMessage("svg_blocked", locale),
    };
  }

  if (
    !AVATAR_ALLOWED_MIME_TYPES.includes(
      normalizedMime as AvatarAllowedMimeType
    )
  ) {
    return {
      valid: false,
      errorCode: "invalid_mime_type",
      message: getValidationErrorMessage("invalid_mime_type", locale),
    };
  }

  const mimeType = normalizedMime as AvatarAllowedMimeType;
  const allowedExtsForMime = MIME_TO_EXTENSIONS[mimeType];
  const allAllowedExts = Object.values(MIME_TO_EXTENSIONS).flat();

  if (!ext || !allAllowedExts.includes(ext)) {
    return {
      valid: false,
      errorCode: "invalid_extension",
      message: getValidationErrorMessage("invalid_extension", locale),
    };
  }

  if (!allowedExtsForMime.includes(ext)) {
    return {
      valid: false,
      errorCode: "mime_extension_mismatch",
      message: getValidationErrorMessage("mime_extension_mismatch", locale),
    };
  }

  return {
    valid: true,
    mimeType,
    extension: MIME_TO_CANONICAL_EXT[mimeType],
  };
}

/**
 * Full avatar validation combining metadata checks and binary magic-byte inspection.
 */
export async function validateAvatarFile(
  file: AvatarFileLike | null | undefined,
  locale: SupportedLocale
): Promise<AvatarValidationResult> {
  const metaResult = validateAvatarFileMetadata(file, locale);
  if (!metaResult.valid || !file) {
    return metaResult;
  }

  let headerBytes: Uint8Array | null = null;
  try {
    if (typeof file.slice === "function") {
      const slice = file.slice(0, 64);
      if (typeof slice.arrayBuffer === "function") {
        headerBytes = new Uint8Array(await slice.arrayBuffer());
      }
    } else if (typeof file.arrayBuffer === "function") {
      const buf = await file.arrayBuffer();
      headerBytes = new Uint8Array(buf.slice(0, 64));
    }
  } catch {
    headerBytes = null;
  }

  if (headerBytes) {
    const detected = inspectAvatarMagicBytes(headerBytes);
    if (detected === "svg_signature") {
      return {
        valid: false,
        errorCode: "svg_blocked",
        message: getValidationErrorMessage("svg_blocked", locale),
      };
    }
    if (detected !== metaResult.mimeType) {
      return {
        valid: false,
        errorCode: "invalid_magic_bytes",
        message: getValidationErrorMessage("invalid_magic_bytes", locale),
      };
    }
  }

  return metaResult;
}

function generateUnpredictableId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.getRandomValues === "function"
  ) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Builds an RLS-compliant object path inside the `avatars` bucket:
 * `<authenticated_user_id>/<unpredictable_uuid>.<ext>`
 *
 * Matches storage policy: `(storage.foldername(name))[1] = (select auth.uid())::text`
 */
export function buildAvatarObjectPath(
  authenticatedUserId: string,
  mimeType: AvatarAllowedMimeType
): string {
  const cleanUserId = authenticatedUserId.trim();
  if (
    !cleanUserId ||
    cleanUserId.includes("/") ||
    cleanUserId.includes("\\") ||
    cleanUserId.includes("..")
  ) {
    throw new Error("Invalid authenticated user id for avatar path.");
  }
  const ext = MIME_TO_CANONICAL_EXT[mimeType];
  return `${cleanUserId}/${generateUnpredictableId()}.${ext}`;
}

/**
 * Extracts the Storage object path ONLY if the URL points to the `avatars`
 * public bucket AND belongs to `authenticatedUserId`'s own folder.
 * Prevents indiscriminate or cross-user deletions.
 */
export function extractOwnedAvatarStoragePath(
  avatarUrl: string | null | undefined,
  authenticatedUserId: string
): string | null {
  if (!avatarUrl || !authenticatedUserId) {
    return null;
  }

  try {
    const parsed = new URL(avatarUrl.trim());
    const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
    const idx = parsed.pathname.indexOf(marker);
    if (idx === -1) {
      return null;
    }

    const objectPath = decodeURIComponent(
      parsed.pathname.slice(idx + marker.length)
    );
    if (
      !objectPath ||
      objectPath.includes("..") ||
      objectPath.includes("\\")
    ) {
      return null;
    }

    const expectedPrefix = `${authenticatedUserId}/`;
    if (!objectPath.startsWith(expectedPrefix)) {
      return null;
    }

    const remainder = objectPath.slice(expectedPrefix.length);
    if (!remainder || remainder.includes("/")) {
      return null;
    }

    return objectPath;
  } catch {
    return null;
  }
}

function isStorageRlsOrAuthError(error: AvatarStorageError): boolean {
  const status = Number(error.statusCode ?? error.status ?? 0);
  const msg = (error.message ?? "").toLowerCase();
  return (
    status === 401 ||
    status === 403 ||
    msg.includes("row-level security") ||
    msg.includes("permission denied") ||
    msg.includes("unauthorized") ||
    msg.includes("forbidden")
  );
}

function isStorageNetworkError(error: AvatarStorageError): boolean {
  const status = Number(error.statusCode ?? error.status ?? 0);
  const msg = (error.message ?? "").toLowerCase();
  return (
    status >= 500 ||
    msg.includes("fetch") ||
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("unavailable")
  );
}

function mapProfileErrorMessage(
  errorCode: ProfileUpdateErrorCode,
  locale: SupportedLocale
): string {
  const isPt = locale === "pt-BR";
  const messages: Record<ProfileUpdateErrorCode, string> = {
    username_taken: isPt
      ? "Este username já está em uso por outro membro."
      : "This username is already taken.",
    rls_denied: isPt
      ? "Permissão negada pela política de segurança (conta suspensa ou não autorizada)."
      : "Permission denied by security policy (suspended or unauthorized account).",
    connection_error: isPt
      ? "Não foi possível conectar ao servidor. Tente novamente."
      : "Could not reach the server. Please try again.",
    unauthenticated: isPt
      ? "Sua sessão expirou. Faça login novamente."
      : "Your session expired. Please sign in again.",
    validation_error: isPt
      ? "Verifique os campos destacados antes de salvar."
      : "Please review the highlighted fields before saving.",
    forbidden_field: isPt
      ? "Campos administrativos não podem ser alterados."
      : "Administrative fields cannot be modified.",
    identity_mismatch: isPt
      ? "Inconsistência de identidade detectada."
      : "Identity mismatch detected.",
    update_failed: isPt
      ? "Falha ao atualizar o perfil. Tente novamente."
      : "Failed to update profile. Please try again.",
  };
  return messages[errorCode] ?? messages.update_failed;
}

/**
 * Executes the full, safe avatar upload & profile persistence sequence:
 * 1. Validate file (size <= 2MB, PNG/JPEG/WEBP, SVG blocked, magic bytes).
 * 2. Resolve authenticated user strictly from `supabase.auth.getUser()`.
 * 3. Upload to `avatars/<auth.uid()>/<uuid>.<ext>` (never overwrites other users).
 * 4. Obtain public URL.
 * 5. Persist `avatar_url` (+ remaining profile fields) via `updateOwnProfile`.
 *    - If profile update fails, rolls back the newly uploaded file to prevent orphans
 *      and preserves the previous avatar.
 * 6. Only after profile update succeeds, removes the previous owned avatar file
 *    (if any and different from the new one).
 */
export async function uploadAndPersistAvatar(params: {
  file: AvatarFileLike;
  profileInput: Omit<ProfileUpdateInput, "avatarUrl">;
  previousAvatarUrl?: string | null;
  expectedUserId?: string;
  locale: SupportedLocale;
  client?: AvatarSupabaseClientLike;
}): Promise<AvatarUploadResult> {
  const isPt = params.locale === "pt-BR";

  // 1. Validate file
  const validation = await validateAvatarFile(params.file, params.locale);
  if (!validation.valid) {
    return {
      status: "upload_error",
      errorCode: validation.errorCode,
      message: validation.message,
    };
  }

  try {
    const supabase =
      params.client ??
      (createClient() as unknown as AvatarSupabaseClientLike);

    // 2. Verify authenticated user identity from session (never trust client userId)
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return {
        status: "upload_error",
        errorCode: "unauthenticated",
        message: mapProfileErrorMessage("unauthenticated", params.locale),
      };
    }

    const authenticatedUserId = userData.user.id;
    if (
      params.expectedUserId &&
      params.expectedUserId !== authenticatedUserId
    ) {
      return {
        status: "upload_error",
        errorCode: "identity_mismatch",
        message: mapProfileErrorMessage("identity_mismatch", params.locale),
      };
    }

    // 3. Build unpredictable RLS-compliant path
    const objectPath = buildAvatarObjectPath(
      authenticatedUserId,
      validation.mimeType
    );

    const bucket = supabase.storage.from(AVATAR_BUCKET);

    // 4. Upload image to Storage
    const { error: uploadError } = await bucket.upload(
      objectPath,
      params.file as unknown as File,
      {
        contentType: validation.mimeType,
        cacheControl: "3600",
        upsert: false,
      }
    );

    if (uploadError) {
      if (isStorageRlsOrAuthError(uploadError)) {
        return {
          status: "upload_error",
          errorCode: "upload_rls_denied",
          message: isPt
            ? "Upload bloqueado pela política de segurança do Storage (usuário suspenso ou sem permissão)."
            : "Upload blocked by Storage security policy (suspended or unauthorized user).",
        };
      }
      if (isStorageNetworkError(uploadError)) {
        return {
          status: "upload_error",
          errorCode: "connection_error",
          message: mapProfileErrorMessage("connection_error", params.locale),
        };
      }
      return {
        status: "upload_error",
        errorCode: "upload_failed",
        message: isPt
          ? "Não foi possível enviar a imagem para o servidor. Seu avatar anterior foi mantido."
          : "Could not upload the image to the server. Your previous avatar was preserved.",
      };
    }

    // 5. Obtain public URL
    const { data: publicUrlData } = bucket.getPublicUrl(objectPath);
    const publicUrl = publicUrlData?.publicUrl?.trim() ?? "";

    if (!publicUrl || !publicUrl.startsWith("https://")) {
      // Clean up orphan because URL is unusable
      let orphanCleanedUp = false;
      try {
        const { error: rollbackError } = await bucket.remove([objectPath]);
        orphanCleanedUp = !rollbackError;
      } catch {
        orphanCleanedUp = false;
      }

      return {
        status: "upload_error",
        errorCode: "invalid_public_url",
        message: isPt
          ? "URL pública inválida retornada pelo Storage. Seu avatar anterior foi mantido."
          : "Invalid public URL returned by Storage. Your previous avatar was preserved.",
        orphanCleanedUp,
      };
    }

    // 6. Persist profile update with new avatar_url
    const updateResult = await updateOwnProfile(
      {
        ...params.profileInput,
        avatarUrl: publicUrl,
      },
      {
        locale: params.locale,
        expectedUserId: authenticatedUserId,
        client: supabase,
      }
    );

    if (updateResult.status === "update_error") {
      // Roll back the uploaded file to prevent an orphan object in Storage
      let orphanCleanedUp = false;
      try {
        const { error: rollbackError } = await bucket.remove([objectPath]);
        orphanCleanedUp = !rollbackError;
      } catch {
        orphanCleanedUp = false;
      }

      return {
        status: "upload_error",
        errorCode: updateResult.errorCode,
        message: mapProfileErrorMessage(updateResult.errorCode, params.locale),
        orphanCleanedUp,
        fieldErrors: updateResult.fieldErrors,
      };
    }

    // 7. Only after profile update succeeded, safely remove the previous owned avatar
    let previousRemoved = false;
    const oldOwnedPath = extractOwnedAvatarStoragePath(
      params.previousAvatarUrl,
      authenticatedUserId
    );
    if (oldOwnedPath && oldOwnedPath !== objectPath) {
      try {
        const { error: removeOldError } = await bucket.remove([oldOwnedPath]);
        previousRemoved = !removeOldError;
      } catch {
        previousRemoved = false;
      }
    }

    return {
      status: "upload_success",
      profile: updateResult.profile,
      objectPath,
      publicUrl,
      previousRemoved,
    };
  } catch {
    return {
      status: "upload_error",
      errorCode: "connection_error",
      message: mapProfileErrorMessage("connection_error", params.locale),
    };
  }
}
