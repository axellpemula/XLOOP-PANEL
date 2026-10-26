"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  EyeIcon,
  EyeOffIcon,
  KeyIcon,
  LockIcon,
  PencilIcon,
  PlusIcon,
  ShieldIcon,
  ToolsIcon,
  TrashIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils/cn";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { FieldWrap, Input, Textarea } from "@/components/ui/Field";
import { GlassCard } from "@/components/ui/GlassCard";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Switch } from "@/components/ui/Switch";
import { SimpleBadge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { apiFetch } from "@/lib/api/client";
import { slugify, formatNumber } from "@/lib/utils/format";
import type { ToolType, ToolVersion } from "@/lib/utils/types";

interface ToolFormState {
  name: string;
  slug: string;
  is_active: boolean;
  secret: string;
}

const EMPTY_FORM: ToolFormState = { name: "", slug: "", is_active: true, secret: "" };

export function ToolManager({ publicKey }: { publicKey: string | null }) {
  const { toast } = useToast();
  const [tools, setTools] = useState<ToolType[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [publicKeyOpen, setPublicKeyOpen] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ToolType | null>(null);
  const [form, setForm] = useState<ToolFormState>(EMPTY_FORM);
  const [replaceSecret, setReplaceSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ToolType | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [versionFormTool, setVersionFormTool] = useState<ToolType | null>(null);
  const [versionName, setVersionName] = useState("");
  const [versionEditing, setVersionEditing] = useState<ToolVersion | null>(null);
  const [versionSaving, setVersionSaving] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);
  const [versionDelete, setVersionDelete] = useState<{ tool: ToolType; version: ToolVersion } | null>(null);
  const [versionDeleting, setVersionDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiFetch<{ data: ToolType[] }>("/api/tools");
      setTools(result.data);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal memuat tool.", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setReplaceSecret(false);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(tool: ToolType) {
    setEditing(tool);
    setForm({ name: tool.name, slug: tool.slug, is_active: tool.is_active, secret: "" });
    setReplaceSecret(false);
    setFormError(null);
    setFormOpen(true);
  }

  async function submitTool() {
    setFormError(null);

    if (form.name.trim().length < 2) {
      setFormError("Nama tool minimal 2 karakter.");
      return;
    }

    const slug = slugify(form.slug || form.name);
    if (slug.length < 2) {
      setFormError("Slug tidak valid.");
      return;
    }

    setSaving(true);
    try {
      let toolId = editing?.id ?? null;

      if (editing) {
        await apiFetch(`/api/tools/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify({ name: form.name.trim(), slug, is_active: form.is_active }),
        });
      } else {
        const created = await apiFetch<{ tool: ToolType }>("/api/tools", {
          method: "POST",
          body: JSON.stringify({ name: form.name.trim(), slug, is_active: form.is_active }),
        });
        toolId = created.tool.id;
      }

      if (toolId && form.secret.trim()) {
        await apiFetch(`/api/tools/${toolId}/secret`, {
          method: "PUT",
          body: JSON.stringify({ secret_payload: form.secret }),
        });
      }

      toast(editing ? "Tool diperbarui." : "Tool ditambahkan.", "success");
      setFormOpen(false);
      await load();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Gagal menyimpan tool.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTool(tool: ToolType) {
    const nextActive = !tool.is_active;
    // Klik ganda: payload sama terkirim 2x, state lokal terbalik 2x → UI != server.
    if (togglingId === tool.id) return;
    setTogglingId(tool.id);
    try {
      await apiFetch(`/api/tools/${tool.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: nextActive }),
      });
      setTools((prev) => prev.map((item) => (item.id === tool.id ? { ...item, is_active: nextActive } : item)));
      toast(nextActive ? "Tool diaktifkan." : "Tool dinonaktifkan.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal mengubah status.", "error");
    } finally {
      setTogglingId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/tools/${deleteTarget.id}`, { method: "DELETE" });
      toast("Tool dihapus.", "success");
      setDeleteTarget(null);
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal menghapus tool.", "error");
    } finally {
      setDeleting(false);
    }
  }

  function openVersionForm(tool: ToolType, version?: ToolVersion) {
    setVersionFormTool(tool);
    setVersionEditing(version ?? null);
    setVersionName(version?.name ?? "");
    setVersionError(null);
  }

  async function submitVersion() {
    if (!versionFormTool) return;
    if (versionName.trim().length < 1) {
      setVersionError("Nama version wajib diisi.");
      return;
    }

    setVersionSaving(true);
    try {
      if (versionEditing) {
        await apiFetch(`/api/tools/${versionFormTool.id}/versions/${versionEditing.id}`, {
          method: "PUT",
          body: JSON.stringify({ name: versionName.trim() }),
        });
        toast("Version diperbarui.", "success");
      } else {
        await apiFetch(`/api/tools/${versionFormTool.id}/versions`, {
          method: "POST",
          body: JSON.stringify({ name: versionName.trim() }),
        });
        toast("Version ditambahkan.", "success");
      }
      setVersionFormTool(null);
      await load();
    } catch (error) {
      setVersionError(error instanceof Error ? error.message : "Gagal menyimpan version.");
    } finally {
      setVersionSaving(false);
    }
  }

  async function toggleVersion(tool: ToolType, version: ToolVersion) {
    const nextActive = !version.is_active;
    if (togglingId === version.id) return;
    setTogglingId(version.id);
    try {
      await apiFetch(`/api/tools/${tool.id}/versions/${version.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: nextActive }),
      });
      await load();
      toast(nextActive ? "Version diaktifkan." : "Version dinonaktifkan.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal mengubah status.", "error");
    } finally {
      setTogglingId(null);
    }
  }

  async function confirmVersionDelete() {
    if (!versionDelete || versionDeleting) return;
    setVersionDeleting(true);
    try {
      await apiFetch(`/api/tools/${versionDelete.tool.id}/versions/${versionDelete.version.id}`, {
        method: "DELETE",
      });
      toast("Version dihapus.", "success");
      setVersionDelete(null);
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal menghapus version.", "error");
      setVersionDelete(null);
    } finally {
      setVersionDeleting(false);
    }
  }

  const secretLabel = editing?.has_secret && !replaceSecret;
  const normalizedPublicKey = publicKey?.replace(/\s+/g, " ").trim() ?? "";
  const publicKeyPreview =
    normalizedPublicKey.length > 48
      ? `${normalizedPublicKey.slice(0, 30)}…${normalizedPublicKey.slice(-14)}`
      : normalizedPublicKey;

  return (
    <div>
      <PageHeader
        title="Tool Management"
        description="Kelola tool, version, dan payload rahasia untuk validasi key."
        action={
          <Button variant="primary" onClick={openCreate} icon={<PlusIcon size={16} strokeWidth={1.5} />}>
            Tambah Tool
          </Button>
        }
      />

      <GlassCard className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent-soft text-accent">
              <ShieldIcon size={18} strokeWidth={1.5} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-body font-medium text-text">Public key verifikasi</h2>
                <SimpleBadge tone={publicKey ? "active" : "expired"}>{publicKey ? "Tersedia" : "Belum diset"}</SimpleBadge>
              </div>
              <p className="mt-0.5 text-label text-muted">Tanam di sisi tool untuk cek signature response. Detailnya disembunyikan agar halaman tetap ringkas.</p>
            </div>
          </div>

          {publicKey && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setPublicKeyOpen((prev) => !prev)}
                aria-expanded={publicKeyOpen}
                aria-controls="public-key-panel"
                icon={publicKeyOpen ? <EyeOffIcon size={15} strokeWidth={1.5} /> : <EyeIcon size={15} strokeWidth={1.5} />}
              >
                {publicKeyOpen ? "Sembunyikan" : "Tampilkan"}
                <ChevronDownIcon size={14} strokeWidth={1.5} className={cn("transition-transform duration-150", publicKeyOpen && "rotate-180")} />
              </Button>
              {/* Sembunyikan saat key belum diset: tombol lama menyalin string
                  kosong tapi tetap menampilkan toast "disalin". */}
              <CopyButton value={publicKey} label="Salin public key" toastMessage="Public key disalin" />
            </div>
          )}
        </div>

        {publicKey ? (
          publicKeyOpen ? (
            <pre
              id="public-key-panel"
              className="mt-3 max-h-40 overflow-auto scroll-area rounded-lg border border-glass-border bg-white/[0.04] p-3 font-mono text-[11px] leading-5 text-muted"
            >
              {publicKey}
            </pre>
          ) : (
            <p id="public-key-panel" className="mt-3 truncate rounded-lg border border-glass-border bg-white/[0.03] px-3 py-2 font-mono text-[11px] text-muted" aria-label="Pratinjau public key tersamar">
              {publicKeyPreview}
            </p>
          )
        ) : (
          <p className="mt-3 rounded-lg border border-expired/20 bg-expired-soft px-3 py-2 font-mono text-[11px] text-expired">
            LICENSE_SIGNING_PUBLIC_KEY belum diset di environment.
          </p>
        )}
      </GlassCard>

      <div className="glass-table overflow-hidden rounded-card">
        <div className="overflow-x-auto scroll-area">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-8" />
                <th>Tool</th>
                <th>Slug</th>
                <th>Version</th>
                <th>Key aktif</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col gap-2 py-4">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton key={index} className="h-6 w-full" />
                      ))}
                    </div>
                  </td>
                </tr>
              )}

              {!loading && tools.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      message="Belum ada tool"
                      hint="Buat tool pertama, tambahkan version, lalu generate key untuknya."
                      icon={<ToolsIcon size={20} strokeWidth={1.5} />}
                      steps={["Buat tool", "Tambah version", "Atur secret", "Generate key"]}
                      actionLabel="Tambah Tool"
                      onAction={openCreate}
                    />
                  </td>
                </tr>
              )}

              {!loading &&
                tools.map((tool) => {
                  const isOpen = expanded === tool.id;

                  return (
                    <Fragment key={tool.id}>
                      <tr>
                        <td>
                          <button
                            type="button"
                            onClick={() => setExpanded(isOpen ? null : tool.id)}
                            aria-label={isOpen ? "Tutup version" : "Lihat version"}
                            aria-expanded={isOpen}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/5 hover:text-text"
                          >
                            {isOpen ? (
                              <ChevronDownIcon size={16} strokeWidth={1.5} />
                            ) : (
                              <ChevronRightIcon size={16} strokeWidth={1.5} />
                            )}
                          </button>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="text-text">{tool.name}</span>
                            {tool.has_secret && <LockIcon size={12} strokeWidth={1.5} className="text-muted" />}
                          </div>
                        </td>
                        <td>
                          <span className="font-mono text-label text-muted">{tool.slug}</span>
                        </td>
                        <td className="tabular">{formatNumber(tool.version_count ?? 0)}</td>
                        <td className="tabular">{formatNumber(tool.active_key_count ?? 0)}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => toggleTool(tool)}
                            disabled={togglingId === tool.id}
                            className="cursor-pointer disabled:cursor-wait disabled:opacity-60"
                            aria-label={`${tool.is_active ? "Nonaktifkan" : "Aktifkan"} tool ${tool.name}`}
                            title={tool.is_active ? "Klik untuk menonaktifkan" : "Klik untuk mengaktifkan"}
                          >
                            <SimpleBadge tone={tool.is_active ? "active" : "muted"}>
                              {tool.is_active ? "Aktif" : "Nonaktif"}
                            </SimpleBadge>
                          </button>
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" onClick={() => openEdit(tool)} aria-label="Edit tool">
                              <PencilIcon size={16} strokeWidth={1.5} />
                            </Button>
                            <Button size="sm" onClick={() => setDeleteTarget(tool)} aria-label="Hapus tool">
                              <TrashIcon size={16} strokeWidth={1.5} />
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {isOpen && (
                        <tr key={`${tool.id}-versions`}>
                          <td colSpan={7} className="bg-white/[0.02] p-0">
                            <div className="px-4 py-4">
                              <div className="mb-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <KeyIcon size={16} strokeWidth={1.5} className="text-muted" />
                                  <h3 className="text-body font-medium text-text">Version {tool.name}</h3>
                                </div>
                                <Button size="sm" onClick={() => openVersionForm(tool)} icon={<PlusIcon size={16} strokeWidth={1.5} />}>
                                  Tambah Version
                                </Button>
                              </div>

                              <div className="overflow-x-auto scroll-area rounded-lg border border-glass-border">
                                <table className="data-table">
                                  <thead>
                                    <tr>
                                      <th>Nama version</th>
                                      <th>Key aktif</th>
                                      <th>Dibuat</th>
                                      <th>Status</th>
                                      <th className="text-right">Aksi</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(tool.tool_versions ?? []).length === 0 && (
                                      <tr>
                                        <td colSpan={5}>
                                          <p className="py-4 text-center text-body text-muted">Belum ada version</p>
                                        </td>
                                      </tr>
                                    )}
                                    {(tool.tool_versions ?? []).map((version) => (
                                      <tr key={version.id}>
                                        <td className="font-mono text-text">{version.name}</td>
                                        <td className="tabular">{formatNumber(version.active_key_count ?? 0)}</td>
                                        <td className="text-muted">
                                          {new Date(version.created_at).toLocaleDateString("id-ID", {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric",
                                          })}
                                        </td>
                                        <td>
                                          <button
                                            type="button"
                                            onClick={() => toggleVersion(tool, version)}
                                            disabled={togglingId === version.id}
                                            className="cursor-pointer disabled:cursor-wait disabled:opacity-60"
                                            aria-label={`${version.is_active ? "Nonaktifkan" : "Aktifkan"} version ${version.name}`}
                                            title={version.is_active ? "Klik untuk menonaktifkan" : "Klik untuk mengaktifkan"}
                                          >
                                            <SimpleBadge tone={version.is_active ? "active" : "muted"}>
                                              {version.is_active ? "Aktif" : "Nonaktif"}
                                            </SimpleBadge>
                                          </button>
                                        </td>
                                        <td>
                                          <div className="flex items-center justify-end gap-1">
                                            <Button
                                              size="sm"
                                              onClick={() => openVersionForm(tool, version)}
                                              aria-label="Edit version"
                                            >
                                              <PencilIcon size={16} strokeWidth={1.5} />
                                            </Button>
                                            <Button
                                              size="sm"
                                              onClick={() => setVersionDelete({ tool, version })}
                                              aria-label="Hapus version"
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
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal tool */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit Tool" : "Tambah Tool"}
        description="Slug dipakai tool untuk validasi."
        busy={saving}
        onSubmit={submitTool}
        footer={
          <>
            <Button onClick={() => setFormOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button variant="primary" onClick={submitTool} loading={saving}>
              Simpan
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <FieldWrap label="Nama tool" htmlFor="tool-name">
            <Input
              id="tool-name"
              value={form.name}
              placeholder="Perkakas"
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  name: event.target.value,
                  slug: editing ? prev.slug : slugify(event.target.value),
                }))
              }
            />
          </FieldWrap>

          <FieldWrap label="Slug" htmlFor="tool-slug" hint="Huruf kecil, angka, dan tanda hubung.">
            <Input
              id="tool-slug"
              value={form.slug}
              placeholder="perkakas"
              className="font-mono"
              onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
            />
          </FieldWrap>

          <div className="flex items-center justify-between rounded-lg border border-glass-border bg-white/[0.03] px-3 py-2">
            <span className="text-label text-muted">Tool aktif</span>
            <Switch
              checked={form.is_active}
              onChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
              label={form.is_active ? "Aktif" : "Nonaktif"}
            />
          </div>

          <FieldWrap
            label="Payload rahasia"
            htmlFor={secretLabel ? undefined : "tool-secret"}
            hint="Dikirim ke tool hanya saat validasi sukses. Tidak pernah dikirim balik ke browser."
          >
            {secretLabel ? (
              <div className="flex items-center justify-between rounded-lg border border-glass-border bg-white/[0.04] px-3 py-2">
                <span className="flex items-center gap-2 text-label text-active">
                  <LockIcon size={14} strokeWidth={1.5} /> Tersimpan
                </span>
                <Button size="sm" onClick={() => setReplaceSecret(true)}>
                  Ganti
                </Button>
              </div>
            ) : (
              <Textarea
                id="tool-secret"
                value={form.secret}
                placeholder="Isi payload rahasia tool…"
                className="font-mono text-label"
                onChange={(event) => setForm((prev) => ({ ...prev, secret: event.target.value }))}
              />
            )}
          </FieldWrap>

          {formError && <p className="text-label text-banned">{formError}</p>}
        </div>
      </Modal>

      {/* Modal version */}
      <Modal
        open={versionFormTool !== null}
        onClose={() => setVersionFormTool(null)}
        title={versionEditing ? "Edit Version" : "Tambah Version"}
        size="sm"
        busy={versionSaving}
        onSubmit={submitVersion}
        footer={
          <>
            <Button onClick={() => setVersionFormTool(null)} disabled={versionSaving}>
              Batal
            </Button>
            <Button variant="primary" onClick={submitVersion} loading={versionSaving}>
              Simpan
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <FieldWrap label="Nama version" htmlFor="version-name" hint='Contoh: "1.8.0" atau "v2.1 Beta".'>
            <Input
              id="version-name"
              value={versionName}
              className="font-mono"
              placeholder="1.8.0"
              onChange={(event) => setVersionName(event.target.value)}
            />
          </FieldWrap>
          {versionError && <p className="text-label text-banned">{versionError}</p>}
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus tool?"
        message={`Tool "${deleteTarget?.name ?? ""}" akan dihapus. Semua version terkait ikut terhapus dan key yang memakainya tidak bisa divalidasi.`}
        confirmLabel="Hapus"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={versionDelete !== null}
        title="Hapus version?"
        message={`Version "${versionDelete?.version.name ?? ""}" akan dihapus permanen.`}
        confirmLabel="Hapus"
        destructive
        loading={versionDeleting}
        onConfirm={confirmVersionDelete}
        onClose={() => setVersionDelete(null)}
      />
    </div>
  );
}
