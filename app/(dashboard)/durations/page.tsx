import { redirect } from "next/navigation";
import { DurationManager } from "@/components/dashboard/DurationManager";
import { getSessionUser } from "@/lib/supabase/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Duration Setting — XLOOP PANEL" };

export default async function DurationsPage() {
  const user = await getSessionUser();
  if (user.role !== "owner") redirect("/dashboard");
  return <DurationManager />;
}
