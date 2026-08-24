"use client";

import { useEffect, useState } from "react";
import { AppHeader, SessionScreen } from "@/components/AppHeader";
import { useErpSession } from "@/hooks/useErpSession";
import { isAdmin } from "@/lib/erp";
import { averageRating, loadFeedback, type StoreFeedback } from "@/lib/feedback";

export default function FeedbackInboxPage() {
  const { checking, profile } = useErpSession();
  const [items, setItems] = useState<StoreFeedback[]>([]);

  useEffect(() => {
    setItems(loadFeedback());
  }, []);

  if (checking || !profile) {
    return <SessionScreen message="Verificando sesión..." />;
  }

  if (!isAdmin(profile.role)) {
    return <SessionScreen message="Solo el administrador puede ver el buzón." />;
  }

  const rating = averageRating(items);

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <AppHeader profile={profile} />
        <h1 className="text-3xl font-bold text-amber-300">Buzón del negocio</h1>
        <p className="mt-2 text-slate-400">
          Quejas, sugerencias y calificaciones de clientes.
          {rating > 0 ? ` Promedio: ${rating.toFixed(1)} / 5` : ""}
        </p>

        <div className="mt-6 space-y-4">
          {items.length === 0 ? (
            <p className="text-slate-500">Aún no hay mensajes.</p>
          ) : (
            items.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-slate-800 bg-slate-900 p-5"
              >
                <p className="text-sm uppercase text-sky-400">{item.kind}</p>
                <p className="mt-1 font-semibold">{item.name}</p>
                {item.contact ? (
                  <p className="text-sm text-slate-400">{item.contact}</p>
                ) : null}
                {item.rating ? (
                  <p className="mt-2 text-amber-300">Calificación: {item.rating} / 5</p>
                ) : null}
                <p className="mt-3 text-slate-200">{item.message}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {new Date(item.createdAt).toLocaleString("es-MX")}
                </p>
              </article>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
