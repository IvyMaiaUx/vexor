import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  handleExecuteModerationAction,
  handleListAdminResources,
} from "@/features/admin/server/admin-server-handlers";
import type { ModerationAction, ResourceStatus } from "@/features/admin/types";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const filter = {
    status: (searchParams.get("status") as ResourceStatus | "all" | null) ?? "all",
    query: searchParams.get("query") ?? undefined,
  };
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const pageSize = Number(searchParams.get("pageSize") ?? "20") || 20;

  const result = await handleListAdminResources(supabase, filter, {
    page,
    pageSize,
  });
  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const decision = body.decision;
  let action: ModerationAction | undefined;
  if (decision === "approved") action = "approve";
  else if (decision === "rejected") action = "reject";
  else if (decision === "archived") action = "archive";

  const result = await handleExecuteModerationAction(supabase, {
    id: body.resourceId,
    contentType: "resource",
    action,
    reason: body.reason,
  });
  return NextResponse.json(result.body, { status: result.status });
}
