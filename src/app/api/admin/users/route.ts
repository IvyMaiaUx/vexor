import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  handleGetAdminUserById,
  handleGetAdminUsersSummary,
  handleListAdminUsers,
  handleUpdateAdminUserRole,
  handleUpdateAdminUserSuspension,
} from "@/features/admin/server/admin-server-handlers";
import type { AdminUserFilters, AdminUserStatus, DbUserRole } from "@/features/admin/types";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  const userId = searchParams.get("userId");

  if (mode === "summary") {
    const result = await handleGetAdminUsersSummary(supabase);
    return NextResponse.json(result.body, { status: result.status });
  }

  if (userId) {
    const result = await handleGetAdminUserById(supabase, userId);
    return NextResponse.json(result.body, { status: result.status });
  }

  const filters: AdminUserFilters = {
    query: searchParams.get("query") ?? undefined,
    role: (searchParams.get("role") as DbUserRole | "all" | null) ?? "all",
    status: (searchParams.get("status") as AdminUserStatus | "all" | null) ?? "all",
    suspendedOnly: searchParams.get("suspendedOnly") === "true",
    period: (searchParams.get("period") as AdminUserFilters["period"] | null) ?? "all",
  };
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const pageSize = Number(searchParams.get("pageSize") ?? "20") || 20;

  const result = await handleListAdminUsers(supabase, filters, { page, pageSize });
  return NextResponse.json(result.body, { status: result.status });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (body.operation === "set_role") {
    const result = await handleUpdateAdminUserRole(supabase, {
      targetUserId: body.targetUserId,
      newRole: body.newRole,
    });
    return NextResponse.json(result.body, { status: result.status });
  }

  if (body.operation === "set_suspension") {
    const result = await handleUpdateAdminUserSuspension(supabase, {
      targetUserId: body.targetUserId,
      suspended: body.suspended,
      reason: body.reason,
    });
    return NextResponse.json(result.body, { status: result.status });
  }

  return NextResponse.json(
    { error: "Unsupported user administration operation." },
    { status: 400 }
  );
}
