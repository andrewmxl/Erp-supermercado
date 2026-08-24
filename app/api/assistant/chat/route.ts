import { NextResponse } from "next/server";
import { answerBusinessQuestion } from "@/lib/assistant";
import { createDataClient } from "@/utils/supabase/data";

const STORE_HOURS = "Lunes a domingo de 8:00 a.m. a 10:00 p.m.";

export async function POST(request: Request) {
  const body = (await request.json()) as { question?: string; role?: string };
  const question = body.question?.trim() ?? "";
  const isAdmin = body.role === "admin";

  if (!question) {
    return NextResponse.json({ error: "Escribe una pregunta." }, { status: 400 });
  }

  const supabase = createDataClient();
  const [{ data: products }, { data: sales }, { data: saleItems }] =
    await Promise.all([
      supabase
        .from("Product")
        .select("id, name, sku, sellPrice, stock, minStock, unit, category, barcode"),
      supabase.from("Sale").select("id, totalAmount, createdAt"),
      supabase.from("SaleItem").select("productId, quantity"),
    ]);

  const reply = answerBusinessQuestion(question, {
    storeHours: STORE_HOURS,
    isAdmin,
    products: (products ?? []).map((product) => ({
      id: product.id,
      name: product.name ?? "",
      sku: product.sku ?? "",
      sellPrice: Number(product.sellPrice ?? 0),
      stock: Number(product.stock ?? 0),
      minStock: Number(product.minStock ?? 0),
      unit: product.unit === "KG" ? "KG" : "PIECE",
      category: product.category ?? "",
      barcode: product.barcode ?? "",
    })),
    sales: (sales ?? []).map((sale) => ({
      id: sale.id,
      totalAmount: Number(sale.totalAmount ?? 0),
      createdAt: sale.createdAt ?? "",
    })),
    saleItems: (saleItems ?? []).map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity ?? 0),
    })),
  });

  return NextResponse.json({ reply });
}
