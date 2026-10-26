"use client";

import { useEffect, useRef, useState } from "react";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FieldWrap, Input, Textarea } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { apiFetch } from "@/lib/api/client";
import { formatDateInputValue, formatDateTime, formatNumber } from "@/lib/utils/format";
import type { DurationPreset, LicenseKey, Role } from "@/lib/utils/types";

interface KeyEditModalProps {
  licenseKey: LicenseKey | null;
  role: Role;
  credit: number;
  presets: DurationPreset[];
  onClose: () => void;
  onSaved: () => void;
}

type Mode = "extend" | "set";

export function KeyEditModal({ licenseKey, role, credit, presets, onClose, onSaved }: KeyEditModalProps) {
  const { toast } = useToast();
  const isOwner = role === "owner";

  const [mode, setMode] = useState<Mode>("extend");
  const [days, setDays] = useState("30");
  const [newDate, setNewDate] = useState("");
  const [presetId, setPresetId] = useState("");
  const [note, setNote] = useState("");
  const [maxDevice, setMaxDevice] = useState("1");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openedKeyId = useRef<string | null>(null);

  useEffect(() => {
    if (!licenseKey) {
      openedKeyId.current = null;
      return;
    }
    // Reset form HANYA saat key yang dibuka berganti. Dependensi lama
    // [licenseKey, presets] ikut mereset catatan/durasi yang sedang diketik
    // setiap daftar preset selesai dimuat ulang di parent.
    if (openedKeyId.current === licenseKey.id) return;
    openedKeyId.current = licenseKey.id;
    setMode("extend");
    setDays("30");
    // Jangan slice string ISO mentah: itu tanggal UTC, sedangkan tanggal
    // yang dilihat user di panel adalah WIB — bisa beda satu hari.
    setNewDate(formatDateInputValue(licenseKey.expired_at));
    setPresetId(presets[0]?.id ?? "");
    setNote(licenseKey.note ?? "");
    setMaxDevice(String(licenseKey.max_device));
    setError(null);
    setConfirming(false);
  }, [licenseKey, presets]);

  const selectedPreset = presets.find((preset) => preset.id === presetId) ?? null;
  const presetCost = selectedPreset?.credit_cost ?? 0;
  const creditAfter = credit - presetCost;

  function validate(): boolean {
    if (isOwner) {
      if (mode === "extend") {
        const value = Number(days);
        if (!Number.isInteger(value) || value < 1 || value > 3650) {
          setError("Jumlah hari harus 1–3650.");
          return false;
        }
      } else if (!newDate) {
        setError("Tanggal expired wajib diisi.");
        return false;
      }
      const deviceValue = Number(maxDevice);
      if (!Number.isInteger(deviceValue) || deviceValue < 1 || deviceValue > 100) {
        setError("Max device harus 1–100.");
        return false;
      }
    } else {
      if (!presetId) {
        setError("Pilih preset durasi dulu.");
        return false;
      }
      if (presetCost > credit) {
        setError(`Credit tidak cukup (sisa ${credit}).`);
        return false;
      }
    }
    setError(null);
    return true;
  }

  async function save() {
    if (!licenseKey) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};

      if (isOwner) {
        body.mode = mode;
        if (mode === "extend") body.days = Number(days);
        else body.expired_at = new Date(`${newDate}T23:59:59+07:00`).toISOString();
        body.note = note;
        body.max_device = Number(maxDevice);
      } else {
        body.duration_preset_id = presetId;
        body.note = note;
      }

      await apiFetch(`/api/keys/${licenseKey.id}`, { method: "PUT", body: JSON.stringify(body) });
      toast("Key diperbarui.", "success");
      setConfirming(false);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan key.");
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  }

  const confirmMessage = isOwner
    ? mode === "extend"
      ? `Perpanjang key ${licenseKey?.key_value} sebanyak ${days} hari?`
      : `Set expired key ${licenseKey?.key_value} ke ${newDate}?`
    : `Perpanjang ${selectedPreset?.name ?? "preset"} (${presetCost} credit)? Sisa credit setelah ini: ${Math.max(creditAfter, 0)}.`;

  return (
    <>
      <Modal
        open={licenseKey !== null}
        onClose={onClose}
        title="Edit Key"
        description={licenseKey?.key_value}
        busy={saving}
        onSubmit={() => {
          if (validate()) setConfirming(true);
        }}
        footer={
          <>
            <Button onClick={onClose} disabled={saving}>
              Batal
            </Button>
            <Button variant="primary" onClick={() => validate() && setConfirming(true)}>
              Simpan
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-glass-border bg-white/[0.03] p-3">
            <p className="text-label text-muted">Expired sekarang</p>
            <p className="mt-1 text-body text-text">
              {licenseKey?.expired_at ? formatDateTime(licenseKey.expired_at) : "Lifetime"}
            </p>
          </div>

          {isOwner ? (
            <>
              <div className="flex flex-col gap-2">
                <span className="text-label font-medium text-muted">Perpanjang durasi</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    aria-pressed={mode === "extend"}
                    onClick={() => setMode("extend")}
                    className={`h-9 rounded-lg border px-3 text-label transition-colors duration-150 ${
                      mode === "extend"
                        ? "border-accent/50 bg-accent/15 text-accent"
                        : "border-glass-border text-muted hover:bg-white/5"
                    }`}
                  >
                    Tambah X hari
                  </button>
                  <button
                    type="button"
                    aria-pressed={mode === "set"}
                    onClick={() => setMode("set")}
                    className={`h-9 rounded-lg border px-3 text-label transition-colors duration-150 ${
                      mode === "set"
                        ? "border-accent/50 bg-accent/15 text-accent"
                        : "border-glass-border text-muted hover:bg-white/5"
                    }`}
                  >
                    Set tanggal expired
                  </button>
                </div>
              </div>

              {mode === "extend" ? (
                <FieldWrap label="Tambah hari" htmlFor="extend-days" hint="Dihitung dari tanggal expired yang masih berlaku.">
                  <Input
                    id="extend-days"
                    type="number"
                    min={1}
                    max={3650}
                    value={days}
                    onChange={(event) => setDays(event.target.value)}
                    className="tabular"
                  />
                </FieldWrap>
              ) : (
                <FieldWrap label="Tanggal expired baru" htmlFor="set-date">
                  <Input
                    id="set-date"
                    type="date"
                    value={newDate}
                    onChange={(event) => setNewDate(event.target.value)}
                  />
                </FieldWrap>
              )}

              <FieldWrap label="Max device" htmlFor="max-device" hint="Slot device yang boleh dipakai key ini.">
                <Input
                  id="max-device"
                  type="number"
                  min={1}
                  max={100}
                  value={maxDevice}
                  onChange={(event) => setMaxDevice(event.target.value)}
                  className="tabular"
                />
              </FieldWrap>
            </>
          ) : (
            <>
              <FieldWrap label="Perpanjang pakai preset" htmlFor="extend-preset" hint="Biaya credit mengikuti preset.">
                <Select
                  id="extend-preset"
                  value={presetId}
                  onChange={setPresetId}
                  placeholder="Pilih durasi"
                  options={presets.map((preset) => ({
                    value: preset.id,
                    label: `${preset.name} · ${preset.days} hari`,
                    hint: `${formatNumber(preset.credit_cost)} credit`,
                  }))}
                />
              </FieldWrap>

              <div className="rounded-lg border border-glass-border bg-white/[0.03] p-3">
                <div className="flex items-center justify-between text-label">
                  <span className="text-muted">Biaya</span>
                  <span className="tabular text-text">{formatNumber(presetCost)} credit</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-label">
                  <span className="text-muted">Sisa credit setelah ini</span>
                  <span className={`tabular ${creditAfter < 0 ? "text-banned" : "text-text"}`}>
                    {formatNumber(Math.max(creditAfter, 0))}
                  </span>
                </div>
              </div>
            </>
          )}

          <FieldWrap label="Catatan" htmlFor="key-note" hint="Opsional, maksimal 500 karakter.">
            <Textarea
              id="key-note"
              value={note}
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Catatan internal…"
            />
          </FieldWrap>

          {error && (
            <p className="text-label text-banned" role="alert">
              {error}
            </p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirming}
        title="Simpan perubahan?"
        message={confirmMessage}
        confirmLabel="Ya, simpan"
        loading={saving}
        onConfirm={save}
        onClose={() => setConfirming(false)}
      />
    </>
  );
}
