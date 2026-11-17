import { NextResponse } from "next/server";
import {
  evaluateSessionAuthorization,
  resolveServerSession,
} from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

/**
 * Returns the server-validated Supabase Auth user, `public.profiles` record,
 * and server-derived authorization flags.
 */
export async function GET(): Promise<NextResponse> {
  const resolution = await resolveServerSession();
  const check = evaluateSessionAuthorization(resolution, "authenticated");

  if (resolution.status === "connection_error") {
    return NextResponse.json(
      {
        authenticated: false,
        status: "connection_error",
        user: null,
        profile: null,
        authorization: check.authorization,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (resolution.status === "unauthenticated") {
    return NextResponse.json(
      {
        authenticated: false,
        status: "unauthenticated",
        user: null,
        profile: null,
        authorization: check.authorization,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (resolution.status === "profile_missing") {
    return NextResponse.json(
      {
        authenticated: true,
        status: "profile_missing",
        user: resolution.user,
        profile: null,
        authorization: check.authorization,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      status: "authenticated",
      user: resolution.user,
      profile: resolution.profile,
      authorization: check.authorization,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
