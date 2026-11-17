import { redirect } from "next/navigation";

export default function LegacyResetPasswordRedirectPage() {
  redirect("/auth/reset-password");
}
