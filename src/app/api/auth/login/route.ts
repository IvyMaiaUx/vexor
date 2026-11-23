import { NextResponse } from "next/server";
import { EMAIL_REGEX, USERNAME_REGEX } from "@/features/auth/validation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 15;
const attemptMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = attemptMap.get(key);
  if (!entry || now > entry.resetAt) {
    attemptMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return false;
  }
  entry.count += 1;
  return true;
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("cf-connecting-ip")?.trim() || "unknown";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      identifier?: unknown;
      email?: unknown;
      password?: unknown;
    } | null;

    const rawIdentifier =
      typeof body?.identifier === "string"
        ? body.identifier
        : typeof body?.email === "string"
          ? body.email
          : "";
    const password = typeof body?.password === "string" ? body.password : "";

    const trimmed = rawIdentifier.trim().toLowerCase();
    const isEmail = EMAIL_REGEX.test(trimmed);
    const cleanedUsername = trimmed.replace(/^@+/, "");
    const isUsername = !isEmail && USERNAME_REGEX.test(cleanedUsername);

    if (!trimmed || (!isEmail && !isUsername)) {
      return NextResponse.json(
        { status: "error", errorCode: "invalid_email" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { status: "error", errorCode: "password_too_short" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const rateKey = `${getClientIp(request)}:${isEmail ? trimmed : cleanedUsername}`;
    if (!checkRateLimit(rateKey)) {
      return NextResponse.json(
        { status: "error", errorCode: "rate_limited" },
        { status: 429, headers: NO_STORE_HEADERS }
      );
    }

    const supabase = await createClient();
    let loginEmail = trimmed;

    if (isUsername) {
      const { data: resolvedEmail, error: rpcError } = await (
        supabase as unknown as {
          rpc: (
            fn: string,
            args: Record<string, unknown>
          ) => Promise<{ data: string | null; error: unknown }>;
        }
      ).rpc("resolve_login_email_by_username", {
        p_username: cleanedUsername,
        p_password: password,
      });

      if (rpcError || !resolvedEmail || typeof resolvedEmail !== "string") {
        return NextResponse.json(
          { status: "error", errorCode: "invalid_credentials" },
          { status: 401, headers: NO_STORE_HEADERS }
        );
      }
      loginEmail = resolvedEmail.trim().toLowerCase();
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error) {
      const code = (error.code ?? "").toLowerCase();
      if (error.status === 429 || code.includes("rate_limit")) {
        return NextResponse.json(
          { status: "error", errorCode: "rate_limited" },
          { status: 429, headers: NO_STORE_HEADERS }
        );
      }
      return NextResponse.json(
        { status: "error", errorCode: "invalid_credentials" },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    if (!data.user || !data.session) {
      return NextResponse.json(
        { status: "error", errorCode: "invalid_credentials" },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select(
        "id, username, display_name, avatar_url, bio, interests, github_url, linkedin_url, preferred_locale, role, is_suspended, created_at"
      )
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileErr || !profile) {
      return NextResponse.json(
        { status: "error", errorCode: "profile_missing" },
        { status: 200, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        status: profile.is_suspended ? "suspended" : "authenticated",
        user: { id: data.user.id, email: data.user.email ?? null },
        profile,
      },
      { status: 200, headers: NO_STORE_HEADERS }
    );
  } catch {
    return NextResponse.json(
      { status: "error", errorCode: "network_error" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
