import { redirect } from "next/navigation";
import { getAuthClaims } from "@/lib/auth";
import CampaignsClient from "./campaigns-client";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const auth = await getAuthClaims();
  if (!auth) redirect("/login");
  return <CampaignsClient />;
}
