import { redirect } from "next/navigation";
import {
  hasDeveloperAdminSession,
  isAdminPasswordConfigured,
  requireDeveloperAdminIdentity,
} from "@/lib/admin";
import AdminLoginClient from "./admin-login-client";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const admin = await requireDeveloperAdminIdentity();
  if (!admin) redirect("/dashboard");
  if (await hasDeveloperAdminSession(admin)) redirect("/admin");

  return <AdminLoginClient email={admin.email} configured={isAdminPasswordConfigured()} />;
}
