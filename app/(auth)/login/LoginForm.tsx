"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertIcon } from "@/components/icons";
import { XloopTile } from "@/components/icons/brand";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { apiFetch } from "@/lib/api/client";

const ERROR_MAP: Record<string, string> = {
  profil: "Profil akun tidak ditemukan. Hubungi Owner.",
  nonaktif: "Akun kamu dinonaktifkan",
};

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const reduce = useReducedMotion();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      router.replace(nextPath.startsWith("/") ? nextPath : "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal login. Coba lagi.");
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0.1 : 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="glass-strong w-full max-w-[400px] rounded-shell p-6"
    >
      <div className="mb-6">
        <XloopTile size={40} className="mb-4" />
        <p className="text-label uppercase tracking-[0.18em] text-muted">Masuk panel</p>
        <h1 className="mt-1 text-title font-semibold text-text">XLOOP PANEL</h1>
        <p className="mt-1 text-body text-muted">Kelola key, tool, dan credit dari satu tempat.</p>
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
            placeholder="nama@xloop.dev"
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
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={loading}
            required
          />
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

      <p className="mt-4 text-label text-muted">Akun reseller dibuat oleh Owner. Tidak ada pendaftaran publik.</p>
    </motion.div>
  );
}
