"use client";

import { FormEvent, useState } from "react";
import { AppHeader, SessionScreen } from "@/components/AppHeader";
import { useErpSession } from "@/hooks/useErpSession";
import { saveFeedback, type FeedbackKind } from "@/lib/feedback";

export default function ContactPage() {
  const { checking, profile } = useErpSession();
  const [kind, setKind] = useState<FeedbackKind>("queja");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;

    saveFeedback({
      id: crypto.randomUUID(),
      kind,
      name: name.trim() || "Cliente",
      contact: contact.trim(),
      message: message.trim(),
      rating: null,
      createdAt: new Date().toISOString(),
    });
    setSent(true);
    setMessage("");
  }

  if (checking || !profile) {
    return <SessionScreen message="Cargando..." />;
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-xl">
        <AppHeader profile={profile} />
        <h1 className="text-3xl font-bold text-sky-400">Contacto con el negocio</h1>
        <p className="mt-2 text-slate-400">
          Quejas, sugerencias o comentarios para el propietario. El administrador
          los ve en el buzón.
        </p>

        {sent && (
          <div className="mt-5 rounded-lg border border-emerald-800 bg-emerald-950 p-4 text-emerald-300">
            Recibimos tu mensaje. Gracias por ayudarnos a mejorar.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as FeedbackKind)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
          >
            <option value="queja">Queja</option>
            <option value="sugerencia">Sugerencia</option>
            <option value="comentario">Comentario</option>
          </select>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Tu nombre"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
          />
          <input
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            placeholder="Teléfono o correo"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
          />
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Escribe tu mensaje"
            rows={5}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-sky-700 p-3 font-semibold hover:bg-sky-600"
          >
            Enviar al propietario
          </button>
        </form>
      </div>
    </main>
  );
}
