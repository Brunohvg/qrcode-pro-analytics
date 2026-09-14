import { redirect } from "next/navigation";
import { requireDeveloperAdmin } from "@/lib/admin";
import AdminBillingClient from "./admin-billing-client";

export const dynamic = "force-dynamic";

export default async function AdminBillingPage() {
  const admin = await requireDeveloperAdmin();
  if (!admin) redirect("/admin/login");
  return <AdminBillingClient adminEmail={admin.email} />;
}
