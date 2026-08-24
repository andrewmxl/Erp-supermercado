"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AppHeader, SessionScreen } from "@/components/AppHeader";
import { useErpSession } from "@/hooks/useErpSession";

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
  const [phone, setPhone] = useState("");
  const [connectedPhone, setConnectedPhone] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "asistente",
      text: "Hola. Escribe tu pregunta (precio, existencia u horario). Si eres del negocio, conecta tu número para entrar como administrador.",
    },
  ]);

  const isAdminChat = Boolean(connectedPhone);

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
        text: `Número ${value} conectado. Estás en modo administrador: puedes preguntar por ventas e inventario y abrir las pantallas del ERP.`,
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
          El cliente escribe su pregunta y el agente responde. Conecta un número para
          usar el chat como administrador.
        </p>

        <section className="mt-5 rounded-xl border border-slate-800 bg-slate-900 p-4">
          {!isAdminChat ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Tu número, ej. 6861234567"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={connectPhone}
                className="rounded-lg bg-emerald-700 px-4 py-3 font-semibold hover:bg-emerald-600"
              >
                Conectar número
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-emerald-300">
                Conectado como administrador · {connectedPhone}
              </p>
              <button
                type="button"
                onClick={disconnectPhone}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600"
              >
                Salir de admin
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
              {isAdminChat ? "Modo administrador" : "Modo cliente · escribe tu pregunta"}
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
