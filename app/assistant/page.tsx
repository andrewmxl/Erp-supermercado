"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
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
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 200);
    return () => window.clearTimeout(timer);
  }, [profile?.id]);

  async function sendMessage() {
    const finalQuestion = inputRef.current?.value.trim() ?? "";
    if (!finalQuestion || sending) return;

    if (inputRef.current) inputRef.current.value = "";
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
    <main className="min-h-screen bg-slate-950 p-6 pb-40 text-slate-100">
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

        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900">
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

          <div className="h-[420px] space-y-4 overflow-y-auto p-5">
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
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="fixed bottom-0 left-0 right-0 z-[200] border-t-2 border-emerald-500 bg-slate-900 p-4"
      >
        <div className="mx-auto flex max-w-3xl gap-3">
          <label className="sr-only" htmlFor="whatsapp-input">
            Escribe tu pregunta
          </label>
          <input
            id="whatsapp-input"
            ref={inputRef}
            type="text"
            name="mensaje"
            enterKeyHint="send"
            autoComplete="off"
            autoCorrect="on"
            spellCheck
            disabled={false}
            readOnly={false}
            placeholder="Toca aquí y escribe, por ejemplo: precio de la leche"
            className="h-14 flex-1 rounded-xl border-2 border-emerald-400 bg-white px-4 text-lg text-black outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            disabled={sending}
            className="rounded-xl bg-emerald-600 px-6 font-bold text-white disabled:opacity-40"
          >
            Enviar
          </button>
        </div>
      </form>
    </main>
  );
}
