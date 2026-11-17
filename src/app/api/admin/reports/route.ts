import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  handleListAdminReports,
  handleResolveAdminReport,
} from "@/features/admin/server/admin-server-handlers";
import type {
  ReportReason,
  ReportStatus,
  ReportTargetType,
} from "@/features/admin/types";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const filter = {
    status: (searchParams.get("status") as ReportStatus | "all" | null) ?? "all",
    reason: (searchParams.get("reason") as ReportReason | "all" | null) ?? "all",
    targetType:
      (searchParams.get("targetType") as ReportTargetType | "all" | null) ?? "all",
  };
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const pageSize = Number(searchParams.get("pageSize") ?? "20") || 20;

  const result = await handleListAdminReports(supabase, filter, { page, pageSize });
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

  const result = await handleResolveAdminReport(supabase, {
    reportId: body.reportId,
    status: body.status,
    note: body.note,
  });
  return NextResponse.json(result.body, { status: result.status });
}
