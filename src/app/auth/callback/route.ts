import { type NextRequest, NextResponse } from "next/server";
import { getSafeRedirectPath } from "@/lib/security/redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles Supabase Auth PKCE / OAuth / email-link callbacks.
 * Exchanges the one-time `code` for a server-managed session cookie and
 * redirects only to validated internal paths.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const authError = searchParams.get("error");
  const flowType = searchParams.get("type");
  const isRecoveryFlow = flowType === "recovery";

  const requestedNext = getSafeRedirectPath(
    searchParams.get("next"),
    isRecoveryFlow ? "/auth/reset-password" : "/catalog"
  );
  const safeNext = isRecoveryFlow
    ? requestedNext.startsWith("/auth/reset-password")
      ? requestedNext
      : "/auth/reset-password"
    : requestedNext;
  const failureRedirect = isRecoveryFlow
    ? "/auth/reset-password?error=recovery_link_invalid"
    : "/login?error=auth_callback_failed";

  if (authError || !code || !code.trim()) {
    return NextResponse.redirect(new URL(failureRedirect, request.url));
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(new URL(failureRedirect, request.url));
    }

    return NextResponse.redirect(new URL(safeNext, request.url));
  } catch {
    return NextResponse.redirect(new URL(failureRedirect, request.url));
  }
}
