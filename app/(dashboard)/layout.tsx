import { DashboardShell } from "@/components/layout/DashboardShell";
import { getSessionUser } from "@/lib/supabase/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  return <DashboardShell user={user}>{children}</DashboardShell>;
}
