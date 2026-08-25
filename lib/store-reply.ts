import {
  answerBusinessQuestion,
  catalogToAssistantProducts,
} from "@/lib/assistant";
import { demoProducts } from "@/lib/demo-catalog";
import { tryCreateDataClient } from "@/utils/supabase/data";

const STORE_HOURS = "Lunes a domingo de 8:00 a.m. a 10:00 p.m.";

export async function replyToStoreQuestion(
  question: string,
  isAdmin = false
) {
  const fallback = catalogToAssistantProducts(demoProducts());
  let products = fallback;
  let sales: Array<{ id: string; totalAmount: number; createdAt: string }> = [];
  let saleItems: Array<{ productId: string; quantity: number }> = [];

  const supabase = tryCreateDataClient();
  if (supabase) {
    try {
      const [{ data: dbProducts }, { data: dbSales }, { data: dbSaleItems }] =
        await Promise.all([
          supabase
            .from("Product")
            .select("id, name, sku, sellPrice, stock, minStock, unit, category, barcode"),
          supabase.from("Sale").select("id, totalAmount, createdAt"),
          supabase.from("SaleItem").select("productId, quantity"),
        ]);

      const mapped = catalogToAssistantProducts(
        (dbProducts ?? []).map((product) => ({
          id: product.id,
          name: product.name ?? "",
          sku: product.sku ?? "",
          sellPrice: Number(product.sellPrice ?? 0),
          stock: Number(product.stock ?? 0),
          minStock: Number(product.minStock ?? 0),
          unit: product.unit === "KG" ? "KG" : "PIECE",
          category: product.category ?? "",
          barcode: product.barcode ?? "",
        }))
      );

      if (mapped.length > 0) {
        products = mapped;
      }

      sales = (dbSales ?? []).map((sale) => ({
        id: sale.id,
        totalAmount: Number(sale.totalAmount ?? 0),
        createdAt: sale.createdAt ?? "",
      }));
      saleItems = (dbSaleItems ?? []).map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity ?? 0),
      }));
    } catch {
      products = fallback;
    }
  }

  return answerBusinessQuestion(question, {
    storeHours: STORE_HOURS,
    isAdmin,
    products,
    sales,
    saleItems,
  });
}
