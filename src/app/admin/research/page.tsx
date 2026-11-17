import { redirect } from "next/navigation";

export default function AdminResearchRedirectPage() {
  redirect("/admin/moderation?type=research");
}
