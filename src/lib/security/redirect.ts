/**
 * Validates an internal redirect target and prevents open-redirect attacks.
 * Only relative paths starting with a single `/` are accepted.
 */
export function getSafeRedirectPath(
  target: string | null | undefined,
  defaultPath = "/catalog"
): string {
  if (typeof target !== "string") {
    return defaultPath;
  }

  const trimmed = target.trim();
  if (!trimmed || !trimmed.startsWith("/")) {
    return defaultPath;
  }

  // Reject protocol-relative URLs, backslashes, and ASCII control characters.
  if (
    trimmed.startsWith("//") ||
    trimmed.includes("\\") ||
    /[\x00-\x1f\x7f]/.test(trimmed)
  ) {
    return defaultPath;
  }

  try {
    const parsed = new URL(trimmed, "http://localhost");
    if (parsed.origin !== "http://localhost" || !parsed.pathname.startsWith("/")) {
      return defaultPath;
    }

    // Decode pathname iteratively (bounded) to catch encoded backslashes,
    // double-slashes, control characters, and encoded callback loop attempts.
    let decodedPath = parsed.pathname;
    for (let i = 0; i < 3; i += 1) {
      if (
        decodedPath.startsWith("//") ||
        decodedPath.includes("\\") ||
        /[\x00-\x1f\x7f]/.test(decodedPath)
      ) {
        return defaultPath;
      }

      const lowerPath = decodedPath.toLowerCase();
      if (
        lowerPath === "/auth/callback" ||
        lowerPath.startsWith("/auth/callback/")
      ) {
        return defaultPath;
      }

      const nextDecoded = decodeURIComponent(decodedPath);
      if (nextDecoded === decodedPath) {
        break;
      }
      decodedPath = nextDecoded;
    }

    // Final check after decoding passes.
    const finalLowerPath = decodedPath.toLowerCase();
    if (
      decodedPath.startsWith("//") ||
      decodedPath.includes("\\") ||
      /[\x00-\x1f\x7f]/.test(decodedPath) ||
      finalLowerPath === "/auth/callback" ||
      finalLowerPath.startsWith("/auth/callback/")
    ) {
      return defaultPath;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return defaultPath;
  }
}
