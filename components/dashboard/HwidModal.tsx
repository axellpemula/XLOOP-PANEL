"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ResetIcon, TrashIcon } from "@/components/icons";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { apiFetch } from "@/lib/api/client";
import { effectiveStatus } from "@/lib/utils/status";
import { formatDateTime, formatNumber } from "@/lib/utils/format";
import type { DeviceLog, LicenseKey } from "@/lib/utils/types";

interface HwidModalProps {
  licenseKey: LicenseKey | null;
  onClose: () => void;
  onChanged: () => void;
}

export function HwidModal({ licenseKey, onClose, onChanged }: HwidModalProps) {
  const { toast } = useToast();
  const [devices, setDevices] = useState<DeviceLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetTarget, setResetTarget] = useState<DeviceLog | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);

  // Guard urutan request: membuka key B selagi device key A masih dimuat
  // tidak boleh membuat daftar device A tampil di modal B.
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    if (!licenseKey) return;
    const seq = (loadSeq.current += 1);
    setLoading(true);
    try {
      const result = await apiFetch<{ devices: DeviceLog[] }>(`/api/keys/${licenseKey.id}/devices`);
      if (seq !== loadSeq.current) return;
      setDevices(result.devices);
    } catch (error) {
      if (seq !== loadSeq.current) return;
      toast(error instanceof Error ? error.message : "Gagal memuat device.", "error");
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [licenseKey, toast]);

  useEffect(() => {
    if (licenseKey) {
      setDevices([]);
      void load();
    }
  }, [licenseKey, load]);

  async function resetOne() {
    if (!licenseKey || !resetTarget) return;
    setBusy(true);
    try {
      await apiFetch(`/api/keys/${licenseKey.id}/devices/${resetTarget.id}`, { method: "DELETE" });
      toast("HWID direset.", "success");
      setResetTarget(null);
      await load();
      onChanged();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal reset HWID.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function resetAll() {
    if (!licenseKey) return;
    setBusy(true);
    try {
      await apiFetch(`/api/keys/${licenseKey.id}/devices`, { method: "DELETE" });
      toast("Semua HWID direset.", "success");
      setConfirmAll(false);
      await load();
      onChanged();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal reset HWID.", "error");
    } finally {
      setBusy(false);
    }
  }

  const used = devices.length;
  const max = licenseKey?.max_device ?? 0;

  return (
    <>
      <Modal
        open={licenseKey !== null}
        onClose={onClose}
        title="Detail Key"
        description={licenseKey?.key_value}
        size="lg"
        footer={
          <>
            <Button onClick={onClose}>Tutup</Button>
            <Button
              variant="primary"
              onClick={() => setConfirmAll(true)}
              disabled={devices.length === 0}
              icon={<ResetIcon size={16} strokeWidth={1.5} />}
            >
              Reset Semua HWID
            </Button>
          </>
        }
      >
        {licenseKey && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-glass-border bg-white/[0.03] p-3">
                <p className="text-label text-muted">Key</p>
                <div className="mt-1 flex items-center gap-1">
                  <span className="min-w-0 break-all font-mono text-label text-text">{licenseKey.key_value}</span>
                  <CopyButton value={licenseKey.key_value} label="Salin key" toastMessage="Key disalin" />
                </div>
              </div>

              <div className="rounded-lg border border-glass-border bg-white/[0.03] p-3">
                <p className="text-label text-muted">Status</p>
                <div className="mt-1.5">
                  <StatusBadge status={effectiveStatus(licenseKey.status, licenseKey.expired_at)} />
                </div>
              </div>

              <div className="rounded-lg border border-glass-border bg-white/[0.03] p-3">
                <p className="text-label text-muted">Tool / Version</p>
                <p className="mt-1 text-body text-text">
                  {licenseKey.tool_type?.name ?? "-"}{" "}
                  <span className="font-mono text-label text-muted">{licenseKey.tool_version?.name ?? ""}</span>
                </p>
              </div>

              <div className="rounded-lg border border-glass-border bg-white/[0.03] p-3">
                <p className="text-label text-muted">Expired</p>
                <p className="mt-1 text-body text-text">
                  {licenseKey.expired_at ? formatDateTime(licenseKey.expired_at) : "Lifetime"}
                </p>
              </div>

              <div className="rounded-lg border border-glass-border bg-white/[0.03] p-3">
                <p className="text-label text-muted">Dibuat</p>
                <p className="mt-1 text-body text-text">{formatDateTime(licenseKey.created_at)}</p>
              </div>

              <div className="rounded-lg border border-glass-border bg-white/[0.03] p-3">
                <p className="text-label text-muted">Terakhir dipakai</p>
                <p className="mt-1 text-body text-text">
                  {licenseKey.last_used ? formatDateTime(licenseKey.last_used) : "Belum pernah"}
                </p>
              </div>
            </div>

            {licenseKey.note && (
              <div className="rounded-lg border border-glass-border bg-white/[0.03] p-3">
                <p className="text-label text-muted">Catatan</p>
                <p className="mt-1 text-body text-text">{licenseKey.note}</p>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-body font-medium text-text">HWID Terdaftar</h3>
                <span className="text-label text-muted tabular">
                  {formatNumber(used)} dari {formatNumber(max)} slot device terpakai
                </span>
              </div>

              <div className="overflow-x-auto scroll-area rounded-lg border border-glass-border">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="w-12">No</th>
                      <th>HWID</th>
                      <th>Pertama dipakai</th>
                      <th>Terakhir dipakai</th>
                      <th className="text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr>
                        <td colSpan={5}>
                          <Skeleton className="my-3 h-6 w-full" />
                        </td>
                      </tr>
                    )}

                    {!loading && devices.length === 0 && (
                      <tr>
                        <td colSpan={5}>
                          <p className="py-6 text-center text-body text-muted">Belum ada device terdaftar</p>
                        </td>
                      </tr>
                    )}

                    {!loading &&
                      devices.map((device, index) => (
                        <tr key={device.id}>
                          <td className="tabular text-muted">{index + 1}</td>
                          <td>
                            <div className="flex items-center gap-1">
                              <span className="min-w-0 break-all font-mono text-label text-text">{device.hardware_id}</span>
                              <CopyButton value={device.hardware_id} label="Salin HWID" toastMessage="HWID disalin" />
                            </div>
                          </td>
                          <td className="text-muted">{formatDateTime(device.first_seen)}</td>
                          <td className="text-muted">{formatDateTime(device.last_seen)}</td>
                          <td>
                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                onClick={() => setResetTarget(device)}
                                aria-label={`Reset HWID ${device.hardware_id}`}
                                title="Reset"
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
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={resetTarget !== null}
        title="Reset HWID?"
        message={`Device ${resetTarget?.hardware_id ?? ""} akan dilepas dari slot key ini. Device itu harus validasi ulang.`}
        confirmLabel="Reset"
        destructive
        loading={busy}
        onConfirm={resetOne}
        onClose={() => setResetTarget(null)}
      />

      <ConfirmDialog
        open={confirmAll}
        title="Reset semua HWID?"
        message="Semua slot device di key ini akan dikosongkan. Tool perlu validasi ulang dari awal."
        confirmLabel="Reset semua"
        destructive
        loading={busy}
        onConfirm={resetAll}
        onClose={() => setConfirmAll(false)}
      />
    </>
  );
}
