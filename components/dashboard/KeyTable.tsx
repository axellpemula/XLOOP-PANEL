"use client";

import { BanIcon, PencilIcon, ResetIcon, TrashIcon } from "@/components/icons";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Reveal } from "@/components/ui/Reveal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { effectiveStatus } from "@/lib/utils/status";
import { formatDateTime, formatNumber } from "@/lib/utils/format";
import type { LicenseKey, Role } from "@/lib/utils/types";

export type KeySortField = "created_at" | "expired_at" | "status";

interface KeyTableProps {
  keys: LicenseKey[];
  role: Role;
  loading?: boolean;
  sort: KeySortField;
  order: "asc" | "desc";
  onSortChange: (field: KeySortField) => void;
  onDetail: (key: LicenseKey) => void;
  onEdit: (key: LicenseKey) => void;
  onToggleBan: (key: LicenseKey) => void;
  onDelete: (key: LicenseKey) => void;
  onCreate?: () => void;
}

function SortHeader({
  label,
  field,
  sort,
  order,
  onSortChange,
  className,
}: {
  label: string;
  field: KeySortField;
  sort: KeySortField;
  order: "asc" | "desc";
  onSortChange: (field: KeySortField) => void;
  className?: string;
}) {
  const active = sort === field;
  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSortChange(field)}
        className="inline-flex items-center gap-1 transition-colors duration-150 hover:text-text"
        aria-label={`Urutkan ${label}`}
      >
        {label}
        <span className={active ? "text-accent" : "text-muted/50"} aria-hidden>
          {active && order === "asc" ? "↑" : "↓"}
        </span>
      </button>
    </th>
  );
}

export function KeyTable({
  keys,
  role,
  loading,
  sort,
  order,
  onSortChange,
  onDetail,
  onEdit,
  onToggleBan,
  onDelete,
  onCreate,
}: KeyTableProps) {
  const isOwner = role === "owner";
  const columns = isOwner ? 10 : 9;

  return (
    <div className="glass-table overflow-hidden rounded-card">
      <div className="max-h-[calc(100dvh-300px)] min-h-[240px] overflow-auto scroll-area">
        <table className="data-table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Tool</th>
              <th>Version</th>
              <SortHeader label="Status" field="status" sort={sort} order={order} onSortChange={onSortChange} />
              <th>Durasi</th>
              <SortHeader label="Expired" field="expired_at" sort={sort} order={order} onSortChange={onSortChange} />
              <th>Device</th>
              {isOwner && <th>Dibuat oleh</th>}
              <SortHeader label="Dibuat" field="created_at" sort={sort} order={order} onSortChange={onSortChange} />
              <th className="text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={columns}>
                  <div className="flex flex-col gap-2 py-4">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Skeleton key={index} className="h-6 w-full" />
                    ))}
                  </div>
                </td>
              </tr>
            )}

            {!loading && keys.length === 0 && (
              <tr>
                <td colSpan={columns}>
                  <EmptyState
                    message="Belum ada key"
                    actionLabel={onCreate ? "Buat Key" : undefined}
                    onAction={onCreate}
                  />
                </td>
              </tr>
            )}

            {!loading &&
              keys.map((key, index) => {
                const status = effectiveStatus(key.status, key.expired_at);
                const deviceLabel = `${key.device_count ?? 0}/${key.max_device}`;

                const cells = (
                  <>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onDetail(key)}
                          className="font-mono text-label text-text transition-colors duration-150 hover:text-accent"
                        >
                          {key.key_value}
                        </button>
                        <CopyButton value={key.key_value} label="Salin key" toastMessage="Key disalin" />
                      </div>
                    </td>
                    <td className="text-text">{key.tool_type?.name ?? "-"}</td>
                    <td className="font-mono text-label text-muted">{key.tool_version?.name ?? "-"}</td>
                    <td>
                      <StatusBadge status={status} />
                    </td>
                    <td className="tabular text-muted">
                      {key.duration_days === null ? "Lifetime" : `${formatNumber(key.duration_days)} hari`}
                    </td>
                    <td className="text-muted">
                      {key.expired_at ? formatDateTime(key.expired_at) : "Lifetime"}
                    </td>
                    <td className="tabular text-muted">{deviceLabel}</td>
                    {isOwner && <td className="text-muted">{key.creator?.username ?? "-"}</td>}
                    <td className="text-muted">{formatDateTime(key.created_at)}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            onEdit(key);
                          }}
                          aria-label="Edit key"
                          title="Edit"
                        >
                          <PencilIcon size={16} strokeWidth={1.5} />
                        </Button>
                        <Button
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            onToggleBan(key);
                          }}
                          aria-label={key.status === "banned" ? "Unban key" : "Ban key"}
                          title={key.status === "banned" ? "Unban" : "Ban"}
                        >
                          <BanIcon size={16} strokeWidth={1.5} className={key.status === "banned" ? "text-banned" : ""} />
                        </Button>
                        <Button
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDetail(key);
                          }}
                          aria-label="Reset HWID"
                          title="HWID"
                        >
                          <ResetIcon size={16} strokeWidth={1.5} />
                        </Button>
                        <Button
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDelete(key);
                          }}
                          aria-label="Hapus key"
                          title="Hapus"
                        >
                          <TrashIcon size={16} strokeWidth={1.5} />
                        </Button>
                      </div>
                    </td>
                  </>
                );

                // Stagger hanya 15 baris pertama.
                if (index < 15) {
                  return (
                    <Reveal as="tr" key={key.id} index={index} className="cursor-pointer" onClick={() => onDetail(key)}>
                      {cells}
                    </Reveal>
                  );
                }

                return (
                  <tr key={key.id} className="cursor-pointer" onClick={() => onDetail(key)}>
                    {cells}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
