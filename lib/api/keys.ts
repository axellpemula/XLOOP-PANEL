import { ApiError, type AuthContext } from "@/lib/api/auth";
import { KEY_SELECT } from "@/lib/utils/key-query";
import type { LicenseKey } from "@/lib/utils/types";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ambil key + pastikan boleh diakses oleh user yang login. */
export async function getOwnedKey(ctx: AuthContext, id: string): Promise<LicenseKey> {
  if (!UUID_REGEX.test(id)) throw new ApiError("ID key tidak valid.", 400);

  const { data, error } = await ctx.admin.from("keys").select(KEY_SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new ApiError("Key tidak ditemukan.", 404);

  const key = data as unknown as LicenseKey;
  if (ctx.user.role === "reseller" && key.created_by !== ctx.user.id) {
    throw new ApiError("Key ini bukan milik kamu.", 403);
  }
  return key;
}
