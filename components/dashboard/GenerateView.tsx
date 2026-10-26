"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircleIcon, DownloadIcon, KeyIcon, PlusIcon } from "@/components/icons";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { FieldWrap, Input, Textarea } from "@/components/ui/Field";
import { GlassCard } from "@/components/ui/GlassCard";
import { Select } from "@/components/ui/Select";
import { CopyButton, copyText } from "@/components/ui/CopyButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { apiFetch } from "@/lib/api/client";
import { LIMITS } from "@/lib/utils/constants";
import { formatDateTime, formatNumber } from "@/lib/utils/format";
import type { DurationPreset, Role, ToolType } from "@/lib/utils/types";

interface GenerateResult {
  keys: string[];
  summary: {
    tool: string;
    tool_slug: string;
    version: string;
    duration_days: number | null;
    expired_at: string | null;
    max_device: number;
    quantity: number;
    credit_used: number;
    credit_left: number | null;
  };
}

export function GenerateView({ role, credit }: { role: Role; credit: number }) {
  const { toast } = useToast();
  const isOwner = role === "owner";
  const limits = LIMITS[role];

  const [tools, setTools] = useState<ToolType[]>([]);
  const [presets, setPresets] = useState<DurationPreset[]>([]);
  const [metaLoading, setMetaLoading] = useState(true);

  const [toolId, setToolId] = useState("");
  const [versionId, setVersionId] = useState("");
  const [durationMode, setDurationMode] = useState<"preset" | "custom">("preset");
  const [presetId, setPresetId] = useState("");
  const [customDays, setCustomDays] = useState("30");
  const [maxDevice, setMaxDevice] = useState("1");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [currentCredit, setCurrentCredit] = useState(credit);

  useEffect(() => {
    async function load() {
      setMetaLoading(true);
      try {
        const [{ data: toolList }, { data: presetList }] = await Promise.all([
          apiFetch<{ data: ToolType[] }>("/api/tools"),
          apiFetch<{ data: DurationPreset[] }>("/api/durations"),
        ]);
        const activeTools = toolList.filter((tool) => tool.is_active);
        const activePresets = presetList.filter((preset) => preset.is_active);

        setTools(activeTools);
        setPresets(activePresets);

        const firstTool = activeTools[0];
        if (firstTool) {
          setToolId(firstTool.id);
          const firstVersion = (firstTool.tool_versions ?? []).find((version) => version.is_active);
          if (firstVersion) setVersionId(firstVersion.id);
        }
        if (activePresets[0]) setPresetId(activePresets[0].id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat data tool.");
      } finally {
        setMetaLoading(false);
      }
    }
    void load();
  }, []);

  const selectedTool = tools.find((tool) => tool.id === toolId) ?? null;
  const versions = useMemo(
    () => (selectedTool?.tool_versions ?? []).filter((version) => version.is_active),
    [selectedTool]
  );
  const selectedVersion = versions.find((version) => version.id === versionId) ?? null;
  const selectedPreset = presets.find((preset) => preset.id === presetId) ?? null;

  // Jangan clamp diam-diam: nilai mentah dipakai ringkasan & tombol, dan
  // validasi di submit yang menolak di luar batas. Clamp lama membuat user
  // mengetik 999 tapi tombol menulis jumlah lain tanpa penjelasan.
  const qty = Number(quantity) || 0;
  const days = durationMode === "custom" && isOwner ? Number(customDays) || 0 : selectedPreset?.days ?? 0;
  const costPerKey = isOwner ? 0 : selectedPreset?.credit_cost ?? 0;
  const totalCost = costPerKey * qty;
  const creditAfter = currentCredit - totalCost;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!toolId) return setError("Pilih tool dulu.");
    if (!versionId) return setError("Pilih version dulu.");
    if (durationMode === "preset" && !presetId) return setError("Pilih preset durasi dulu.");
    if (isOwner && durationMode === "custom" && (!Number.isInteger(days) || days < 1)) {
      return setError("Custom durasi minimal 1 hari.");
    }

    const deviceValue = Number(maxDevice);
    if (!Number.isInteger(deviceValue) || deviceValue < 1 || deviceValue > limits.maxDevice) {
      return setError(`Max device harus 1–${limits.maxDevice}.`);
    }

    if (!Number.isInteger(qty) || qty < 1 || qty > limits.maxQty) {
      return setError(`Quantity harus 1–${limits.maxQty}.`);
    }

    if (!isOwner && totalCost > currentCredit) {
      return setError(`Credit tidak cukup (sisa ${currentCredit}).`);
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        tool_type_id: toolId,
        tool_version_id: versionId,
        max_device: deviceValue,
        quantity: qty,
        note: note.trim() || null,
      };

      if (isOwner && durationMode === "custom") {
        payload.duration_mode = "custom";
        payload.duration_days = days;
      } else {
        payload.duration_mode = "preset";
        payload.duration_preset_id = presetId;
      }

      const response = await apiFetch<GenerateResult>("/api/keys/generate", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setResult(response);
      toast(`${response.keys.length} key dibuat.`, "success");

      if (response.summary.credit_left !== null) setCurrentCredit(response.summary.credit_left);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal membuat key.";
      setError(message);
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function copyAll() {
    if (!result) return;
    const done = await copyText(result.keys.join("\n"));
    toast(done ? "Semua key disalin." : "Gagal menyalin.", done ? "success" : "error");
  }

  function exportTxt() {
    if (!result) return;
    const header = [
      `XLOOP PANEL — ${result.summary.tool} ${result.summary.version}`,
      `Durasi: ${result.summary.duration_days === null ? "Lifetime" : `${result.summary.duration_days} hari`}`,
      `Max device: ${result.summary.max_device}`,
      `Jumlah: ${result.summary.quantity}`,
      `Dibuat: ${formatDateTime(new Date().toISOString())}`,
      "",
    ].join("\n");

    const blob = new Blob([`${header}${result.keys.join("\n")}\n`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `xloop-keys-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast("File .txt diunduh.", "success");
  }

  return (
    <div>
      <PageHeader
        title="Generate Key"
        description={isOwner ? "Buat key baru untuk tool apa pun." : "Buat key pakai preset durasi dan sisa credit kamu."}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Form */}
        <form onSubmit={submit} className="lg:col-span-7">
          <GlassCard className="flex flex-col gap-4">
            {metaLoading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FieldWrap label="Tool Type" htmlFor="gen-tool">
                    <Select
                      id="gen-tool"
                      value={toolId}
                      onChange={(value) => {
                        setToolId(value);
                        const tool = tools.find((item) => item.id === value);
                        const firstVersion = (tool?.tool_versions ?? []).find((version) => version.is_active);
                        setVersionId(firstVersion?.id ?? "");
                      }}
                      placeholder="Pilih tool"
                      options={tools.map((tool) => ({ value: tool.id, label: tool.name, hint: tool.slug }))}
                    />
                  </FieldWrap>

                  <FieldWrap label="Version" htmlFor="gen-version">
                    <Select
                      id="gen-version"
                      value={versionId}
                      onChange={setVersionId}
                      placeholder="Pilih version"
                      options={versions.map((version) => ({ value: version.id, label: version.name }))}
                      disabled={!selectedTool}
                    />
                  </FieldWrap>
                </div>

                {isOwner && (
                  <div className="flex flex-col gap-2">
                    <span className="text-label font-medium text-muted">Durasi</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setDurationMode("preset")}
                        className={`h-9 rounded-lg border px-3 text-label transition-colors duration-150 ${
                          durationMode === "preset"
                            ? "border-accent/50 bg-accent/15 text-accent"
                            : "border-glass-border text-muted hover:bg-white/5"
                        }`}
                      >
                        Pilih preset
                      </button>
                      <button
                        type="button"
                        onClick={() => setDurationMode("custom")}
                        className={`h-9 rounded-lg border px-3 text-label transition-colors duration-150 ${
                          durationMode === "custom"
                            ? "border-accent/50 bg-accent/15 text-accent"
                            : "border-glass-border text-muted hover:bg-white/5"
                        }`}
                      >
                        Custom
                      </button>
                    </div>
                  </div>
                )}

                {isOwner && durationMode === "custom" ? (
                  <FieldWrap label="Custom durasi (hari)" htmlFor="gen-custom-days" hint="1–3650 hari.">
                    <Input
                      id="gen-custom-days"
                      type="number"
                      min={1}
                      max={3650}
                      value={customDays}
                      onChange={(event) => setCustomDays(event.target.value)}
                      className="tabular"
                    />
                  </FieldWrap>
                ) : (
                  <FieldWrap label="Durasi" htmlFor="gen-duration">
                    <Select
                      id="gen-duration"
                      value={presetId}
                      onChange={setPresetId}
                      placeholder="Pilih durasi"
                      options={presets.map((preset) => ({
                        value: preset.id,
                        label: `${preset.name} · ${preset.days} hari`,
                        hint: isOwner ? undefined : `${formatNumber(preset.credit_cost)} credit`,
                      }))}
                    />
                  </FieldWrap>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FieldWrap label="Max device" htmlFor="gen-max-device" hint={`Minimal 1, maksimal ${limits.maxDevice}.`}>
                    <Input
                      id="gen-max-device"
                      type="number"
                      min={1}
                      max={limits.maxDevice}
                      value={maxDevice}
                      onChange={(event) => setMaxDevice(event.target.value)}
                      className="tabular"
                    />
                  </FieldWrap>

                  <FieldWrap label="Quantity" htmlFor="gen-quantity" hint={`1–${limits.maxQty} key sekaligus.`}>
                    <Input
                      id="gen-quantity"
                      type="number"
                      min={1}
                      max={limits.maxQty}
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      className="tabular"
                    />
                  </FieldWrap>
                </div>

                <FieldWrap label="Catatan" htmlFor="gen-note" hint="Opsional, maksimal 500 karakter.">
                  <Textarea
                    id="gen-note"
                    value={note}
                    maxLength={500}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Contoh: batch reseller A"
                  />
                </FieldWrap>

                {error && (
                  <p className="text-label text-banned" role="alert">
                    {error}
                  </p>
                )}

                <Button type="submit" variant="primary" loading={loading} icon={<PlusIcon size={16} strokeWidth={1.5} />}>
                  Buat {qty > 1 ? `${qty} Key` : "Key"}
                </Button>
              </>
            )}
          </GlassCard>
        </form>

        {/* Ringkasan */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-[72px]">
            <GlassCard className="flex flex-col gap-3">
              <h2 className="text-body font-medium text-text">Ringkasan</h2>

              {[
                { label: "Tool", value: selectedTool?.name ?? "-" },
                { label: "Version", value: selectedVersion?.name ?? "-" },
                {
                  label: "Durasi",
                  value: isOwner && durationMode === "custom" ? `${days || 0} hari` : selectedPreset?.name ?? "-",
                },
                { label: "Max device", value: maxDevice || "-" },
                { label: "Quantity", value: `${qty} key` },
                { label: "Biaya credit", value: isOwner ? "Gratis (Owner)" : `${formatNumber(totalCost)} credit` },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between text-body">
                  <span className="text-muted">{row.label}</span>
                  <span className="tabular text-text">{row.value}</span>
                </div>
              ))}

              {!isOwner && (
                <>
                  <div className="h-px w-full bg-glass-border" />
                  <div className="flex items-center justify-between text-body">
                    <span className="text-muted">Sisa credit sekarang</span>
                    <span className="tabular text-text">{formatNumber(currentCredit)}</span>
                  </div>
                  <div className="flex items-center justify-between text-body">
                    <span className="text-muted">Sisa setelah generate</span>
                    <span className={`tabular ${creditAfter < 0 ? "text-banned" : "text-text"}`}>
                      {formatNumber(Math.max(creditAfter, 0))}
                    </span>
                  </div>
                  {creditAfter < 0 && (
                    <p className="text-label text-banned">Credit tidak cukup (sisa {currentCredit}).</p>
                  )}
                </>
              )}
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Hasil */}
      {result && (
        <GlassCard className="mt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircleIcon size={18} strokeWidth={1.5} className="text-active" />
              <h2 className="text-body font-medium text-text">
                {result.keys.length} key dibuat
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={copyAll}>
                Salin Semua
              </Button>
              <Button size="sm" onClick={exportTxt} icon={<DownloadIcon size={16} strokeWidth={1.5} />}>
                Export .txt
              </Button>
            </div>
          </div>

          <p className="mb-3 text-label text-muted">
            {result.summary.tool} · {result.summary.version} ·{" "}
            {result.summary.duration_days === null ? "Lifetime" : `${result.summary.duration_days} hari`} · max{" "}
            {result.summary.max_device} device · expired {formatDateTime(result.summary.expired_at)}
          </p>

          <ul className="flex flex-col gap-1 rounded-lg border border-glass-border bg-white/[0.03] p-2">
            {result.keys.map((key) => (
              <li key={key} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-white/5">
                <span className="flex min-w-0 items-center gap-2 break-all font-mono text-label text-text">
                  <KeyIcon size={14} strokeWidth={1.5} className="text-muted" />
                  {key}
                </span>
                <CopyButton value={key} label="Salin key" toastMessage="Key disalin" />
              </li>
            ))}
          </ul>
        </GlassCard>
      )}
    </div>
  );
}
