import { KeysView } from "@/components/dashboard/KeysView";
import { getSessionUser } from "@/lib/supabase/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Key List — XLOOP PANEL" };

export default async function KeysPage({
  searchParams,
}: {
  searchParams?: { search?: string | string[] };
}) {
  const user = await getSessionUser();
  const rawSearch = Array.isArray(searchParams?.search) ? searchParams.search[0] : searchParams?.search;
  const initialSearch = (rawSearch ?? "").trim().slice(0, 100);
  return <KeysView role={user.role} credit={user.credit} initialSearch={initialSearch} />;
}
