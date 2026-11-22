import { NextResponse } from "next/server";
import type { SupportedLocale } from "@/config/site";
import {
  buildUrlSafetyWarning,
  checkUrlSafety,
  normalizeSafeCheckUrl,
} from "@/lib/security/url-safety";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      url?: unknown;
      locale?: unknown;
    } | null;

    const rawUrl = typeof body?.url === "string" ? body.url : "";
    const normalized = normalizeSafeCheckUrl(rawUrl);
    if (!normalized) {
      return NextResponse.json(
        { error: "Invalid URL. Only http(s) URLs up to 2048 characters are allowed." },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const locale: SupportedLocale = body?.locale === "en" ? "en" : "pt-BR";
    const result = await checkUrlSafety(normalized);
    const warning = buildUrlSafetyWarning(result, locale);

    return NextResponse.json(
      {
        verdict: result.verdict,
        source: result.source,
        attribution: result.attribution,
        warningText: warning.warningText,
        googleAttributionText: warning.googleAttributionText,
        cached: result.cached,
        checkedAt: result.checkedAt,
      },
      { status: 200, headers: NO_STORE_HEADERS }
    );
  } catch {
    return NextResponse.json(
      { error: "Could not complete URL safety check." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
