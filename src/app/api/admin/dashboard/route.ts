import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleGetAdminDashboard } from "@/features/admin/server/admin-server-handlers";

export async function GET() {
  const supabase = await createClient();
  const result = await handleGetAdminDashboard(supabase);
  return NextResponse.json(result.body, { status: result.status });
}
