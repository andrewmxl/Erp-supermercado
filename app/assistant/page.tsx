"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AppHeader, SessionScreen } from "@/components/AppHeader";
import { useErpSession } from "@/hooks/useErpSession";
import { canAskBusinessData, STAFF_ROLES } from "@/lib/erp";

type ChatMessage = {
  id: string;
  sender: "cliente" | "asistente";
  text: string;
};

const ADMIN_LINKS = [
  { href: "/", label: "Panel" },
  { href: "/pos", label: "Punto de venta" },
  { href: "/inventory", label: "Inventario" },
  { href: "/finance", label: "Finanzas" },
  { href: "/finance/expenses", label: "Gastos" },
  { href: "/users", label: "Usuarios" },
];

export default function AssistantPage() {
  const { checking, profile } = useErpSession();
  const [visitorKind, setVisitorKind] = useState<"cliente" | "personal" | "">("");
  const [staffRole, setStaffRole] = useState<(typeof STAFF_ROLES)[number]>("Cajero");
  const [phone, setPhone] = useState("");
  const [connectedPhone, setConnectedPhone] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "asistente",
      text: "Hola. Si eres cliente, pregunta precio, existencia u horario. Si eres personal, elige tu puesto: el sistema no da acceso de gerente solo por escribir un número.",
    },
  ]);

  const staffChat = visitorKind === "personal" && Boolean(connectedPhone);
  const isAdminChat = staffChat && canAskBusinessData(staffRole);

  function connectPhone() {
    const value = phone.replace(/\s+/g, "").trim();
    if (value.length < 8) {
      setErrorMessage("Escribe un número de WhatsApp válido.");
      return;
    }

    setErrorMessage("");
    setConnectedPhone(value);
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        sender: "asistente",
        text: `Número ${value} conectado como ${staffRole}. ${
          canAskBusinessData(staffRole)
            ? "Puedes consultar ventas e inventario interno."
            : "Este puesto no ve finanzas. Pregunta existencias o soporte; las cifras de ventas quedan para gerente y supervisor."
        }`,
      },
    ]);
  }

  function disconnectPhone() {
    setConnectedPhone("");
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        sender: "asistente",
        text: "Saliste del modo administrador. Este chat queda como cliente: pregunta por productos, precios u horario.",
      },
    ]);
  }

  async function sendMessage() {
    const finalQuestion = input.trim();
    if (!finalQuestion || sending) return;

    setInput("");
    setErrorMessage("");
    setSending(true);
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), sender: "cliente", text: finalQuestion },
    ]);

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: finalQuestion,
          role: isAdminChat ? "admin" : "customer",
        }),
      });
      const payload = (await response.json()) as { reply?: string; error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "No se pudo obtener respuesta.");
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          sender: "asistente",
          text: payload.reply || "No hay respuesta.",
        },
      ]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error al consultar el asistente.");
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void sendMessage();
  }

  if (checking || !profile) {
    return <SessionScreen message="Verificando sesión..." />;
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <AppHeader profile={profile} />
        <h1 className="text-3xl font-bold text-emerald-400">WhatsApp</h1>
        <p className="mt-2 text-slate-400">
          Primero elige si eres cliente o personal. Un número de teléfono no abre
          finanzas: eso depende del puesto.
        </p>

        <section className="mt-5 rounded-xl border border-slate-800 bg-slate-900 p-4">
          {!connectedPhone ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setVisitorKind("cliente")}
                  className={`rounded-lg px-4 py-2 font-semibold ${
                    visitorKind === "cliente"
                      ? "bg-amber-700 text-white"
                      : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                  }`}
                >
                  Soy cliente
                </button>
                <button
                  type="button"
                  onClick={() => setVisitorKind("personal")}
                  className={`rounded-lg px-4 py-2 font-semibold ${
                    visitorKind === "personal"
                      ? "bg-emerald-700 text-white"
                      : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                  }`}
                >
                  Soy personal
                </button>
              </div>

              {visitorKind === "personal" && (
                <label className="block text-sm text-slate-400">
                  Puesto
                  <select
                    value={staffRole}
                    onChange={(event) =>
                      setStaffRole(event.target.value as (typeof STAFF_ROLES)[number])
                    }
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-slate-100"
                  >
                    {STAFF_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {visitorKind === "personal" && (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="Número de personal, ej. 6861234567"
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={connectPhone}
                    className="rounded-lg bg-emerald-700 px-4 py-3 font-semibold hover:bg-emerald-600"
                  >
                    Identificarme
                  </button>
                </div>
              )}

              {visitorKind === "cliente" && (
                <p className="text-sm text-emerald-200/80">
                  Ya puedes escribir abajo. El asistente no comparte ventas ni lista de
                  empleados.
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-emerald-300">
                Conectado como {staffRole} · {connectedPhone}
              </p>
              <button
                type="button"
                onClick={disconnectPhone}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600"
              >
                Salir de personal
              </button>
            </div>
          )}
        </section>

        {isAdminChat && (
          <nav className="mt-4 flex flex-wrap gap-2">
            {ADMIN_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        {errorMessage && (
          <div className="mt-5 rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
            {errorMessage}
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 bg-emerald-950/40 px-4 py-3">
            <p className="font-semibold text-emerald-300">Chat del supermercado</p>
            <p className="text-xs text-slate-400">
              {isAdminChat
                ? `Modo ${staffRole} · datos internos`
                : visitorKind === "personal"
                  ? "Personal · sin finanzas"
                  : "Modo cliente · precios y horario"}
            </p>
          </div>

          <div className="h-[480px] space-y-4 overflow-y-auto p-5">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "cliente" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    message.sender === "cliente" ? "bg-emerald-700" : "bg-slate-800"
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
            {sending && (
              <p className="text-sm text-slate-500">Respondiendo...</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-3 border-t border-slate-800 p-4">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Escribe tu pregunta..."
              className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="rounded-xl bg-emerald-600 px-6 py-3 font-bold disabled:opacity-40"
            >
              Enviar
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
