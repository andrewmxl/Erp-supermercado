"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  DEMO_ROLE_KEY,
  navLinksForRole,
  normalizeRole,
  STAFF_ROLES,
  type ErpProfile,
} from "@/lib/erp";
import { STORE_NAME, STORE_TAGLINE } from "@/lib/store-info";

const SWITCH_ROLES = ["Cliente", ...STAFF_ROLES] as const;

async function clearSupabaseSession() {
  try {
    const supabase = createClient();
    await Promise.race([
      supabase.auth.signOut(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 1500)
      ),
    ]);
  } catch {
    // Demo mode or a hung Supabase call must not block leaving the session.
  }
}

export function AppHeader({ profile }: { profile: ErpProfile }) {
  const pathname = usePathname();
  const links = navLinksForRole(profile.role);

  async function signOut() {
    window.localStorage.removeItem(DEMO_ROLE_KEY);
    await clearSupabaseSession();
    window.location.assign("/login");
  }

  async function switchRole(role: string) {
    if (normalizeRole(role) === normalizeRole(profile.role)) return;
    window.localStorage.setItem(DEMO_ROLE_KEY, role);
    await clearSupabaseSession();
    window.location.assign(role === "Cliente" ? "/pos" : "/");
  }

  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-emerald-900/80 pb-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/" className="block hover:opacity-90">
            <p className="text-sm font-semibold tracking-wide text-amber-300">
              {STORE_NAME}
            </p>
            <p className="text-xs text-emerald-200/80">{STORE_TAGLINE}</p>
          </Link>
          <p className="mt-1 text-sm text-slate-400">
            {profile.name} · {profile.role}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/"
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-500"
          >
            Inicio
          </Link>
          <label className="flex items-center gap-2 rounded-lg border border-emerald-800 bg-slate-900 px-3 py-2 text-sm text-slate-200">
            <span className="text-slate-400">Perfil</span>
            <select
              value={
                SWITCH_ROLES.includes(
                  normalizeRole(profile.role) as (typeof SWITCH_ROLES)[number]
                )
                  ? normalizeRole(profile.role)
                  : "Gerente"
              }
              onChange={(event) => {
                void switchRole(event.target.value);
              }}
              className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-amber-100 outline-none"
            >
              {SWITCH_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              void signOut();
            }}
            className="rounded-lg bg-red-900 px-4 py-2 text-sm font-semibold text-red-100 hover:bg-red-800"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2">
        {links.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : link.href === "/finance"
                ? pathname === "/finance"
                : pathname === link.href || pathname.startsWith(`${link.href}/`);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                active
                  ? "bg-emerald-800 text-amber-100"
                  : "bg-slate-800 text-slate-200 hover:bg-emerald-950"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

export function SessionScreen({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#121a16] text-slate-100">
      <p className="text-slate-400">{message}</p>
    </main>
  );
}
