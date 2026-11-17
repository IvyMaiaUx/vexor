import React from "react";
import { redirect } from "next/navigation";
import { requireServerAuthorization } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export default async function AdminUsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { check } = await requireServerAuthorization("admin");

  if (!check.allowed) {
    if (check.reason === "unauthenticated") {
      redirect("/login?next=%2Fadmin%2Fusers");
    }
    redirect("/admin");
  }

  return <>{children}</>;
}
