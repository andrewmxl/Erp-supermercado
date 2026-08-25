/** Cifras fijas del catálogo de demostración (100 SKU). No dependen de Supabase. */
export const ADMIN_KPI = {
  productCount: 100,
  lowStockCount: 8,
  todayRevenue: 3487.5,
} as const;

export function adminCatalogStats() {
  return {
    productCount: ADMIN_KPI.productCount,
    lowStockCount: ADMIN_KPI.lowStockCount,
    todayRevenue: ADMIN_KPI.todayRevenue,
  };
}
