import { NextResponse } from "next/server";
import { answerBusinessQuestion } from "@/lib/assistant";
import { createDataClient } from "@/utils/supabase/data";

const STORE_HOURS = "Lunes a domingo de 8:00 a.m. a 10:00 p.m.";

async function buildReply(question: string) {
  const supabase = createDataClient();
  const [{ data: products }, { data: sales }, { data: saleItems }] =
    await Promise.all([
      supabase
        .from("Product")
        .select("id, name, sku, sellPrice, stock, minStock, unit, category, barcode"),
      supabase.from("Sale").select("id, totalAmount, createdAt"),
      supabase.from("SaleItem").select("productId, quantity"),
    ]);

  return answerBusinessQuestion(question, {
    storeHours: STORE_HOURS,
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
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    channel: "whatsapp-webhook",
    message: "Listo para conectar Twilio, Green API o Meta Cloud API.",
  });
}

export async function POST(request: Request) {
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
  const provided = request.headers.get("x-webhook-secret");

  if (secret && provided !== secret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = (await request.json()) as { Body?: string; body?: string; question?: string };
  const question = (body.Body || body.body || body.question || "").trim();

  if (!question) {
    return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
  }

  const reply = await buildReply(question);
  return NextResponse.json({ reply });
}
