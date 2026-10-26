import { NextResponse } from "next/server";
import { handleApiError, requireUser } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

/** Profil user yang sedang login (dipakai untuk refresh saldo credit di UI). */
export async function GET() {
  try {
    const { user } = await requireUser();
    return NextResponse.json({ user });
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
