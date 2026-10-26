import { DashboardView } from "@/components/dashboard/DashboardView";
import { getSessionUser } from "@/lib/supabase/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard — XLOOP PANEL" };

export default async function DashboardPage() {
  const user = await getSessionUser();
  return <DashboardView role={user.role} credit={user.credit} />;
}
