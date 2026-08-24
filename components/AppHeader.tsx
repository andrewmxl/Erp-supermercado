"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { isAdmin, isCashier, type ErpProfile } from "@/lib/erp";
import { STORE_NAME, STORE_TAGLINE } from "@/lib/store-info";

const LINKS = [
  { href: "/", label: "Panel" },
  { href: "/pos", label: "Punto de venta" },
  { href: "/inventory", label: "Inventario" },
  { href: "/finance", label: "Finanzas" },
  { href: "/finance/expenses", label: "Gastos" },
  { href: "/assistant", label: "WhatsApp" },
  { href: "/contact", label: "Contacto" },
];

export function AppHeader({ profile }: { profile: ErpProfile }) {
  const pathname = usePathname();
  const router = useRouter();
  const admin = isAdmin(profile.role);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const links = admin
    ? [...LINKS, { href: "/users", label: "Usuarios" }, { href: "/feedback", label: "Buzón" }]
    : isCashier(profile.role)
      ? LINKS.filter((link) =>
          ["/", "/pos", "/inventory", "/assistant", "/contact"].includes(link.href)
        )
      : LINKS.filter((link) => link.href !== "/finance/expenses");

  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-emerald-900/80 pb-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold tracking-wide text-amber-300">
            {STORE_NAME}
          </p>
          <p className="text-xs text-emerald-200/80">{STORE_TAGLINE}</p>
          <p className="mt-1 text-sm text-slate-400">
            {profile.name} · {profile.role}
          </p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="rounded-lg bg-red-900 px-4 py-2 text-sm font-semibold text-red-100 hover:bg-red-800"
        >
          Cerrar sesión
        </button>
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
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <p className="text-slate-400">{message}</p>
    </main>
  );
}
