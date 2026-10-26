"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { Button } from "./Button";
import { formatNumber } from "@/lib/utils/format";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, perPage, onPageChange }: PaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
      <p className="text-label text-muted">
        {total === 0 ? "Tidak ada data" : `${formatNumber(from)}–${formatNumber(to)} dari ${formatNumber(total)}`}
      </p>
      <div className="flex items-center gap-1.5">
        <Button size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Halaman sebelumnya">
          <ChevronLeftIcon size={16} strokeWidth={1.5} />
        </Button>
        <span className="px-2 text-label text-muted tabular">
          {page} / {Math.max(totalPages, 1)}
        </span>
        <Button
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Halaman berikutnya"
        >
          <ChevronRightIcon size={16} strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
}
