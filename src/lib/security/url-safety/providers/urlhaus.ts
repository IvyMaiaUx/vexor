import type { UrlCheckProviderResult } from "../types";

const URLHAUS_ENDPOINT = "https://urlhaus-api.abuse.ch/v1/url/";

/**
 * Layer 1: URLhaus (abuse.ch).
 * Requires a free Auth-Key generated at https://auth.abuse.ch/
 * Read strictly from server-side `process.env.URLHAUS_AUTH_KEY`.
 * If the key is missing, skips the check gracefully.
 */
export async function checkUrlWithUrlhaus(
  url: string,
  options?: {
    authKey?: string;
    fetchImpl?: typeof fetch;
    signal?: AbortSignal;
  }
): Promise<UrlCheckProviderResult> {
  const authKey = (options?.authKey ?? process.env.URLHAUS_AUTH_KEY ?? "").trim();

  if (!authKey) {
    return {
      source: "urlhaus",
      status: "skipped",
      verdict: "unknown",
      attribution: null,
      skipReason: "missing_auth_key",
    };
  }

  const fetchFn = options?.fetchImpl ?? fetch;

  try {
    const body = new URLSearchParams({ url });
    const response = await fetchFn(URLHAUS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Auth-Key": authKey,
      },
      body: body.toString(),
      signal: options?.signal ?? AbortSignal.timeout(5000),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        source: "urlhaus",
        status: "error",
        verdict: "unknown",
        attribution: null,
        errorMessage: `URLhaus HTTP ${response.status}`,
      };
    }

    const data = (await response.json()) as {
      query_status?: string;
      url_status?: string;
    };

    if (data.query_status === "ok") {
      return {
        source: "urlhaus",
        status: "checked",
        verdict: "suspicious",
        attribution: null,
      };
    }

    // "no_results" means URL is not listed in URLhaus -> continue to next layer
    return {
      source: "urlhaus",
      status: "checked",
      verdict: "unknown",
      attribution: null,
    };
  } catch (err) {
    return {
      source: "urlhaus",
      status: "error",
      verdict: "unknown",
      attribution: null,
      errorMessage: err instanceof Error ? err.message : "URLhaus request failed",
    };
  }
}
