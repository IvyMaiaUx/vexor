/**
 * Validates that an external URL uses an explicit http:// or https:// scheme
 * and contains no whitespace or control characters (prevents javascript:/data: XSS).
 * Mirrors `resources_url_scheme` in `20261110000001_schema.sql`.
 */
export function isSafeExternalUrl(rawUrl: string): boolean {
  try {
    const trimmed = rawUrl.trim();
    if (!trimmed || trimmed.length > 2048 || /\s/.test(trimmed)) {
      return false;
    }
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function getSafeExternalHref(rawUrl: string): string {
  return isSafeExternalUrl(rawUrl) ? rawUrl.trim() : "#";
}

/**
 * Mirrors PostgreSQL `public.normalize_resource_url(text)` (RFC 3986 safe):
 * - Lowercases only scheme and host
 * - Strips default ports (:80 on http, :443 on https)
 * - Strips trailing slash only when the path is empty root ("/")
 * - Preserves case and trailing slashes on non-root paths, query strings, and fragments
 */
export function normalizeResourceUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  const match = trimmed.match(
    /^([A-Za-z][A-Za-z0-9+.-]*):\/\/([^/:?#]+)(:[0-9]+)?(.*)$/
  );
  if (!match) {
    return trimmed;
  }
  const scheme = match[1].toLowerCase();
  const host = match[2].toLowerCase();
  const port = match[3] ?? "";
  const rest = match[4] ?? "";

  const normalizedPort =
    (scheme === "http" && port === ":80") ||
    (scheme === "https" && port === ":443")
      ? ""
      : port;

  const normalizedRest = rest === "" || rest === "/" ? "" : rest;
  return `${scheme}://${host}${normalizedPort}${normalizedRest}`;
}

/**
 * Mirrors PostgreSQL `public.resources_set_slug()` trigger logic.
 */
export function generateResourceSlug(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  const suffix = Math.random().toString(36).substring(2, 8);
  return `${base || "resource"}-${suffix}`;
}
