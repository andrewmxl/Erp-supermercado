"use client";

import { useEffect, useMemo, useState } from "react";
import { AppHeader, SessionScreen } from "@/components/AppHeader";
import { useErpSession } from "@/hooks/useErpSession";
import { isAdmin, money, startOfDay, startOfMonth, startOfWeek } from "@/lib/erp";
import { createClient } from "@/utils/supabase/client";

type Sale = {
  id: string;
  totalAmount: number;
  createdAt: string;
  cashRegister: number;
};

type Expense = {
  amount: number;
  expenseDate: string;
};

export default function FinancePage() {
  const { checking, profile } = useErpSession({ adminOnly: true });
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadFinance() {
    setLoading(true);
    setErrorMessage("");
    const supabase = createClient();

    const [salesResult, expensesResult] = await Promise.all([
      supabase
        .from("Sale")
        .select("id, totalAmount, createdAt, cashRegister")
        .order("createdAt", { ascending: false }),
      supabase.from("Expense").select("amount, expenseDate"),
    ]);

    if (salesResult.error) {
      setErrorMessage(`No se pudieron cargar las ventas: ${salesResult.error.message}`);
      setLoading(false);
      return;
    }

    if (expensesResult.error) {
      setErrorMessage(`No se pudieron cargar los gastos: ${expensesResult.error.message}`);
    }

    setSales(
      (salesResult.data ?? []).map((sale) => ({
        id: sale.id,
        totalAmount: Number(sale.totalAmount ?? 0),
        createdAt: sale.createdAt ?? "",
        cashRegister: Number(sale.cashRegister ?? 1),
      }))
    );
    setExpenses(
      (expensesResult.data ?? []).map((expense) => ({
        amount: Number(expense.amount ?? 0),
        expenseDate: expense.expenseDate ?? "",
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    if (!checking && profile) {
      void loadFinance();
    }
  }, [checking, profile]);

  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const todaySales = useMemo(
    () => sales.filter((sale) => new Date(sale.createdAt) >= todayStart),
    [sales, todayStart]
  );
  const weekSales = useMemo(
    () => sales.filter((sale) => new Date(sale.createdAt) >= weekStart),
    [sales, weekStart]
  );
  const monthSales = useMemo(
    () => sales.filter((sale) => new Date(sale.createdAt) >= monthStart),
    [sales, monthStart]
  );

  const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const weekRevenue = weekSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const monthRevenue = monthSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const monthExpenses = expenses
    .filter((expense) => new Date(expense.expenseDate) >= monthStart)
    .reduce((sum, expense) => sum + expense.amount, 0);
  const profit = monthRevenue - monthExpenses;
  const averageTicket = monthSales.length > 0 ? monthRevenue / monthSales.length : 0;

  if (checking || !profile) {
    return <SessionScreen message="Verificando sesión..." />;
  }

  if (!isAdmin(profile.role)) {
    return <SessionScreen message="Solo el gerente puede ver finanzas." />;
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <AppHeader profile={profile} />
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-emerald-400">Finanzas</h1>
            <p className="mt-1 text-slate-400">Ventas, gastos y utilidad del supermercado</p>
          </div>
          <button
            type="button"
            onClick={() => void loadFinance()}
            disabled={loading}
            className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold hover:bg-emerald-600 disabled:opacity-50"
          >
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
        </div>

        {errorMessage && (
          <div className="mb-5 rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
            {errorMessage}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card title="Ventas de hoy" value={money(todayRevenue)} note={`${todaySales.length} operaciones`} />
          <Card title="Ventas de la semana" value={money(weekRevenue)} note={`${weekSales.length} operaciones`} />
          <Card title="Ventas del mes" value={money(monthRevenue)} note={`${monthSales.length} operaciones`} />
          <Card title="Gastos del mes" value={money(monthExpenses)} note="Egresos registrados" />
          <Card title="Utilidad estimada" value={money(profit)} note="Ventas − gastos del mes" />
          <Card title="Ticket promedio" value={money(averageTicket)} note="Promedio mensual" />
        </section>

        <section className="mt-7 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-bold">Últimas ventas</h2>
          {loading ? (
            <p className="mt-4 text-slate-400">Cargando...</p>
          ) : sales.length === 0 ? (
            <p className="mt-4 text-slate-400">Aún no hay ventas.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-sm text-slate-400">
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Caja</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.slice(0, 25).map((sale) => (
                    <tr key={sale.id} className="border-b border-slate-800">
                      <td className="p-3">{new Date(sale.createdAt).toLocaleString("es-MX")}</td>
                      <td className="p-3">Caja {sale.cashRegister}</td>
                      <td className="p-3 text-right font-bold text-emerald-400">
                        {money(sale.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Card({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-2 text-3xl font-bold text-emerald-400">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{note}</p>
    </div>
  );
}
