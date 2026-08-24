import { NextResponse } from "next/server";
import { createDataClient } from "@/utils/supabase/data";

export async function GET() {
  try {
    const supabase = createDataClient();
    const query = supabase
      .from("Product")
      .select(
        "id, name, sku, buyPrice, sellPrice, stock, minStock, unit, category, barcode, imageUrl"
      )
      .order("name")
      .limit(200);

    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), 8000);
    });

    const { data, error } = await Promise.race([query, timeout]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ products: data ?? [] });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "timeout"
        ? "Supabase no respondió a tiempo. Revisa URL, clave y que la tabla Product exista."
        : error instanceof Error
          ? error.message
          : "No se pudo leer el inventario.";
    return NextResponse.json({ error: message }, { status: 504 });
  }
}
