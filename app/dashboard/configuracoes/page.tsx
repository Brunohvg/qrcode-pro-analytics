import { redirect } from "next/navigation";
import { getAuthClaims } from "@/lib/auth";
import SettingsClient from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const auth = await getAuthClaims();
  if (!auth) redirect("/login");
  return <SettingsClient />;
}
