"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DownloadIcon, RefreshIcon, WalletIcon } from "@/components/icons";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { apiFetch } from "@/lib/api/client";
import { formatDateTime, formatNumber } from "@/lib/utils/format";
import type { CreditLog, Paginated, Profile, Role } from "@/lib/utils/types";

const ACTION_OPTIONS = [
  { value: "", label: "Semua aksi" },
  { value: "topup", label: "Topup" },
  { value: "generate", label: "Generate" },
];

export function CreditLogView({ role }: { role: Role }) {
  const { toast } = useToast();
  const isOwner = role === "owner";

  const [rows, setRows] = useState<CreditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [resellerId, setResellerId] = useState("");
  const [resellers, setResellers] = useState<Profile[]>([]);

  const perPage = 15;

  const buildParams = useCallback(
    (targetPage: number) => {
      const params = new URLSearchParams({
        page: String(targetPage),
        per_page: String(perPage),
      });
      if (action) params.set("action", action);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (resellerId && isOwner) params.set("reseller", resellerId);
      return params;
    },
    [action, from, to, resellerId, isOwner]
  );

  // Samakan dengan KeysView: respons request lama tidak menimpa filter baru.
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = (loadSeq.current += 1);
    setLoading(true);
    try {
      const result = await apiFetch<Paginated<CreditLog>>(`/api/credits?${buildParams(page).toString()}`);
      if (seq !== loadSeq.current) return;
      setRows(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (error) {
      if (seq !== loadSeq.current) return;
      toast(error instanceof Error ? error.message : "Gagal memuat credit log.", "error");
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [buildParams, page, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isOwner) return;
    async function loadResellers() {
      try {
        const { data } = await apiFetch<{ data: Profile[] }>("/api/resellers");
        setResellers(data);
      } catch {
        setResellers([]);
      }
    }
    void loadResellers();
  }, [isOwner]);

  async function exportCsv() {
    // Cegah klik berulang memicu beberapa unduhan/file yang sama.
    if (exporting) return;
    setExporting(true);
    try {
      // Ambil semua baris sesuai filter untuk file CSV.
      const params = buildParams(1);
      params.set("per_page", "100");
      const first = await apiFetch<Paginated<CreditLog>>(`/api/credits?${params.toString()}`);

      let all = [...first.data];
      // Ambil SEMUA halaman sesuai filter — batas 20 halaman lama memotong
      // file secara diam-diam di 2.000 baris tanpa memberi tahu user.
      for (let p = 2; p <= first.totalPages; p += 1) {
        const nextParams = buildParams(p);
        nextParams.set("per_page", "100");
        const res = await apiFetch<Paginated<CreditLog>>(`/api/credits?${nextParams.toString()}`);
        all = [...all, ...res.data];
      }

      const header = ["Tanggal", "Reseller", "Aksi", "Jumlah", "Saldo Setelah", "Catatan"];
      const lines = all.map((log) => [
        formatDateTime(log.created_at),
        log.user?.username ?? "-",
        log.action,
        String(log.amount),
        String(log.balance_after),
        log.note ?? "",
      ]);

      const csv = [header, ...lines]
        .map((cols) => cols.map((col) => `"${col.replace(/"/g, '""')}"`).join(","))
        .join("\r\n");

      const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `xloop-credit-log-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast("CSV diunduh.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal export CSV.", "error");
    } finally {
      setExporting(false);
    }
  }

  function resetFilter<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  return (
    <div>
      <PageHeader
        title="Credit Log"
        description={isOwner ? "Semua transaksi credit reseller." : "Riwayat credit kamu."}
        action={
          <Button onClick={exportCsv} loading={exporting} icon={<DownloadIcon size={16} strokeWidth={1.5} />}>
            Export CSV
          </Button>
        }
      />

      <div className="glass mb-4 flex flex-wrap items-center gap-2 rounded-card p-3">
        <Select
          value={action}
          onChange={resetFilter(setAction)}
          options={ACTION_OPTIONS}
          className="w-[150px]"
          ariaLabel="Filter aksi"
        />

        {isOwner && (
          <Select
            value={resellerId}
            onChange={resetFilter(setResellerId)}
            options={[
              { value: "", label: "Semua reseller" },
              ...resellers.map((reseller) => ({ value: reseller.id, label: reseller.username })),
            ]}
            className="w-[170px]"
            ariaLabel="Filter reseller"
          />
        )}

        {/* flex-wrap: pasangan tanggal tetap rapi di layar sempit,
            sebelumnya mengoverflow keluar toolbar. */}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => resetFilter(setFrom)(event.target.value)}
            aria-label="Dari tanggal"
            className="w-[150px] max-w-full text-label"
          />
          <span className="text-label text-muted">s/d</span>
          <Input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => resetFilter(setTo)(event.target.value)}
            aria-label="Sampai tanggal"
            className="w-[150px] max-w-full text-label"
          />
        </div>

        <Button onClick={load} loading={loading} aria-label="Muat ulang" icon={<RefreshIcon size={16} strokeWidth={1.5} />} />
      </div>

      <div className="glass-table overflow-hidden rounded-card">
        <div className="overflow-x-auto scroll-area">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                {isOwner && <th>Reseller</th>}
                <th>Aksi</th>
                <th>Jumlah</th>
                <th>Saldo setelah</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={isOwner ? 6 : 5}>
                    <div className="flex flex-col gap-2 py-4">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <Skeleton key={index} className="h-6 w-full" />
                      ))}
                    </div>
                  </td>
                </tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={isOwner ? 6 : 5}>
                    <EmptyState
                      message={action || from || to || resellerId ? "Tidak ada transaksi yang cocok" : "Belum ada transaksi credit"}
                      hint={
                        action || from || to || resellerId
                          ? "Coba longgarkan filter aksi, tanggal, atau resellernya."
                          : "Topup dan pemakaian credit untuk generate key akan tercatat di sini."
                      }
                      icon={<WalletIcon size={20} strokeWidth={1.5} />}
                    />
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((log) => (
                  <tr key={log.id}>
                    <td className="text-muted">{formatDateTime(log.created_at)}</td>
                    {isOwner && <td className="text-text">{log.user?.username ?? "-"}</td>}
                    <td className="text-text">{log.action === "topup" ? "Topup" : "Generate"}</td>
                    <td className={`tabular ${log.amount < 0 ? "text-banned" : "text-active"}`}>
                      {log.amount > 0 ? "+" : ""}
                      {formatNumber(log.amount)}
                    </td>
                    <td className="tabular text-text">{formatNumber(log.balance_after)}</td>
                    <td className="max-w-[280px] truncate text-muted">{log.note ?? "-"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} total={total} perPage={perPage} onPageChange={setPage} />
    </div>
  );
}
