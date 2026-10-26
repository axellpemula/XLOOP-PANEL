import { KeysView } from "@/components/dashboard/KeysView";
import { getSessionUser } from "@/lib/supabase/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Key List — XLOOP PANEL" };

export default async function KeysPage() {
  const user = await getSessionUser();
  return <KeysView role={user.role} credit={user.credit} />;
}
