"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AppHeader, SessionScreen } from "@/components/AppHeader";
import { useErpSession } from "@/hooks/useErpSession";
import { canAskBusinessData, isClient, normalizeRole, STAFF_ROLES } from "@/lib/erp";

type ChatMessage = {
  id: string;
  sender: "cliente" | "asistente";
  text: string;
};

const ADMIN_LINKS = [
  { href: "/", label: "Inicio" },
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
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "asistente",
      text: "Hola. Ya estás en el chat de la tienda. Pregunta precio, existencia u horario.",
    },
  ]);

  const staffChat = Boolean(profile) && !isClient(profile?.role);
  const isAdminChat = staffChat && canAskBusinessData(profile?.role);

  useEffect(() => {
    if (!profile) return;
    const role = normalizeRole(profile.role);
    if (role === "Cliente") {
      setVisitorKind("cliente");
      return;
    }
    const staff = STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number])
      ? (role as (typeof STAFF_ROLES)[number])
      : "Gerente";
    setVisitorKind("personal");
    setStaffRole(staff);
  }, [profile]);

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
        throw new Error(payload.error || payload.reply || "No se pudo obtener respuesta.");
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
      const text =
        error instanceof Error
          ? error.message
          : "Error al consultar el asistente.";
      setErrorMessage(text);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          sender: "asistente",
          text:
            "Ahora mismo no pude completar la consulta, pero sí te atiendo. Pregunta precio, existencia u horario. Ejemplo: ¿cuánto cuesta la leche?",
        },
      ]);
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
          Ya entras con tu perfil de la tienda. Escribe abajo; no hace falta volver a identificarte.
        </p>

        <section className="mt-5 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm text-emerald-300">
            {isClient(profile.role)
              ? `Sesión de cliente · ${profile.name}. Pregunta precio, existencia u horario.`
              : `Sesión de ${profile.role} · ${profile.name}. ${
                  isAdminChat
                    ? "Puedes consultar datos internos del negocio."
                    : "Este puesto no ve finanzas."
                }`}
          </p>
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

          <form
            onSubmit={handleSubmit}
            className="relative z-20 flex gap-3 border-t border-slate-800 bg-slate-900 p-4"
          >
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="Escribe tu pregunta... Ejemplo: ¿cuánto cuesta la leche?"
              rows={3}
              autoComplete="off"
              autoFocus
              className="relative z-20 min-h-[72px] flex-1 resize-y rounded-xl border border-slate-500 bg-slate-950 px-4 py-3 text-base text-white outline-none focus:border-emerald-400"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="self-end rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white disabled:opacity-40"
            >
              Enviar
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
