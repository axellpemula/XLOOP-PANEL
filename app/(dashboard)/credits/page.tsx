import { CreditLogView } from "@/components/dashboard/CreditLogView";
import { getSessionUser } from "@/lib/supabase/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Credit Log — XLOOP PANEL" };

export default async function CreditsPage() {
  const user = await getSessionUser();
  return <CreditLogView role={user.role} />;
}
