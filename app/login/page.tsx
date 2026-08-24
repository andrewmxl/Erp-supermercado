"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_ROLE_KEY } from "@/lib/erp";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function checkSession() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user?.email) {
          setCheckingSession(false);
          return;
        }

        const { data: profile } = await supabase
          .from("AppUser")
          .select("name, email, role, active")
          .eq("email", user.email.toLowerCase())
          .maybeSingle();

        if (profile?.active) {
          router.replace("/");
          return;
        }

        await supabase.auth.signOut();
      } catch {
        // Sin sesión o sin configuración: mostrar login / acceso de revisión.
      }

      setCheckingSession(false);
    }

    checkSession();
  }, [router]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setMessage("Escribe un correo válido.");
      return;
    }

    if (!password) {
      setMessage("Escribe tu contraseña.");
      return;
    }

    setLoading(true);
    setMessage("");

    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error || !data.user?.email) {
      setMessage("Correo o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("AppUser")
      .select("name, email, role, active")
      .eq("email", data.user.email.toLowerCase())
      .maybeSingle();

    if (profileError) {
      await supabase.auth.signOut();
      setMessage(`No se pudo validar el perfil del ERP: ${profileError.message}`);
      setLoading(false);
      return;
    }

    if (!profile) {
      await supabase.auth.signOut();
      setMessage("La cuenta existe, pero no está registrada en Usuarios y Roles.");
      setLoading(false);
      return;
    }

    if (!profile.active) {
      await supabase.auth.signOut();
      setMessage("Este usuario está desactivado.");
      setLoading(false);
      return;
    }

    setPassword("");
    router.replace("/");
    router.refresh();
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <p className="text-slate-400">Verificando sesión...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="text-center">
          <div className="text-5xl">🛒</div>
          <h1 className="mt-4 text-3xl font-bold text-sky-400">ERP Supermercado</h1>
          <p className="mt-2 text-slate-400">Inicia sesión para entrar al sistema</p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Correo electrónico
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="usuario@empresa.com"
              disabled={loading}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none transition focus:border-sky-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Contraseña
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              disabled={loading}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none transition focus:border-sky-500 disabled:opacity-50"
            />
          </div>

          {message && (
            <div className="rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-300">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-sky-600 p-3 font-bold hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>

        <div className="mt-6 space-y-3 border-t border-slate-800 pt-5 text-sm text-slate-400">
          <p>
            Revisión: entra sin cuenta. El cajero solo cobra y consulta inventario;
            el administrador ve finanzas, usuarios y el buzón.
          </p>
          <button
            type="button"
            onClick={() => {
              window.localStorage.setItem(DEMO_ROLE_KEY, "Administrador");
              router.replace("/");
            }}
            className="w-full rounded-lg bg-emerald-700 p-3 font-semibold text-white hover:bg-emerald-600"
          >
            Entrar como Administrador
          </button>
          <button
            type="button"
            onClick={() => {
              window.localStorage.setItem(DEMO_ROLE_KEY, "Cajero");
              router.replace("/");
            }}
            className="w-full rounded-lg bg-sky-800 p-3 font-semibold text-white hover:bg-sky-700"
          >
            Entrar como Cajero
          </button>
        </div>
      </div>
    </main>
  );
}