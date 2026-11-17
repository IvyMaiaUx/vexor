import React from "react";
import { redirect } from "next/navigation";
import { requireServerAuthorization } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export default async function CybercrimeResearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { check } = await requireServerAuthorization("active_member");

  if (!check.allowed) {
    if (check.reason === "unauthenticated") {
      redirect("/login?next=%2Fcybercrime-research");
    }
    redirect("/catalog");
  }

  return <>{children}</>;
}
