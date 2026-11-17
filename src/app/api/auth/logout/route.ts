import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Signs out the current Supabase SSR session on the server,
 * invalidating auth cookies on the outgoing response.
 */
export async function POST(): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return NextResponse.json(
        { ok: false, error: "logout_failed" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { ok: true },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "logout_failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
