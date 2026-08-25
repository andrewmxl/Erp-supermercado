import catalog from "@/lib/demo-products.json";

type CatalogRow = {
  stock: number;
  minStock: number;
};

const products = catalog as CatalogRow[];

/** Cifras del catálogo de demostración para el panel del gerente. */
export function adminCatalogStats() {
  return {
    productCount: products.length,
    lowStockCount: products.filter(
      (product) => Number(product.stock) <= Number(product.minStock)
    ).length,
    todayRevenue: 3487.5,
  };
}
