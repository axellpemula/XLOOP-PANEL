import { redirect } from "next/navigation";
import { ResellerManager } from "@/components/dashboard/ResellerManager";
import { getSessionUser } from "@/lib/supabase/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reseller — XLOOP PANEL" };

export default async function ResellersPage() {
  const user = await getSessionUser();
  if (user.role !== "owner") redirect("/dashboard");
  return <ResellerManager />;
}
