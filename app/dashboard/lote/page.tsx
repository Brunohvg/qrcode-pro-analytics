import { redirect } from "next/navigation";
import { getAuthClaims } from "@/lib/auth";
import BulkClient from "./bulk-client";

export const dynamic = "force-dynamic";

export default async function BulkPage() {
  const auth = await getAuthClaims();
  if (!auth) redirect("/login");
  return <BulkClient />;
}
