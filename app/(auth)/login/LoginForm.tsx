"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertIcon, EyeIcon, EyeOffIcon, KeyIcon, ShieldIcon, WalletIcon } from "@/components/icons";
import { XloopMark, XloopTile } from "@/components/icons/brand";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { apiFetch } from "@/lib/api/client";

const ERROR_MAP: Record<string, string> = {
  profil: "Profil akun tidak ditemukan. Hubungi Owner.",
  nonaktif: "Akun kamu dinonaktifkan",
};

const FEATURES = [
  {
    icon: KeyIcon,
    title: "Generate key massal",
    description: "Batch key per tool, version, durasi, dan batas device.",
  },
  {
    icon: ShieldIcon,
    title: "HWID & signature",
    description: "Validasi perangkat dan response bertanda tangan di sisi client.",
  },
  {
    icon: WalletIcon,
    title: "Credit transparan",
    description: "Setiap topup dan generate tercatat rapi untuk owner & reseller.",
  },
];

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const reduce = useReducedMotion();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nextPath = params.get("next") || "/dashboard";

  useEffect(() => {
    const code = params.get("error");
    if (code && ERROR_MAP[code]) setError(ERROR_MAP[code]);
  }, [params]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const safeNext =
        nextPath.startsWith("/") && !nextPath.startsWith("//") && !nextPath.startsWith("/\\")
          ? nextPath
          : "/dashboard";
      router.replace(safeNext);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal login. Coba lagi.");
      setLoading(false);
    }
  }

  function syncCapsLock(event: React.KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState ? event.getModifierState("CapsLock") : false);
  }

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.995 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: reduce ? 0.1 : 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="glass-strong grid w-full max-w-[420px] overflow-hidden rounded-shell shadow-[0_28px_80px_rgba(0,0,0,0.42)] lg:max-w-[880px] lg:grid-cols-[1.05fr_420px]"
    >
      {/* Panel brand — hanya tampil di layar lebar */}
      <aside
        className="relative hidden overflow-hidden border-r border-glass-border p-8 lg:flex lg:flex-col lg:justify-between"
        style={{
          background:
            "radial-gradient(520px circle at 8% 0%, rgba(139,147,255,0.22), transparent 58%), radial-gradient(460px circle at 100% 100%, rgba(111,174,130,0.11), transparent 60%), rgba(255,255,255,0.025)",
        }}
      >
        <XloopMark
          size={300}
          strokeWidth={1.15}
          className="pointer-events-none absolute -bottom-16 -right-16 text-accent opacity-[0.07]"
        />

        <div className="relative flex items-center gap-3">
          <XloopTile size={40} className="drop-shadow-[0_8px_24px_rgba(139,147,255,0.4)]" />
          <div className="leading-tight">
            <p className="text-body font-semibold tracking-[0.08em] text-text">XLOOP</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted">License Panel</p>
          </div>
        </div>

        <div className="relative py-10">
          <p className="max-w-sm text-[28px] font-semibold leading-tight tracking-[-0.02em] text-text">
            Kelola lisensi tool kamu dari satu panel.
          </p>
          <p className="mt-3 max-w-sm text-body leading-relaxed text-muted">
            Generate, pantau masa aktif, atur HWID, dan kelola credit reseller tanpa berpindah-pindah tempat.
          </p>

          <ul className="mt-7 flex flex-col gap-4">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <li key={feature.title} className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent-soft text-accent">
                    <Icon size={17} strokeWidth={1.5} />
                  </span>
                  <span>
                    <span className="block text-body font-medium text-text">{feature.title}</span>
                    <span className="mt-0.5 block text-label leading-relaxed text-muted">{feature.description}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Pratinjau produk mini, murni dekoratif */}
        <div className="glass relative rounded-card p-3" aria-hidden>
          <div className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <KeyIcon size={15} strokeWidth={1.5} className="shrink-0 text-accent" />
              <span className="truncate font-mono text-label text-text">XL-8K2P-7QMX-4R9T</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-active/25 bg-active-soft px-2 py-0.5 text-label font-medium text-active">
              <span className="h-1.5 w-1.5 rounded-full bg-active" />
              Active
            </span>
          </div>
          <p className="mt-1.5 text-label text-muted">Contoh key · 30 hari · 1 device</p>
        </div>
      </aside>

      {/* Form */}
      <section className="flex flex-col justify-center p-6 sm:p-8">
        <div className="mb-6">
          <XloopTile size={40} className="mb-4 drop-shadow-[0_8px_24px_rgba(139,147,255,0.35)] lg:hidden" />
          <p className="text-label uppercase tracking-[0.18em] text-muted">Masuk panel</p>
          <h1 className="mt-1 text-title font-semibold text-text">Selamat datang kembali</h1>
          <p className="mt-1 text-body text-muted">Gunakan akun Owner atau Reseller kamu untuk melanjutkan.</p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-label font-medium text-muted">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="nama@gmail.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-label font-medium text-muted">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={syncCapsLock}
                onKeyUp={syncCapsLock}
                onBlur={() => setCapsLock(false)}
                aria-describedby={capsLock ? "password-caps-hint" : undefined}
                className="pr-11"
                disabled={loading}
                required
              />
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={loading}
                aria-pressed={showPassword}
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-white/[0.06] hover:text-text disabled:opacity-50"
              >
                {showPassword ? <EyeOffIcon size={17} strokeWidth={1.5} /> : <EyeIcon size={17} strokeWidth={1.5} />}
              </button>
            </div>
            {capsLock && (
              <p id="password-caps-hint" className="flex items-center gap-1.5 text-label text-expired">
                <AlertIcon size={13} strokeWidth={1.5} />
                Caps Lock sedang aktif.
              </p>
            )}
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-start gap-2 rounded-lg border border-banned/40 bg-banned/10 px-3 py-2"
                role="alert"
              >
                <AlertIcon size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-banned" />
                <p className="text-label text-banned">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <Button type="submit" variant="primary" loading={loading} className="mt-1 w-full">
            Masuk
          </Button>
        </form>
      </section>
    </motion.div>
  );
}
