"use client";

import { useCallback, useEffect, useState } from "react";
import { PencilIcon, PlusIcon, TimerIcon, TrashIcon } from "@/components/icons";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { FieldWrap, Input } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Switch } from "@/components/ui/Switch";
import { SimpleBadge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { apiFetch } from "@/lib/api/client";
import { formatNumber } from "@/lib/utils/format";
import type { DurationPreset } from "@/lib/utils/types";

interface FormState {
  name: string;
  days: string;
  credit_cost: string;
  is_active: boolean;
}

const EMPTY: FormState = { name: "", days: "30", credit_cost: "10", is_active: true };

export function DurationManager() {
  const { toast } = useToast();
  const [items, setItems] = useState<DurationPreset[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DurationPreset | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<DurationPreset | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiFetch<{ data: DurationPreset[] }>("/api/durations");
      setItems(result.data);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal memuat durasi.", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setOpen(true);
  }

  function openEdit(item: DurationPreset) {
    setEditing(item);
    setForm({
      name: item.name,
      days: String(item.days),
      credit_cost: String(item.credit_cost),
      is_active: item.is_active,
    });
    setError(null);
    setOpen(true);
  }

  async function submit() {
    setError(null);

    const days = Number(form.days);
    const cost = Number(form.credit_cost);

    if (form.name.trim().length < 1) {
      setError("Nama durasi wajib diisi.");
      return;
    }
    if (!Number.isInteger(days) || days < 1 || days > 3650) {
      setError("Jumlah hari harus 1–3650.");
      return;
    }
    if (!Number.isInteger(cost) || cost < 0) {
      setError("Harga credit tidak valid.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        days,
        credit_cost: cost,
        is_active: form.is_active,
      };

      if (editing) {
        await apiFetch(`/api/durations/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast("Durasi diperbarui.", "success");
      } else {
        await apiFetch("/api/durations", { method: "POST", body: JSON.stringify(payload) });
        toast("Durasi ditambahkan.", "success");
      }

      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan durasi.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(item: DurationPreset) {
    const nextActive = !item.is_active;
    // Klik ganda mengirim payload sama dua kali tapi state lokal terbalik
    // dua kali → tampilan berlawanan dengan server. Kunci per baris.
    if (togglingId === item.id) return;
    setTogglingId(item.id);
    try {
      await apiFetch(`/api/durations/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: nextActive }),
      });
      setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, is_active: nextActive } : row)));
      toast(nextActive ? "Durasi diaktifkan." : "Durasi dinonaktifkan.", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal mengubah status.", "error");
    } finally {
      setTogglingId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/durations/${deleteTarget.id}`, { method: "DELETE" });
      toast("Durasi dihapus.", "success");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal menghapus durasi.", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Duration Setting"
        description="Preset durasi yang bisa dipilih Reseller saat generate key."
        action={
          <Button variant="primary" onClick={openCreate} icon={<PlusIcon size={16} strokeWidth={1.5} />}>
            Tambah Durasi
          </Button>
        }
      />

      <div className="glass-table overflow-hidden rounded-card">
        <div className="overflow-x-auto scroll-area">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama durasi</th>
                <th>Jumlah hari</th>
                <th>Harga credit</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5}>
                    <div className="flex flex-col gap-2 py-4">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton key={index} className="h-6 w-full" />
                      ))}
                    </div>
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      message="Belum ada preset durasi"
                      hint="Preset menentukan masa aktif key dan harga credit untuk reseller."
                      icon={<TimerIcon size={20} strokeWidth={1.5} />}
                      steps={["Tentukan hari", "Atur harga credit", "Aktifkan preset"]}
                      actionLabel="Tambah Durasi"
                      onAction={openCreate}
                    />
                  </td>
                </tr>
              )}

              {!loading &&
                items.map((item) => (
                  <tr key={item.id}>
                    <td className="text-text">{item.name}</td>
                    <td className="tabular">{formatNumber(item.days)} hari</td>
                    <td className="tabular">{formatNumber(item.credit_cost)} credit</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => toggle(item)}
                        disabled={togglingId === item.id}
                        className="cursor-pointer disabled:cursor-wait disabled:opacity-60"
                        aria-label={`${item.is_active ? "Nonaktifkan" : "Aktifkan"} durasi ${item.name}`}
                        title={item.is_active ? "Klik untuk menonaktifkan" : "Klik untuk mengaktifkan"}
                      >
                        <SimpleBadge tone={item.is_active ? "active" : "muted"}>
                          {item.is_active ? "Aktif" : "Nonaktif"}
                        </SimpleBadge>
                      </button>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" onClick={() => openEdit(item)} aria-label={`Edit durasi ${item.name}`}>
                          <PencilIcon size={16} strokeWidth={1.5} />
                        </Button>
                        <Button size="sm" onClick={() => setDeleteTarget(item)} aria-label={`Hapus durasi ${item.name}`}>
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

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Durasi" : "Tambah Durasi"}
        description="Reseller hanya bisa memakai preset yang aktif."
        busy={saving}
        onSubmit={submit}
        footer={
          <>
            <Button onClick={() => setOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button variant="primary" onClick={submit} loading={saving}>
              Simpan
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <FieldWrap label="Nama durasi" htmlFor="duration-name">
            <Input
              id="duration-name"
              value={form.name}
              placeholder="1 Bulan"
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </FieldWrap>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldWrap label="Jumlah hari" htmlFor="duration-days">
              <Input
                id="duration-days"
                type="number"
                min={1}
                max={3650}
                value={form.days}
                onChange={(event) => setForm((prev) => ({ ...prev, days: event.target.value }))}
                className="tabular"
              />
            </FieldWrap>

            <FieldWrap label="Harga credit" htmlFor="duration-cost" hint="0 = gratis untuk Reseller.">
              <Input
                id="duration-cost"
                type="number"
                min={0}
                value={form.credit_cost}
                onChange={(event) => setForm((prev) => ({ ...prev, credit_cost: event.target.value }))}
                className="tabular"
              />
            </FieldWrap>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-glass-border bg-white/[0.03] px-3 py-2">
            <span className="text-label text-muted">Durasi aktif</span>
            <Switch
              checked={form.is_active}
              onChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
              label={form.is_active ? "Aktif" : "Nonaktif"}
            />
          </div>

          {error && (
            <p className="text-label text-banned" role="alert">
              {error}
            </p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus durasi?"
        message={`Preset "${deleteTarget?.name ?? ""}" akan dihapus. Key yang sudah dibuat tidak terpengaruh.`}
        confirmLabel="Hapus"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
