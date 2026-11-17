import { redirect } from "next/navigation";

export default function AdminForumRedirectPage() {
  redirect("/admin/moderation?type=topic");
}
