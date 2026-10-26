import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { hasSupabaseEnv } from "@/lib/supabase/env";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/validate", "/api/cron"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const SETUP_HTML = `<!doctype html><html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>XLOOP PANEL — setup</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#141311;color:#f1eee9;
font:14px/1.6 ui-sans-serif,system-ui,sans-serif;padding:24px}main{max-width:520px;border:1px solid rgba(255,255,255,.1);
background:rgba(255,255,255,.05);border-radius:16px;padding:24px}h1{font-size:20px;margin:0 0 8px}
code{background:rgba(255,255,255,.06);padding:2px 6px;border-radius:6px;font-size:13px}
p{color:#a8a299;margin:8px 0}</style></head><body><main><h1>Environment Supabase belum diset</h1>
<p>Isi <code>NEXT_PUBLIC_SUPABASE_URL</code> dan <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
(plus <code>SUPABASE_SERVICE_ROLE_KEY</code>) di <code>.env.local</code>, lalu restart server.</p>
<p>Lihat README bagian <strong>Setup Supabase</strong> dan <strong>Environment variables</strong>.</p></main></body></html>`;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Tanpa env Supabase, tampilkan instruksi setup alih-alih error 500 yang membingungkan.
  if (!hasSupabaseEnv()) {
    if (pathname === "/login") return NextResponse.next();
    return new NextResponse(SETUP_HTML, {
      status: 503,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Belum login → semua halaman dashboard ditolak.
  if (!user && !isPublic(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sesi tidak ditemukan. Silakan login ulang." }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
    return NextResponse.redirect(url);
  }

  // Sudah login tapi buka /login → lempar ke dashboard.
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
