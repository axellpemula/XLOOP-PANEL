import { ToolManager } from "@/components/dashboard/ToolManager";
import { getSessionUser } from "@/lib/supabase/session";
import { redirect } from "next/navigation";
import { getPublicKey } from "@/lib/utils/signing";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tool Management — XLOOP PANEL" };

export default async function ToolsPage() {
  const user = await getSessionUser();
  if (user.role !== "owner") redirect("/dashboard");

  // Public key aman ditampilkan (hanya untuk verifikasi signature di sisi tool).
  const publicKey = getPublicKey();

  return <ToolManager publicKey={publicKey} />;
}
