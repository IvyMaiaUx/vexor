import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  handleExportAdminAudit,
  handleGetAdminAuditById,
  handleGetAdminAuditSummary,
  handleListAdminAudit,
} from "@/features/admin/server/admin-server-handlers";
import type {
  AdminAuditFilters,
  AuditPeriodFilter,
  AuditSeverity,
} from "@/features/admin/types";

function parseAuditFilters(searchParams: URLSearchParams): AdminAuditFilters {
  return {
    query: searchParams.get("query") ?? undefined,
    entityType: searchParams.get("entityType") ?? "all",
    entityId: searchParams.get("entityId") ?? undefined,
    action: searchParams.get("action") ?? "all",
    actorUsername: searchParams.get("actorUsername") ?? undefined,
    severity: (searchParams.get("severity") as AuditSeverity | "all" | null) ?? "all",
    period: (searchParams.get("period") as AuditPeriodFilter | null) ?? "all",
    startDate: searchParams.get("startDate") ?? undefined,
    endDate: searchParams.get("endDate") ?? undefined,
    sortOrder: searchParams.get("sortOrder") === "asc" ? "asc" : "desc",
  };
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  const entryIdParam = searchParams.get("entryId");

  if (mode === "summary") {
    const result = await handleGetAdminAuditSummary(supabase);
    return NextResponse.json(result.body, { status: result.status });
  }

  if (entryIdParam !== null) {
    const entryId = Number(entryIdParam);
    const result = await handleGetAdminAuditById(supabase, entryId);
    return NextResponse.json(result.body, { status: result.status });
  }

  const filters = parseAuditFilters(searchParams);

  if (mode === "export") {
    const result = await handleExportAdminAudit(supabase, filters);
    return NextResponse.json(result.body, { status: result.status });
  }

  const page = Number(searchParams.get("page") ?? "1") || 1;
  const pageSize = Number(searchParams.get("pageSize") ?? "20") || 20;
  const result = await handleListAdminAudit(supabase, filters, { page, pageSize });
  return NextResponse.json(result.body, { status: result.status });
}
