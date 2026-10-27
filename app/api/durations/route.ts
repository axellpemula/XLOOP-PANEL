import { NextResponse } from "next/server";
import { ApiError, handleApiError, requireOwner, requireUser } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { user, admin } = await requireUser();

    let query = admin.from("duration_presets").select("*").order("days", { ascending: true });
    if (user.role === "reseller") query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

interface DurationBody {
  name?: string;
  days?: number;
  credit_cost?: number;
  is_active?: boolean;
}

export async function POST(request: Request) {
  try {
    const { admin } = await requireOwner();

    let body: DurationBody;
    try {
      body = await request.json();
    } catch {
      throw new ApiError("Data tidak valid.", 400);
    }

    const name = (body.name ?? "").trim().slice(0, 40);
    const days = Number(body.days ?? 0);
    const creditCost = Number(body.credit_cost ?? 0);

    if (name.length < 1) throw new ApiError("Nama durasi wajib diisi.", 400);
    if (!Number.isInteger(days) || days < 1 || days > 3650) throw new ApiError("Jumlah hari harus 1–3650.", 400);
    if (!Number.isInteger(creditCost) || creditCost < 0) throw new ApiError("Harga credit tidak valid.", 400);

    const { data, error } = await admin
      .from("duration_presets")
      .insert({
        name,
        days,
        credit_cost: creditCost,
        is_active: body.is_active ?? true,
      })
      .select("*")
      .maybeSingle();

    if (error) throw new Error(error.message);
    return NextResponse.json({ preset: data }, { status: 201 });
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
