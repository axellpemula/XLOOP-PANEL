"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, RefreshIcon, SearchIcon } from "@/components/icons";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { KeyTable, type KeySortField } from "./KeyTable";
import { HwidModal } from "./HwidModal";
import { KeyEditModal } from "./KeyEditModal";
import { apiFetch } from "@/lib/api/client";
import type {
  DurationPreset,
  LicenseKey,
  Paginated,
  Profile,
  Role,
  ToolType,
} from "@/lib/utils/types";

interface KeysViewProps {
  role: Role;
  credit: number;
  /** Diisi command palette lewat query ?search=… */
  initialSearch?: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "Semua status" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "banned", label: "Banned" },
];

const SORT_OPTIONS = [
  { value: "created_at:desc", label: "Terbaru dibuat" },
  { value: "created_at:asc", label: "Terlama dibuat" },
  { value: "expired_at:asc", label: "Expired terdekat" },
  { value: "expired_at:desc", label: "Expired terjauh" },
  { value: "status:asc", label: "Status A–Z" },
];

export function KeysView({ role, credit, initialSearch = "" }: KeysViewProps) {
  const { toast } = useToast();
  const router = useRouter();
  const isOwner = role === "owner";

  const [rows, setRows] = useState<LicenseKey[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch.trim());
  const [status, setStatus] = useState("");
  const [toolId, setToolId] = useState("");
  const [versionId, setVersionId] = useState("");
  const [resellerId, setResellerId] = useState("");
  const [sortValue, setSortValue] = useState("created_at:desc");

  const [tools, setTools] = useState<ToolType[]>([]);
  const [presets, setPresets] = useState<DurationPreset[]>([]);
  const [resellers, setResellers] = useState<Profile[]>([]);
  const [currentCredit, setCurrentCredit] = useState(credit);

  const [detailKey, setDetailKey] = useState<LicenseKey | null>(null);
  const [editKey, setEditKey] = useState<LicenseKey | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LicenseKey | null>(null);
  const [deleting, setDeleting] = useState(false);

  const perPage = 10;

  // Query dari URL bisa berubah saat halaman sudah terbuka (mis. Ctrl+K
  // dipakai lagi dari Key List) — sinkronkan ke state pencarian.
  useEffect(() => {
    const next = initialSearch.trim();
    setSearch(next);
    setDebouncedSearch(next);
    setPage(1);
  }, [initialSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  // Nomor urut request: respons lama yang datang belakangan (koneksi lambat,
  // filter diganti cepat) tidak boleh menimpa hasil filter terbaru.
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = (loadSeq.current += 1);
    setLoading(true);
    try {
      const [sort, order] = sortValue.split(":");
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
        sort,
        order,
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (status) params.set("status", status);
      if (toolId) params.set("tool", toolId);
      if (versionId) params.set("version", versionId);
      if (resellerId && isOwner) params.set("reseller", resellerId);

      const result = await apiFetch<Paginated<LicenseKey>>(`/api/keys?${params.toString()}`);
      if (seq !== loadSeq.current) return;
      setRows(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (error) {
      if (seq !== loadSeq.current) return;
      toast(error instanceof Error ? error.message : "Gagal memuat key.", "error");
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [page, perPage, debouncedSearch, status, toolId, versionId, resellerId, sortValue, isOwner, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    async function loadMeta() {
      try {
        const [{ data: toolList }, { data: presetList }] = await Promise.all([
          apiFetch<{ data: ToolType[] }>("/api/tools"),
          apiFetch<{ data: DurationPreset[] }>("/api/durations"),
        ]);
        setTools(toolList);
        setPresets(presetList.filter((preset) => preset.is_active));
      } catch {
        // Filter opsional — kegagalan di sini tidak menghalangi tabel.
      }

      if (isOwner) {
        try {
          const { data } = await apiFetch<{ data: Profile[] }>("/api/resellers");
          setResellers(data);
        } catch {
          setResellers([]);
        }
      }
    }
    void loadMeta();
  }, [isOwner]);

  const versionOptions = useMemo(() => {
    const tool = tools.find((item) => item.id === toolId);
    return (tool?.tool_versions ?? []).map((version) => ({ value: version.id, label: version.name }));
  }, [tools, toolId]);

  function resetPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  async function toggleBan(key: LicenseKey) {
    const isBanned = key.status === "banned";
    try {
      await apiFetch(`/api/keys/${key.id}/${isBanned ? "unban" : "ban"}`, { method: "PUT" });
      toast(isBanned ? "Key di-unban." : "Key dibanned.", "success");
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal mengubah status.", "error");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/keys/${deleteTarget.id}`, { method: "DELETE" });
      toast("Key dihapus.", "success");
      setDeleteTarget(null);
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal menghapus key.", "error");
    } finally {
      setDeleting(false);
    }
  }

  function onSortChange(field: KeySortField) {
    const [currentField, currentOrder] = sortValue.split(":");
    const nextOrder = currentField === field && currentOrder === "desc" ? "asc" : "desc";
    setSortValue(`${field}:${nextOrder}`);
    setPage(1);
  }

  const [sortField, sortOrder] = sortValue.split(":") as [KeySortField, "asc" | "desc"];

  /** Ambil ulang saldo credit (reseller) setelah transaksi perpanjangan. */
  async function refreshCredit() {
    try {
      const me = await apiFetch<{ user: { credit: number } }>("/api/me");
      setCurrentCredit(me.user.credit);
    } catch {
      // Biarkan angka lama kalau gagal — tidak menghalangi aksi.
    }
  }

  return (
    <div>
      <PageHeader
        title="Key List"
        description={isOwner ? "Semua key dari seluruh reseller." : "Key milik kamu."}
        action={
          <Button
            variant="primary"
            onClick={() => router.push("/generate")}
            icon={<PlusIcon size={16} strokeWidth={1.5} />}
          >
            Buat Key
          </Button>
        }
      />

      {/* Toolbar filter */}
      <div className="glass mb-4 flex flex-wrap items-center gap-2 rounded-card p-3">
        <div className="relative min-w-[180px] flex-1">
          <SearchIcon
            size={16}
            strokeWidth={1.5}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <Input
            value={search}
            onChange={(event) => resetPage(setSearch)(event.target.value)}
            placeholder="Cari key…"
            className="pl-9 font-mono text-label uppercase placeholder:normal-case"
            aria-label="Cari key"
          />
        </div>

        <Select
          value={status}
          onChange={resetPage(setStatus)}
          options={STATUS_OPTIONS}
          className="w-[150px]"
          ariaLabel="Filter status"
        />

        <Select
          value={toolId}
          onChange={(value) => {
            setToolId(value);
            setVersionId("");
            setPage(1);
          }}
          options={[{ value: "", label: "Semua tool" }, ...tools.map((tool) => ({ value: tool.id, label: tool.name }))]}
          className="w-[160px]"
          ariaLabel="Filter tool"
        />

        <Select
          value={versionId}
          onChange={resetPage(setVersionId)}
          options={[{ value: "", label: "Semua version" }, ...versionOptions]}
          className="w-[150px]"
          disabled={!toolId}
          ariaLabel="Filter version"
        />

        {isOwner && (
          <Select
            value={resellerId}
            onChange={resetPage(setResellerId)}
            options={[
              { value: "", label: "Semua reseller" },
              ...resellers.map((reseller) => ({ value: reseller.id, label: reseller.username })),
            ]}
            className="w-[170px]"
            ariaLabel="Filter reseller"
          />
        )}

        <Select
          value={sortValue}
          onChange={(value) => {
            setSortValue(value);
            setPage(1);
          }}
          options={SORT_OPTIONS}
          className="w-[180px]"
          ariaLabel="Urutkan"
        />

        <Button onClick={load} loading={loading} aria-label="Muat ulang">
          <RefreshIcon size={16} strokeWidth={1.5} />
        </Button>
      </div>

      <KeyTable
        keys={rows}
        role={role}
        loading={loading}
        sort={sortField}
        order={sortOrder}
        onSortChange={onSortChange}
        onDetail={setDetailKey}
        onEdit={setEditKey}
        onToggleBan={toggleBan}
        onDelete={setDeleteTarget}
        onCreate={() => router.push("/generate")}
        filtered={Boolean(search || status || toolId || versionId || resellerId)}
        onClearFilters={() => {
          setSearch("");
          setDebouncedSearch("");
          setStatus("");
          setToolId("");
          setVersionId("");
          setResellerId("");
          setPage(1);
        }}
      />

      <Pagination page={page} totalPages={totalPages} total={total} perPage={perPage} onPageChange={setPage} />

      <HwidModal
        licenseKey={detailKey}
        onClose={() => setDetailKey(null)}
        onChanged={() => void load()}
      />

      <KeyEditModal
        licenseKey={editKey}
        role={role}
        credit={currentCredit}
        presets={presets}
        onClose={() => setEditKey(null)}
        onSaved={() => {
          void load();
          void refreshCredit();
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus key?"
        message={`Key ${deleteTarget?.key_value ?? ""} akan dihapus permanen beserta semua HWID terdaftarnya.`}
        confirmLabel="Hapus"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
