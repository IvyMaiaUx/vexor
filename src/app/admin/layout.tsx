import React from "react";
import { redirect } from "next/navigation";
import { AdminLayoutShell } from "@/features/admin/components/admin-layout-shell";
import { requireServerAuthorization } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { check } = await requireServerAuthorization("moderator");

  if (!check.allowed) {
    if (check.reason === "unauthenticated") {
      redirect("/login?next=%2Fadmin");
    }
    redirect("/catalog");
  }

  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
