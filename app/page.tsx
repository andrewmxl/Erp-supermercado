"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppHeader, SessionScreen } from "@/components/AppHeader";
import { useErpSession } from "@/hooks/useErpSession";
import { isAdmin, money } from "@/lib/erp";
import { createClient } from "@/utils/supabase/client";

type Product = {
  stock: number;
  minStock: number;
};

type Sale = {
  totalAmount: number;
  createdAt: string;
};

export default function DashboardPage() {
  const { checking, profile } = useErpSession();
  const [productCount, setProductCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [sales, setSales] = useState<Sale[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (checking || !profile) return;

    async function load() {
      const supabase = createClient();
      const [{ data: products, error: productError }, { data: salesData, error: salesError }] =
        await Promise.all([
          supabase.from("Product").select("stock, minStock"),
          supabase.from("Sale").select("totalAmount, createdAt"),
        ]);

      if (productError) {
        setErrorMessage(productError.message);
        return;
      }
      if (salesError) {
        setErrorMessage(salesError.message);
        return;
      }

      const mapped = (products ?? []) as Product[];
      setProductCount(mapped.length);
      setLowStockCount(
        mapped.filter((product) => Number(product.stock) <= Number(product.minStock)).length
      );
      setSales(
        (salesData ?? []).map((sale) => ({
          totalAmount: Number(sale.totalAmount ?? 0),
          createdAt: sale.createdAt ?? "",
        }))
      );
    }

    load();
  }, [checking, profile]);

  const todayRevenue = useMemo(() => {
    const now = new Date();
    return sales
      .filter((sale) => {
        const date = new Date(sale.createdAt);
        return (
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth() &&
          date.getDate() === now.getDate()
        );
      })
      .reduce((sum, sale) => sum + sale.totalAmount, 0);
  }, [sales]);

  if (checking || !profile) {
    return <SessionScreen message="Verificando sesión..." />;
  }

  const modules = [
    {
      href: "/pos",
      title: "Punto de venta",
      text: "Cobrar piezas y kilos, calcular cambio y descontar inventario.",
    },
    {
      href: "/inventory",
      title: "Inventario",
      text: "Alta, edición, códigos de barras, stock mínimo e imágenes.",
    },
    {
      href: "/finance",
      title: "Finanzas",
      text: "Ventas del día, semana y mes, ticket promedio y utilidad.",
    },
    {
      href: "/assistant",
      title: "WhatsApp",
      text: "El cliente pregunta y el agente responde. Conecta tu número para entrar como administrador.",
    },
    {
      href: "/contact",
      title: "Contacto",
      text: "Quejas, sugerencias o comentarios para el propietario del negocio.",
    },
  ];

  if (isAdmin(profile.role)) {
    modules.push(
      {
        href: "/finance/expenses",
        title: "Gastos",
        text: "Registrar egresos para calcular utilidad del mes.",
      },
      {
        href: "/users",
        title: "Usuarios",
        text: "Roles de Administrador y Cajero, con permisos distintos.",
      },
      {
        href: "/feedback",
        title: "Buzón",
        text: "Mensajes de clientes y calificaciones de la compra.",
      }
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <AppHeader profile={profile} />

        <h1 className="text-3xl font-bold text-sky-400">Panel de control</h1>
        <p className="mt-2 text-slate-400">
          ERP integral: punto de venta, inventarios, finanzas y agente de IA
          (demo WhatsApp en el navegador).
        </p>

        {errorMessage && (
          <div className="mt-5 rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
            {errorMessage}
          </div>
        )}

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Ventas de hoy</p>
            <p className="mt-2 text-3xl font-bold text-emerald-400">{money(todayRevenue)}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Productos</p>
            <p className="mt-2 text-3xl font-bold">{productCount}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Stock bajo</p>
            <p className={`mt-2 text-3xl font-bold ${lowStockCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
              {lowStockCount}
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {modules.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border border-slate-800 bg-slate-900 p-6 hover:border-sky-500"
            >
              <h2 className="text-xl font-bold">{item.title}</h2>
              <p className="mt-2 text-sm text-slate-400">{item.text}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
