import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  handleExecuteModerationAction,
  handleListModerationQueue,
} from "@/features/admin/server/admin-server-handlers";
import type {
  ModerationContentType,
  ModerationPriority,
  ModerationQueueFilter,
} from "@/features/admin/types";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const filter: ModerationQueueFilter = {
    contentType:
      (searchParams.get("contentType") as ModerationContentType | "all" | null) ??
      "all",
    status: searchParams.get("status") ?? "all",
    priority:
      (searchParams.get("priority") as ModerationPriority | "all" | null) ?? "all",
    category: searchParams.get("category") ?? "all",
    author: searchParams.get("author") ?? undefined,
    hasReports:
      (searchParams.get("hasReports") as ModerationQueueFilter["hasReports"] | null) ??
      "all",
    period:
      (searchParams.get("period") as ModerationQueueFilter["period"] | null) ??
      "all",
    query: searchParams.get("query") ?? undefined,
  };
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const pageSize = Number(searchParams.get("pageSize") ?? "20") || 20;

  const result = await handleListModerationQueue(supabase, filter, {
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

  const result = await handleExecuteModerationAction(supabase, {
    id: body.id,
    contentType: body.contentType,
    action: body.action,
    reason: body.reason,
  });
  return NextResponse.json(result.body, { status: result.status });
}
