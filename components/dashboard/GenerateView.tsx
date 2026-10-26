"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarIcon,
  CheckCircleIcon,
  CopyIcon,
  DownloadIcon,
  KeyIcon,
  MinusIcon,
  PlusIcon,
  TimerIcon,
  WalletIcon,
} from "@/components/icons";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { FieldWrap, Textarea } from "@/components/ui/Field";
import { GlassCard } from "@/components/ui/GlassCard";
import { Select } from "@/components/ui/Select";
import { CopyButton, copyText } from "@/components/ui/CopyButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { apiFetch } from "@/lib/api/client";
import { LIMITS } from "@/lib/utils/constants";
import { formatDate, formatDateTime, formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
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


function SectionHeading({ step, title, description }: { step: number; title: string; description?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent/25 bg-accent-soft text-label font-semibold text-accent">
        {step}
      </span>
      <div>
        <h2 className="text-body font-medium leading-5 text-text">{title}</h2>
        {description && <p className="mt-0.5 text-label text-muted">{description}</p>}
      </div>
    </div>
  );
}

function NumberStepper({
  id,
  label,
  value,
  onChange,
  min,
  max,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
}) {
  const numeric = Number(value);
  const hasNumber = value.trim() !== "" && Number.isFinite(numeric);

  function step(delta: number) {
    const base = hasNumber ? numeric : min;
    onChange(String(Math.min(max, Math.max(min, base + delta))));
  }

  const stepButton =
    "flex h-full w-10 shrink-0 items-center justify-center text-muted transition-colors duration-150 hover:bg-white/[0.05] hover:text-text disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent";

  return (
    <div className="flex h-10 items-stretch overflow-hidden rounded-lg border border-glass-border bg-white/[0.03] focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/20">
      <button type="button" aria-label={`Kurangi ${label}`} onClick={() => step(-1)} disabled={hasNumber && numeric <= min} className={stepButton}>
        <MinusIcon size={15} strokeWidth={1.6} />
      </button>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onWheel={(event) => event.currentTarget.blur()}
        className="h-full min-w-0 flex-1 bg-transparent text-center text-body text-text outline-none tabular [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button type="button" aria-label={`Tambah ${label}`} onClick={() => step(1)} disabled={hasNumber && numeric >= max} className={stepButton}>
        <PlusIcon size={15} strokeWidth={1.6} />
      </button>
    </div>
  );
}

function QuickChips({
  values,
  current,
  onPick,
  label,
}: {
  values: number[];
  current: string;
  onPick: (value: string) => void;
  label: string;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5" aria-label={`Pilihan cepat ${label}`}>
      {values.map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={current === String(value)}
          onClick={() => onPick(String(value))}
          className={cn(
            "min-h-7 rounded-full border px-2.5 text-label tabular transition-colors duration-150",
            current === String(value)
              ? "border-accent/40 bg-accent-soft font-medium text-accent"
              : "border-glass-border text-muted hover:bg-white/[0.05] hover:text-text"
          )}
        >
          {value}
        </button>
      ))}
    </div>
  );
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
  const estimatedExpiry = days > 0 ? new Date(Date.now() + days * 86_400_000) : null;
  const creditUsePercent =
    currentCredit > 0 ? Math.min(100, Math.max(0, (totalCost / currentCredit) * 100)) : totalCost > 0 ? 100 : 0;
  const durationLabel =
    isOwner && durationMode === "custom"
      ? days > 0
        ? `Custom · ${formatNumber(days)} hari`
        : "Custom"
      : selectedPreset
        ? `${selectedPreset.name} · ${formatNumber(selectedPreset.days)} hari`
        : "Belum dipilih";

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
        <form id="generate-key-form" onSubmit={submit} noValidate className="lg:col-span-7">
          <GlassCard className="flex flex-col gap-6">
            {metaLoading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <>
                <section className="flex flex-col gap-3" aria-label="Pilih tool dan version">
                  <SectionHeading step={1} title="Tool & Version" description="Pilih produk dan versi yang akan memakai key ini." />
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
                </section>

                <section className="flex flex-col gap-3" aria-label="Pilih durasi">
                  <SectionHeading step={2} title="Durasi" description={isOwner ? "Pakai preset atau tentukan masa aktif sendiri." : "Harga mengikuti preset yang dipilih."} />
                {isOwner && (
                  <div className="inline-flex w-fit rounded-lg border border-glass-border bg-white/[0.03] p-0.5" role="group" aria-label="Mode durasi">
                    {(
                      [
                        { value: "preset", label: "Preset" },
                        { value: "custom", label: "Custom" },
                      ] as const
                    ).map((mode) => (
                      <button
                        key={mode.value}
                        type="button"
                        aria-pressed={durationMode === mode.value}
                        onClick={() => setDurationMode(mode.value)}
                        className={cn(
                          "min-h-8 rounded-md px-3 text-label transition-colors duration-150",
                          durationMode === mode.value ? "bg-accent-soft font-semibold text-accent" : "text-muted hover:text-text"
                        )}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                )}

                {isOwner && durationMode === "custom" ? (
                  <FieldWrap label="Custom durasi (hari)" htmlFor="gen-custom-days" hint="1–3650 hari.">
                    <NumberStepper id="gen-custom-days" label="custom durasi" value={customDays} onChange={setCustomDays} min={1} max={3650} />
                    <QuickChips values={[7, 30, 90, 365]} current={customDays} onPick={setCustomDays} label="custom durasi" />
                  </FieldWrap>
                ) : presets.length > 0 && presets.length <= 6 ? (
                  <div className="flex flex-col gap-2">
                    <span id="gen-duration-label" className="text-label font-medium text-muted">
                      Preset durasi
                    </span>
                    <div role="radiogroup" aria-labelledby="gen-duration-label" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {presets.map((preset) => {
                        const selected = preset.id === presetId;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => setPresetId(preset.id)}
                            className={cn(
                              "rounded-card border p-3 text-left transition-[background-color,border-color,transform] duration-150 active:scale-[0.99]",
                              selected
                                ? "border-accent/45 bg-accent-soft shadow-[0_8px_24px_rgba(139,147,255,0.12)]"
                                : "border-glass-border bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.045]"
                            )}
                          >
                            <span className="mb-2 flex items-center justify-between gap-2">
                              <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg border", selected ? "border-accent/25 text-accent" : "border-glass-border text-muted")}>
                                <TimerIcon size={16} strokeWidth={1.5} />
                              </span>
                              {selected && <CheckCircleIcon size={17} strokeWidth={1.5} className="text-accent" />}
                            </span>
                            <span className="block truncate text-body font-medium text-text">{preset.name}</span>
                            <span className="mt-1 flex flex-wrap items-center gap-1.5 text-label text-muted">
                              <span className="tabular">{formatNumber(preset.days)} hari</span>
                              {!isOwner && (
                                <span className="rounded-full border border-accent/20 bg-accent-soft px-1.5 py-0.5 font-medium text-accent tabular">
                                  {formatNumber(preset.credit_cost)} credit
                                </span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {estimatedExpiry && (
                      <p className="flex items-center gap-1.5 text-label text-muted">
                        <CalendarIcon size={14} strokeWidth={1.5} className="text-accent" />
                        Perkiraan expired: <span className="text-text">{formatDate(estimatedExpiry.toISOString())}</span>
                      </p>
                    )}
                  </div>
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
                </section>

                <section className="flex flex-col gap-3" aria-label="Atur device dan jumlah key">
                  <SectionHeading step={3} title="Device & Jumlah" description="Tentukan batas perangkat dan banyak key dalam batch ini." />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FieldWrap label="Max device" htmlFor="gen-max-device" hint={`Minimal 1, maksimal ${limits.maxDevice}.`}>
                    <NumberStepper id="gen-max-device" label="max device" value={maxDevice} onChange={setMaxDevice} min={1} max={limits.maxDevice} />
                    <QuickChips values={[1, 2, 3, 5].filter((value) => value <= limits.maxDevice)} current={maxDevice} onPick={setMaxDevice} label="max device" />
                  </FieldWrap>

                  <FieldWrap label="Quantity" htmlFor="gen-quantity" hint={`1–${limits.maxQty} key sekaligus.`}>
                    <NumberStepper id="gen-quantity" label="quantity" value={quantity} onChange={setQuantity} min={1} max={limits.maxQty} />
                    <QuickChips values={[1, 5, 10, 25].filter((value) => value <= limits.maxQty)} current={quantity} onPick={setQuantity} label="quantity" />
                  </FieldWrap>
                </div>
                </section>

                <section className="flex flex-col gap-3" aria-label="Catatan batch">
                  <SectionHeading step={4} title="Catatan" description="Membantu mengenali batch ini di riwayat." />
                  <FieldWrap label="Catatan" htmlFor="gen-note" hint={`Opsional · ${note.length}/500 karakter`}>
                  <Textarea
                    id="gen-note"
                    value={note}
                    maxLength={500}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Contoh: batch reseller A"
                    />
                  </FieldWrap>
                </section>

                {error && (
                  <p className="rounded-lg border border-banned/25 bg-banned-soft px-3 py-2 text-label text-banned" role="alert">
                    {error}
                  </p>
                )}

                <Button type="submit" variant="primary" loading={loading} className="w-full lg:hidden" icon={<PlusIcon size={16} strokeWidth={1.5} />}>
                  Buat {qty > 1 ? `${formatNumber(qty)} Key` : "Key"}
                  {!isOwner && totalCost > 0 ? ` · ${formatNumber(totalCost)} credit` : ""}
                </Button>
              </>
            )}
          </GlassCard>
        </form>

        {/* Ringkasan ala struk checkout */}
        <aside className="lg:col-span-5" aria-label="Ringkasan generate key">
          <div className="lg:sticky lg:top-[72px]">
            <GlassCard className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-body font-medium text-text">Ringkasan</h2>
                <span className="rounded-full border border-accent/20 bg-accent-soft px-2 py-0.5 text-label font-medium text-accent">
                  {formatNumber(qty)} key
                </span>
              </div>

              <dl className="flex flex-col gap-2.5 text-body">
                {[
                  { label: "Tool", value: selectedTool?.name ?? "Belum dipilih" },
                  { label: "Version", value: selectedVersion?.name ?? "Belum dipilih" },
                  { label: "Durasi", value: durationLabel },
                  {
                    label: "Perkiraan expired",
                    value: estimatedExpiry ? formatDate(estimatedExpiry.toISOString()) : "Pilih durasi dulu",
                  },
                  { label: "Max device", value: maxDevice || "—" },
                  { label: "Quantity", value: `${formatNumber(qty)} key` },
                ].map((row) => (
                  <div key={row.label} className="flex items-baseline justify-between gap-4">
                    <dt className="shrink-0 text-muted">{row.label}</dt>
                    <dd className="min-w-0 truncate text-right font-medium text-text tabular" title={row.value}>{row.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="border-t border-dashed border-glass-border" aria-hidden />

              {isOwner ? (
                <div className="flex items-start gap-3 rounded-card border border-accent/15 bg-accent-soft p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent/20 text-accent">
                    <WalletIcon size={17} strokeWidth={1.5} />
                  </span>
                  <div>
                    <p className="text-body font-medium text-text">Tanpa potongan credit</p>
                    <p className="mt-0.5 text-label text-muted">Generate sebagai owner tidak mengurangi saldo credit reseller mana pun.</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-baseline justify-between gap-4 text-body">
                    <span className="text-muted">Harga per key</span>
                    <span className="text-text tabular">{formatNumber(costPerKey)} × {formatNumber(qty)}</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-body font-medium text-text">Total biaya</span>
                    <span className={cn("text-xl font-semibold tabular", creditAfter < 0 ? "text-banned" : "text-text")}>
                      {formatNumber(totalCost)} <span className="text-label font-medium text-muted">credit</span>
                    </span>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-label">
                      <span className="text-muted">Credit terpakai</span>
                      <span className="text-text tabular">{formatNumber(Math.round(creditUsePercent))}%</span>
                    </div>
                    <div
                      className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]"
                      role="progressbar"
                      aria-label="Persentase credit terpakai"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(creditUsePercent)}
                    >
                      <div
                        className={cn("h-full rounded-full transition-[width] duration-300", creditAfter < 0 ? "bg-banned" : "bg-accent")}
                        style={{ width: `${creditUsePercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-label">
                    <div className="rounded-lg border border-glass-border bg-white/[0.025] px-2.5 py-2">
                      <p className="text-muted">Credit sekarang</p>
                      <p className="mt-0.5 text-body font-medium text-text tabular">{formatNumber(currentCredit)}</p>
                    </div>
                    <div className={cn("rounded-lg border px-2.5 py-2", creditAfter < 0 ? "border-banned/25 bg-banned-soft" : "border-active/20 bg-active-soft")}>
                      <p className="text-muted">Setelah generate</p>
                      <p className={cn("mt-0.5 text-body font-medium tabular", creditAfter < 0 ? "text-banned" : "text-active")}>
                        {formatNumber(Math.max(creditAfter, 0))}
                      </p>
                    </div>
                  </div>
                  {creditAfter < 0 && (
                    <p className="text-label text-banned" role="alert">
                      Credit tidak cukup — kurang {formatNumber(Math.abs(creditAfter))} credit.
                    </p>
                  )}
                </div>
              )}

              <Button
                type="submit"
                form="generate-key-form"
                variant="primary"
                loading={loading}
                disabled={metaLoading}
                className="hidden w-full lg:inline-flex"
                icon={<PlusIcon size={16} strokeWidth={1.5} />}
              >
                Buat {qty > 1 ? `${formatNumber(qty)} Key` : "Key"}
                {!isOwner && totalCost > 0 ? ` · ${formatNumber(totalCost)} credit` : ""}
              </Button>
              <p className="hidden text-center text-label text-muted lg:block">Key langsung tersimpan dan tercatat di Credit Log.</p>
            </GlassCard>
          </div>
        </aside>
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
              <Button size="sm" variant="primary" onClick={copyAll} icon={<CopyIcon size={15} strokeWidth={1.5} />}>
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
