import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  handleCreateResearch,
  handleListResearch,
} from "@/features/cybercrime-research/server/research-server-handlers";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const result = await handleListResearch(supabase, searchParams);
  return NextResponse.json(result.body, {
    status: result.status,
    headers: NO_STORE_HEADERS,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload.", code: "invalid_json" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const result = await handleCreateResearch(supabase, body);
  return NextResponse.json(result.body, {
    status: result.status,
    headers: NO_STORE_HEADERS,
  });
}
