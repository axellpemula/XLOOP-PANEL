import { GenerateView } from "@/components/dashboard/GenerateView";
import { getSessionUser } from "@/lib/supabase/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Generate Key — XLOOP PANEL" };

export default async function GeneratePage() {
  const user = await getSessionUser();
  return <GenerateView role={user.role} credit={user.credit} />;
}
