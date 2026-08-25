"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppHeader, SessionScreen } from "@/components/AppHeader";
import { useErpSession } from "@/hooks/useErpSession";
import { canSeeFinance, canSeeMailbox, canManageUsers, canUsePOS, isClient, money } from "@/lib/erp";
import { STORE_HERO_IMAGE, STORE_NAME, STORE_TAGLINE } from "@/lib/store-info";
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
      title: isClient(profile.role) ? "Comprar" : "Punto de venta",
      text: isClient(profile.role)
        ? "Arma tu pedido, paga y recibe cupón o regalo si aplica."
        : "Cobrar piezas y kilos, calcular cambio y descontar inventario.",
      show: canUsePOS(profile.role),
    },
    {
      href: "/inventory",
      title: "Inventario",
      text: "Alta, edición, códigos de barras, stock mínimo e imágenes.",
      show: !isClient(profile.role),
    },
    {
      href: "/finance",
      title: "Finanzas",
      text: "Ventas del día, semana y mes, ticket promedio y utilidad.",
      show: canSeeFinance(profile.role),
    },
    {
      href: "/assistant",
      title: "WhatsApp",
      text: "Cliente pregunta precios. El personal entra con su puesto, no solo con un número.",
      show: true,
    },
    {
      href: "/contact",
      title: "Contacto",
      text: "Quejas, sugerencias o comentarios para el propietario del negocio.",
      show: true,
    },
    {
      href: "/finance/expenses",
      title: "Gastos",
      text: "Registrar egresos para calcular utilidad del mes.",
      show: canSeeFinance(profile.role),
    },
    {
      href: "/users",
      title: "Usuarios",
      text: "Alta de personal: gerente, supervisor, cajero y técnico.",
      show: canManageUsers(profile.role),
    },
    {
      href: "/feedback",
      title: "Buzón",
      text: "Mensajes de clientes y calificaciones de la compra.",
      show: canSeeMailbox(profile.role),
    },
  ].filter((item) => item.show);

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <AppHeader profile={profile} />

        <section className="overflow-hidden rounded-2xl border border-emerald-900">
          <div className="relative h-48 w-full md:h-56">
            <img
              src={STORE_HERO_IMAGE}
              alt={`Pasillo de ${STORE_NAME}`}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-950/35 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
                {STORE_NAME}
              </p>
              <h1 className="mt-1 text-3xl font-bold text-white">Panel de control</h1>
              <p className="mt-1 text-sm text-emerald-100">{STORE_TAGLINE}</p>
            </div>
          </div>
        </section>

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
