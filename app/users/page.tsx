"use client";

import { useEffect, useMemo, useState } from "react";
import { AppHeader, SessionScreen } from "@/components/AppHeader";
import { useErpSession } from "@/hooks/useErpSession";
import { isAdmin } from "@/lib/erp";
import { createClient } from "@/utils/supabase/client";

type AppUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt?: string | null;
};

export default function UsersPage() {
  const { checking, profile } = useErpSession({ adminOnly: true });
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const currentUserEmail = profile?.email ?? "";

  async function loadUsers() {
    setLoading(true);
    setErrorMessage("");

    const supabase = createClient();
    const { data, error } = await supabase
      .from("AppUser")
      .select("id, name, email, role, active, createdAt")
      .order("name", { ascending: true });

    if (error) {
      setErrorMessage(`No se pudieron cargar los usuarios: ${error.message}`);
      setLoading(false);
      return;
    }

    setUsers(
      (data ?? []).map((user) => ({
        id: user.id,
        name: user.name ?? "",
        email: user.email ?? "",
        role: user.role ?? "",
        active: Boolean(user.active),
        createdAt: user.createdAt ?? null,
      }))
    );

    setLoading(false);
  }

  useEffect(() => {
    if (!checking && profile) {
      void loadUsers();
    }
  }, [checking, profile]);

  const filteredUsers = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (!text) return users;

    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(text) ||
        user.email.toLowerCase().includes(text) ||
        user.role.toLowerCase().includes(text)
    );
  }, [users, search]);

  const activeCount = useMemo(
    () => users.filter((user) => user.active).length,
    [users]
  );

  const adminCount = useMemo(
    () => users.filter((user) => user.role === "Administrador").length,
    [users]
  );

  async function updateUser(
    user: AppUser,
    changes: Partial<Pick<AppUser, "role" | "active">>
  ) {
    const supabase = createClient();

    setSavingId(user.id);
    setErrorMessage("");
    setSuccessMessage("");

    const nextRole = changes.role ?? user.role;
    const nextActive = changes.active ?? user.active;

    if (
      user.email.toLowerCase() === currentUserEmail &&
      (!nextActive || nextRole !== "Administrador")
    ) {
      setErrorMessage(
        "No puedes desactivar tu propia cuenta ni quitarte el rol de Administrador desde esta sesión."
      );
      setSavingId(null);
      return;
    }

    const { error } = await supabase
      .from("AppUser")
      .update({ role: nextRole, active: nextActive })
      .eq("id", user.id);

    if (error) {
      setErrorMessage(`No se pudo actualizar el usuario: ${error.message}`);
      setSavingId(null);
      return;
    }

    setUsers((current) =>
      current.map((item) =>
        item.id === user.id
          ? { ...item, role: nextRole, active: nextActive }
          : item
      )
    );

    setSuccessMessage(`"${user.name}" fue actualizado correctamente.`);
    setSavingId(null);
  }

  if (checking || !profile) {
    return <SessionScreen message="Verificando sesión..." />;
  }

  if (!isAdmin(profile.role)) {
    return <SessionScreen message="Solo el administrador puede gestionar usuarios." />;
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-6xl">
      <AppHeader profile={profile} />
      <h1 className="mb-6 text-3xl font-bold text-sky-400">Usuarios y roles</h1>

      {successMessage && (
        <div className="mb-5 rounded-lg border border-emerald-800 bg-emerald-950 p-4 text-emerald-300">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mb-5 rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
          Error: {errorMessage}
        </div>
      )}

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Usuarios registrados</p>
          <p className="mt-2 text-3xl font-bold">{users.length}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Usuarios activos</p>
          <p className="mt-2 text-3xl font-bold text-emerald-400">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Administradores</p>
          <p className="mt-2 text-3xl font-bold text-sky-400">{adminCount}</p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Usuarios</h2>
            <p className="mt-1 text-sm text-slate-400">
              Cambia rol o estado de acceso
            </p>
          </div>

          <div className="flex w-full gap-3 md:w-auto">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar nombre, correo o rol..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none focus:border-sky-500 md:w-96"
            />
            <button
              type="button"
              onClick={loadUsers}
              disabled={loading || Boolean(savingId)}
              className="rounded-lg bg-slate-700 px-4 py-2 hover:bg-slate-600 disabled:opacity-40"
            >
              ↻
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400">Cargando usuarios...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-10 text-center text-slate-400">No se encontraron usuarios.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-700 text-left text-sm text-slate-400">
                  <th className="p-3">Nombre</th>
                  <th className="p-3">Correo</th>
                  <th className="p-3">Rol</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Creado</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const saving = savingId === user.id;
                  const isCurrent = user.email.toLowerCase() === currentUserEmail;

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-slate-800 hover:bg-slate-800/50"
                    >
                      <td className="p-3">
                        <div className="font-semibold">{user.name}</div>
                        {isCurrent && (
                          <div className="mt-1 text-xs text-sky-400">Sesión actual</div>
                        )}
                      </td>
                      <td className="p-3 text-slate-300">{user.email}</td>
                      <td className="p-3">
                        <select
                          value={user.role}
                          disabled={saving || isCurrent}
                          onChange={(event) =>
                            updateUser(user, { role: event.target.value })
                          }
                          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-sky-500 disabled:opacity-50"
                        >
                          <option value="Administrador">Administrador</option>
                          <option value="Cajero">Cajero</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            user.active
                              ? "bg-emerald-950 text-emerald-300"
                              : "bg-red-950 text-red-300"
                          }`}
                        >
                          {user.active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-slate-400">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleString()
                          : "—"}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={saving || isCurrent}
                            onClick={() =>
                              updateUser(user, { active: !user.active })
                            }
                            className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
                              user.active
                                ? "bg-red-900 text-red-100 hover:bg-red-800"
                                : "bg-emerald-700 text-white hover:bg-emerald-600"
                            }`}
                          >
                            {saving
                              ? "Guardando..."
                              : user.active
                                ? "Desactivar"
                                : "Activar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-amber-900 bg-amber-950/30 p-5">
        <h3 className="font-semibold text-amber-300">Alta de usuarios nuevos</h3>
        <p className="mt-2 text-sm text-slate-400">
          Esta pantalla administra perfiles existentes. La creación de una cuenta nueva
          con contraseña requiere crear primero la cuenta en Supabase Authentication y
          después registrar su perfil en AppUser.
        </p>
      </section>
      </div>
    </main>
  );
}
