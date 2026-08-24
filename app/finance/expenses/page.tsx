"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppHeader, SessionScreen } from "@/components/AppHeader";
import { useErpSession } from "@/hooks/useErpSession";
import { isAdmin, money } from "@/lib/erp";
import { createClient } from "@/utils/supabase/client";

type Expense = {
  id: string;
  amount: number;
  expenseDate: string;
};

export default function ExpensesPage() {
  const { checking, profile } = useErpSession({ adminOnly: true });
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadExpenses() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("Expense")
      .select("id, amount, expenseDate")
      .order("expenseDate", { ascending: false });

    if (error) {
      setErrorMessage(`No se pudieron cargar los gastos: ${error.message}`);
      return;
    }

    setExpenses(
      (data ?? []).map((expense) => ({
        id: expense.id,
        amount: Number(expense.amount ?? 0),
        expenseDate: expense.expenseDate ?? "",
      }))
    );
  }

  useEffect(() => {
    if (!checking && profile) {
      void loadExpenses();
    }
  }, [checking, profile]);

  async function addExpense(event: FormEvent) {
    event.preventDefault();
    const parsed = Number(amount.replace(",", "."));

    if (!Number.isFinite(parsed) || parsed <= 0) {
      setErrorMessage("Escribe un monto válido mayor que cero.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const supabase = createClient();
    const { error } = await supabase.from("Expense").insert({
      id: crypto.randomUUID(),
      amount: Number(parsed.toFixed(2)),
      expenseDate: new Date(`${expenseDate}T12:00:00`).toISOString(),
    });

    if (error) {
      setErrorMessage(`No se pudo guardar el gasto: ${error.message}`);
      setSaving(false);
      return;
    }

    setAmount("");
    setSuccessMessage("Gasto registrado.");
    await loadExpenses();
    setSaving(false);
  }

  async function deleteExpense(expense: Expense) {
    const confirmed = window.confirm("¿Eliminar este gasto?");
    if (!confirmed) return;

    const supabase = createClient();
    const { error } = await supabase.from("Expense").delete().eq("id", expense.id);

    if (error) {
      setErrorMessage(`No se pudo eliminar: ${error.message}`);
      return;
    }

    await loadExpenses();
  }

  if (checking || !profile) {
    return <SessionScreen message="Verificando sesión..." />;
  }

  if (!isAdmin(profile.role)) {
    return <SessionScreen message="Solo el administrador puede registrar gastos." />;
  }

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-4xl">
        <AppHeader profile={profile} />
        <h1 className="text-3xl font-bold text-rose-400">Gastos</h1>
        <p className="mt-2 text-slate-400">Registro de egresos para el cálculo de utilidad</p>

        {successMessage && (
          <div className="mt-5 rounded-lg border border-emerald-800 bg-emerald-950 p-4 text-emerald-300">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mt-5 rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
            {errorMessage}
          </div>
        )}

        <form
          onSubmit={addExpense}
          className="mt-6 grid gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-[1fr_1fr_auto]"
        >
          <div>
            <label className="mb-2 block text-sm text-slate-400">Monto</label>
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-slate-400">Fecha</label>
            <input
              type="date"
              value={expenseDate}
              onChange={(event) => setExpenseDate(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="self-end rounded-lg bg-rose-700 px-5 py-3 font-semibold hover:bg-rose-600 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Agregar"}
          </button>
        </form>

        <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex justify-between">
            <h2 className="text-xl font-bold">Historial</h2>
            <p className="font-semibold text-rose-300">Total: {money(total)}</p>
          </div>
          {expenses.length === 0 ? (
            <p className="text-slate-400">No hay gastos registrados.</p>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between rounded-lg bg-slate-800 p-4"
                >
                  <div>
                    <p className="font-semibold">{money(expense.amount)}</p>
                    <p className="text-sm text-slate-400">
                      {new Date(expense.expenseDate).toLocaleDateString("es-MX")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void deleteExpense(expense)}
                    className="text-sm text-red-300 hover:text-red-200"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
