"use client";

import { useEffect } from "react";
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
  const safeTotalPages = Math.max(totalPages, 1);
  // Halaman bisa melebihi total setelah data terhapus/difilter — tampilkan
  // rentang yang masuk akal ("21–20 dari 20" sebelumnya bisa muncul) dan
  // minta parent pindah ke halaman terakhir yang valid.
  const safePage = Math.min(Math.max(page, 1), safeTotalPages);
  const from = total === 0 ? 0 : (safePage - 1) * perPage + 1;
  const to = Math.min(safePage * perPage, total);

  useEffect(() => {
    if (page > safeTotalPages) onPageChange(safeTotalPages);
    else if (page < 1) onPageChange(1);
  }, [page, safeTotalPages, onPageChange]);

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
      <p className="text-label text-muted">
        {total === 0 ? "Tidak ada data" : `${formatNumber(from)}–${formatNumber(to)} dari ${formatNumber(total)}`}
      </p>
      <div className="flex items-center gap-1.5">
        <Button size="sm" onClick={() => onPageChange(safePage - 1)} disabled={safePage <= 1} aria-label="Halaman sebelumnya">
          <ChevronLeftIcon size={16} strokeWidth={1.5} />
        </Button>
        <span className="px-2 text-label text-muted tabular">
          {safePage} / {safeTotalPages}
        </span>
        <Button
          size="sm"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= safeTotalPages}
          aria-label="Halaman berikutnya"
        >
          <ChevronRightIcon size={16} strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
}
