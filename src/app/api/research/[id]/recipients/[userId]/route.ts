import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleRevokeResearchRecipient } from "@/features/cybercrime-research/server/research-server-handlers";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

interface RouteContext {
  params: Promise<{ id: string; userId: string }>;
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id, userId } = await context.params;
  const supabase = await createClient();
  const result = await handleRevokeResearchRecipient(supabase, id, userId);
  return NextResponse.json(result.body, {
    status: result.status,
    headers: NO_STORE_HEADERS,
  });
}
