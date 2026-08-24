import { barcodeFromSku } from "@/lib/barcode";
import { photoForProduct } from "@/lib/product-media";
import { createDataClient } from "@/utils/supabase/data";

export async function enrichProductMedia() {
  const supabase = createDataClient();
  const { data, error } = await supabase
    .from("Product")
    .select("id, name, sku, category, barcode, imageUrl");

  if (error) {
    throw new Error(error.message);
  }

  let updated = 0;

  for (const [index, product] of (data ?? []).entries()) {
    const barcode =
      String(product.barcode ?? "").trim() ||
      barcodeFromSku(product.sku || product.id, index + 1);
    const imageUrl = photoForProduct(product.name ?? "", product.category ?? "");

    const { error: updateError } = await supabase
      .from("Product")
      .update({ barcode, imageUrl })
      .eq("id", product.id);

    if (updateError) {
      throw new Error(`${product.name}: ${updateError.message}`);
    }

    updated += 1;
  }

  return { updated };
}
