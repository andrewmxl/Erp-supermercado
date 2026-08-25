import { NextResponse } from "next/server";
import { demoProducts } from "@/lib/demo-catalog";
import { tryCreateDataClient } from "@/utils/supabase/data";

export async function GET() {
  const fallback = demoProducts();

  try {
    const supabase = tryCreateDataClient();
    if (!supabase) {
      return NextResponse.json({ products: fallback, source: "demo" });
    }

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

    if (error || !data?.length) {
      return NextResponse.json({ products: fallback, source: "demo" });
    }

    return NextResponse.json({ products: data, source: "database" });
  } catch {
    return NextResponse.json({ products: fallback, source: "demo" });
  }
}
