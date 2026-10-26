import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Login — XLOOP PANEL" };

export default function LoginPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center p-4 py-8">
      <Suspense fallback={<div className="glass-strong h-[520px] w-full max-w-[420px] rounded-shell lg:max-w-[880px]" />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
