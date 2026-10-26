import { NextResponse } from "next/server";
import { ApiError, handleApiError, requireOwner } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

interface DurationBody {
  name?: string;
  days?: number;
  credit_cost?: number;
  is_active?: boolean;
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { admin } = await requireOwner();

    let body: DurationBody;
    try {
      body = await request.json();
    } catch {
      throw new ApiError("Data tidak valid.", 400);
    }

    const update: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = body.name.trim().slice(0, 40);
      if (name.length < 1) throw new ApiError("Nama durasi wajib diisi.", 400);
      update.name = name;
    }

    if (body.days !== undefined) {
      const days = Number(body.days);
      if (!Number.isInteger(days) || days < 1 || days > 3650) throw new ApiError("Jumlah hari harus 1–3650.", 400);
      update.days = days;
    }

    if (body.credit_cost !== undefined) {
      const creditCost = Number(body.credit_cost);
      if (!Number.isInteger(creditCost) || creditCost < 0) throw new ApiError("Harga credit tidak valid.", 400);
      update.credit_cost = creditCost;
    }

    if (body.is_active !== undefined) update.is_active = Boolean(body.is_active);
    if (Object.keys(update).length === 0) throw new ApiError("Tidak ada perubahan.", 400);

    const { data, error } = await admin
      .from("duration_presets")
      .update(update)
      .eq("id", params.id)
      .select("*")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new ApiError("Preset durasi tidak ditemukan.", 404);

    return NextResponse.json({ preset: data });
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { admin } = await requireOwner();

    const { error } = await admin.from("duration_presets").delete().eq("id", params.id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
