import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Login — XLOOP PANEL" };

export default function LoginPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center p-4">
      <Suspense fallback={<div className="glass-strong h-72 w-full max-w-[400px] rounded-shell" />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
