"use client";

import { useCallback, useEffect, useState } from "react";
import { EyeIcon, KeyIcon, PlusIcon, RefreshIcon, TrashIcon, UsersIcon, WalletIcon } from "@/components/icons";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { FieldWrap, Input } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { SimpleBadge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import { apiFetch } from "@/lib/api/client";
import { formatDateTime, formatNumber } from "@/lib/utils/format";
import type { CreditLog, Profile } from "@/lib/utils/types";

type Reseller = Profile & { key_count?: number };

export function ResellerManager() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Reseller[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ username: "", email: "", password: "", credit: "0" });
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [topupTarget, setTopupTarget] = useState<Reseller | null>(null);
  const [topupForm, setTopupForm] = useState({ amount: "10", note: "" });
  const [topupError, setTopupError] = useState<string | null>(null);
  const [toppingUp, setToppingUp] = useState(false);

  const [passwordTarget, setPasswordTarget] = useState<Reseller | null>(null);
  const [passwordValue, setPasswordValue] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const [detailTarget, setDetailTarget] = useState<Reseller | null>(null);
  const [detailLogs, setDetailLogs] = useState<CreditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Reseller | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiFetch<{ data: Reseller[] }>("/api/resellers");
      setRows(result.data);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal memuat reseller.", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    // Bersihkan error sisa percobaan sebelumnya supaya tidak muncul lagi
    // saat modal dibuka ulang.
    setCreateError(null);
    setCreateOpen(true);
  }

  async function createReseller() {
    setCreateError(null);
    setCreating(true);
    try {
      await apiFetch("/api/resellers", {
        method: "POST",
        body: JSON.stringify({
          username: createForm.username.trim(),
          email: createForm.email.trim(),
          password: createForm.password,
          credit: Number(createForm.credit) || 0,
        }),
      });
      toast("Reseller dibuat.", "success");
      setCreateOpen(false);
      setCreateForm({ username: "", email: "", password: "", credit: "0" });
      await load();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Gagal membuat reseller.");
    } finally {
      setCreating(false);
    }
  }

  async function submitTopup() {
    if (!topupTarget) return;
    const amount = Number(topupForm.amount);
    if (!Number.isInteger(amount) || amount === 0) {
      setTopupError("Jumlah topup tidak valid.");
      return;
    }

    setToppingUp(true);
    try {
      await apiFetch(`/api/resellers/${topupTarget.id}`, {
        method: "PUT",
        body: JSON.stringify({ action: "topup", amount, note: topupForm.note.trim() }),
      });
      toast(`Credit ${topupTarget.username} diperbarui.`, "success");
      setTopupTarget(null);
      setTopupForm({ amount: "10", note: "" });
      await load();
    } catch (error) {
      setTopupError(error instanceof Error ? error.message : "Gagal topup credit.");
    } finally {
      setToppingUp(false);
    }
  }

  async function toggleActive(reseller: Reseller, nextActive: boolean = !reseller.is_active) {
    // Abaikan klik ganda selagi request berjalan: payload yang sama terkirim
    // dua kali sementara state lokal terbalik dua kali → UI ≠ server.
    if (togglingId === reseller.id) return;
    setTogglingId(reseller.id);
    try {
      await apiFetch(`/api/resellers/${reseller.id}`, {
        method: "PUT",
        body: JSON.stringify({ action: "toggle", is_active: nextActive }),
      });
      setRows((prev) => prev.map((row) => (row.id === reseller.id ? { ...row, is_active: nextActive } : row)));
      // Modal detail membaca dari detailTarget, bukan rows — tanpa ini
      // Switch di modal detail tidak bergerak walau API sukses.
      setDetailTarget((prev) => (prev?.id === reseller.id ? { ...prev, is_active: nextActive } : prev));
      toast(nextActive ? "Reseller diaktifkan." : "Reseller dinonaktifkan.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal mengubah status.", "error");
    } finally {
      setTogglingId(null);
    }
  }

  async function submitPassword() {
    if (!passwordTarget) return;
    if (passwordValue.length < 6) {
      setPasswordError("Password minimal 6 karakter.");
      return;
    }

    setSavingPassword(true);
    try {
      await apiFetch(`/api/resellers/${passwordTarget.id}`, {
        method: "PUT",
        body: JSON.stringify({ action: "password", password: passwordValue }),
      });
      toast("Password diperbarui.", "success");
      setPasswordTarget(null);
      setPasswordValue("");
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Gagal reset password.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function openDetail(reseller: Reseller) {
    setDetailTarget(reseller);
    setDetailLoading(true);
    try {
      const result = await apiFetch<{ reseller: Reseller; credit_logs: CreditLog[] }>(
        `/api/resellers/${reseller.id}`
      );
      setDetailLogs(result.credit_logs);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal memuat detail.", "error");
    } finally {
      setDetailLoading(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/resellers/${deleteTarget.id}`, { method: "DELETE" });
      toast("Reseller dihapus.", "success");
      setDeleteTarget(null);
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal menghapus reseller.", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Reseller"
        description="Kelola akun reseller, credit, dan akses login."
        action={
          <Button variant="primary" onClick={openCreate} icon={<PlusIcon size={16} strokeWidth={1.5} />}>
            Tambah Reseller
          </Button>
        }
      />

      <div className="glass-table overflow-hidden rounded-card">
        <div className="overflow-x-auto scroll-area">
          <table className="data-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Sisa credit</th>
                <th>Total key</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col gap-2 py-4">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton key={index} className="h-6 w-full" />
                      ))}
                    </div>
                  </td>
                </tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      message="Belum ada reseller"
                      hint="Reseller bisa generate key sendiri memakai saldo credit yang kamu atur."
                      icon={<UsersIcon size={20} strokeWidth={1.5} />}
                      steps={["Buat akun", "Isi credit awal", "Reseller generate key"]}
                      actionLabel="Tambah Reseller"
                      onAction={openCreate}
                    />
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((reseller) => (
                  <tr key={reseller.id}>
                    <td className="text-text">{reseller.username}</td>
                    <td className="text-muted">{reseller.email}</td>
                    <td className="tabular text-text">{formatNumber(reseller.credit)}</td>
                    <td className="tabular text-muted">{formatNumber(reseller.key_count ?? 0)}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => toggleActive(reseller)}
                        disabled={togglingId === reseller.id}
                        className="cursor-pointer disabled:cursor-wait disabled:opacity-60"
                        aria-label={`${reseller.is_active ? "Nonaktifkan" : "Aktifkan"} ${reseller.username}`}
                        title={reseller.is_active ? "Klik untuk menonaktifkan" : "Klik untuk mengaktifkan"}
                      >
                        <SimpleBadge tone={reseller.is_active ? "active" : "banned"}>
                          {reseller.is_active ? "Aktif" : "Nonaktif"}
                        </SimpleBadge>
                      </button>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" onClick={() => openDetail(reseller)} aria-label="Detail reseller" title="Detail">
                          <EyeIcon size={16} strokeWidth={1.5} />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setTopupTarget(reseller);
                            setTopupError(null);
                            setTopupForm({ amount: "10", note: "" });
                          }}
                          aria-label="Topup credit"
                          title="Topup"
                        >
                          <WalletIcon size={16} strokeWidth={1.5} />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setPasswordTarget(reseller);
                            setPasswordValue("");
                            setPasswordError(null);
                          }}
                          aria-label="Reset password"
                          title="Reset password"
                        >
                          <KeyIcon size={16} strokeWidth={1.5} />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setDeleteTarget(reseller)}
                          aria-label="Hapus reseller"
                          title="Hapus"
                        >
                          <TrashIcon size={16} strokeWidth={1.5} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <Button size="sm" onClick={load} loading={loading} icon={<RefreshIcon size={16} strokeWidth={1.5} />}>
          Muat ulang
        </Button>
      </div>

      {/* Tambah reseller */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tambah Reseller"
        description="Akun langsung aktif, tanpa verifikasi email."
        busy={creating}
        onSubmit={createReseller}
        footer={
          <>
            <Button onClick={() => setCreateOpen(false)} disabled={creating}>
              Batal
            </Button>
            <Button variant="primary" onClick={createReseller} loading={creating}>
              Simpan
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {/* autoComplete dimatikan/diarahkan ke kredensial baru: form ini
              membuat akun ORANG LAIN, jadi browser jangan mengisi otomatis
              email/password milik Owner yang sedang login. */}
          <FieldWrap label="Username" htmlFor="reseller-username">
            <Input
              id="reseller-username"
              name="reseller-username"
              autoComplete="off"
              value={createForm.username}
              placeholder="reseller01"
              onChange={(event) => setCreateForm((prev) => ({ ...prev, username: event.target.value }))}
            />
          </FieldWrap>

          <FieldWrap label="Email" htmlFor="reseller-email">
            <Input
              id="reseller-email"
              name="reseller-email"
              type="email"
              autoComplete="off"
              value={createForm.email}
              placeholder="reseller01@xloop.dev"
              onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </FieldWrap>

          <FieldWrap label="Password" htmlFor="reseller-password" hint="Minimal 6 karakter.">
            <Input
              id="reseller-password"
              name="reseller-password"
              type="text"
              autoComplete="new-password"
              value={createForm.password}
              placeholder="Password awal"
              onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))}
            />
          </FieldWrap>

          <FieldWrap label="Credit awal" htmlFor="reseller-credit">
            <Input
              id="reseller-credit"
              type="number"
              min={0}
              value={createForm.credit}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, credit: event.target.value }))}
              className="tabular"
            />
          </FieldWrap>

          {createError && <p className="text-label text-banned">{createError}</p>}
        </div>
      </Modal>

      {/* Topup */}
      <Modal
        open={topupTarget !== null}
        onClose={() => setTopupTarget(null)}
        title="Topup Credit"
        description={topupTarget?.username}
        size="sm"
        busy={toppingUp}
        onSubmit={submitTopup}
        footer={
          <>
            <Button onClick={() => setTopupTarget(null)} disabled={toppingUp}>
              Batal
            </Button>
            <Button variant="primary" onClick={submitTopup} loading={toppingUp}>
              Simpan
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-glass-border bg-white/[0.03] p-3 text-label text-muted">
            Saldo sekarang: <span className="tabular text-text">{formatNumber(topupTarget?.credit ?? 0)}</span>
          </div>

          <FieldWrap label="Jumlah credit" htmlFor="topup-amount" hint="Boleh negatif untuk penyesuaian.">
            <Input
              id="topup-amount"
              type="number"
              value={topupForm.amount}
              onChange={(event) => setTopupForm((prev) => ({ ...prev, amount: event.target.value }))}
              className="tabular"
            />
          </FieldWrap>

          <FieldWrap label="Catatan" htmlFor="topup-note">
            <Input
              id="topup-note"
              value={topupForm.note}
              placeholder="Topup manual"
              onChange={(event) => setTopupForm((prev) => ({ ...prev, note: event.target.value }))}
            />
          </FieldWrap>

          {topupError && <p className="text-label text-banned">{topupError}</p>}
        </div>
      </Modal>

      {/* Reset password */}
      <Modal
        open={passwordTarget !== null}
        onClose={() => setPasswordTarget(null)}
        title="Reset Password"
        description={passwordTarget?.username}
        size="sm"
        busy={savingPassword}
        onSubmit={submitPassword}
        footer={
          <>
            <Button onClick={() => setPasswordTarget(null)} disabled={savingPassword}>
              Batal
            </Button>
            <Button variant="primary" onClick={submitPassword} loading={savingPassword}>
              Simpan
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <FieldWrap label="Password baru" htmlFor="new-password" hint="Minimal 6 karakter.">
            <Input
              id="new-password"
              name="new-password"
              type="text"
              autoComplete="new-password"
              value={passwordValue}
              onChange={(event) => setPasswordValue(event.target.value)}
              placeholder="Password baru"
            />
          </FieldWrap>
          {passwordError && <p className="text-label text-banned">{passwordError}</p>}
        </div>
      </Modal>

      {/* Detail */}
      <Modal
        open={detailTarget !== null}
        onClose={() => setDetailTarget(null)}
        title="Detail Reseller"
        description={detailTarget?.username}
        footer={
          <>
            <Button onClick={() => setDetailTarget(null)}>Tutup</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (detailTarget) {
                  setTopupTarget(detailTarget);
                  setTopupError(null);
                  setDetailTarget(null);
                }
              }}
              icon={<WalletIcon size={16} strokeWidth={1.5} />}
            >
              Topup Credit
            </Button>
          </>
        }
      >
        {detailTarget && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-glass-border bg-white/[0.03] p-3">
                <p className="text-label text-muted">Email</p>
                <p className="mt-1 truncate text-body text-text">{detailTarget.email}</p>
              </div>
              <div className="rounded-lg border border-glass-border bg-white/[0.03] p-3">
                <p className="text-label text-muted">Sisa credit</p>
                <p className="mt-1 tabular text-body text-text">{formatNumber(detailTarget.credit)}</p>
              </div>
              <div className="rounded-lg border border-glass-border bg-white/[0.03] p-3">
                <p className="text-label text-muted">Total key</p>
                <p className="mt-1 tabular text-body text-text">{formatNumber(detailTarget.key_count ?? 0)}</p>
              </div>
              <div className="rounded-lg border border-glass-border bg-white/[0.03] p-3">
                <p className="text-label text-muted">Status akun</p>
                <div className="mt-1.5">
                  <SimpleBadge tone={detailTarget.is_active ? "active" : "banned"}>
                    {detailTarget.is_active ? "Aktif" : "Nonaktif"}
                  </SimpleBadge>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-body font-medium text-text">Riwayat Credit</h3>
              <div className="overflow-x-auto scroll-area rounded-lg border border-glass-border">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Aksi</th>
                      <th>Jumlah</th>
                      <th>Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailLoading && (
                      <tr>
                        <td colSpan={4}>
                          <Skeleton className="my-3 h-5 w-full" />
                        </td>
                      </tr>
                    )}
                    {!detailLoading && detailLogs.length === 0 && (
                      <tr>
                        <td colSpan={4}>
                          <p className="py-6 text-center text-body text-muted">Belum ada transaksi</p>
                        </td>
                      </tr>
                    )}
                    {!detailLoading &&
                      detailLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="text-muted">{formatDateTime(log.created_at)}</td>
                          <td className="text-text">{log.action === "topup" ? "Topup" : "Generate"}</td>
                          <td className={`tabular ${log.amount < 0 ? "text-banned" : "text-active"}`}>
                            {log.amount > 0 ? "+" : ""}
                            {formatNumber(log.amount)}
                          </td>
                          <td className="tabular text-text">{formatNumber(log.balance_after)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-glass-border bg-white/[0.03] px-3 py-2">
              <span className="text-label text-muted">Akun aktif (bisa login)</span>
              <Switch
                checked={detailTarget.is_active}
                onChange={(next) => toggleActive(detailTarget, next)}
                disabled={togglingId === detailTarget.id}
                ariaLabel={`Akun ${detailTarget.username} bisa login`}
              />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus reseller?"
        message={`Akun ${deleteTarget?.username ?? ""} akan dihapus permanen. Pastikan tidak ada key tersisa.`}
        confirmLabel="Hapus"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
