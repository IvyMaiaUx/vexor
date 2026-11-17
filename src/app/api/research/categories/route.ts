import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleListResearchCategories } from "@/features/cybercrime-research/server/research-server-handlers";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  const supabase = await createClient();
  const result = await handleListResearchCategories(supabase);
  return NextResponse.json(result.body, {
    status: result.status,
    headers: NO_STORE_HEADERS,
  });
}
