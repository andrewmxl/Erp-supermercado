"use client";

import { barcodeSrc, photoForProduct, productSwatch } from "@/lib/product-media";

export function ProductShot({
  name,
  category = "",
  imageUrl,
  barcode,
  sku = "",
  compact = false,
}: {
  name: string;
  category?: string;
  imageUrl?: string;
  barcode?: string;
  sku?: string;
  compact?: boolean;
}) {
  const swatch = productSwatch(name, sku || category);
  const uploaded = Boolean(
    imageUrl &&
      (imageUrl.includes("supabase.co/storage") || imageUrl.startsWith("blob:"))
  );
  const src = uploaded ? imageUrl : photoForProduct(name, category, sku);

  return (
    <div className="overflow-hidden rounded-xl border border-amber-800/50 bg-slate-950">
      <div
        className={`relative ${compact ? "h-16 w-16" : "h-44 w-full"}`}
        style={{ background: swatch.background }}
      >
        <img
          src={src}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1">
          <p
            className={`text-center font-semibold text-white ${compact ? "text-[8px] leading-tight" : "text-sm"}`}
          >
            {name}
          </p>
        </div>
      </div>
      {barcode ? (
        <div className="border-t border-slate-800 bg-white px-2 py-2">
          <img
            src={barcodeSrc(barcode)}
            alt={`Código de barras ${barcode}`}
            className="mx-auto h-10 w-full object-contain"
          />
          <p className="mt-1 text-center font-mono text-[10px] tracking-widest text-slate-700">
            {barcode}
          </p>
        </div>
      ) : null}
    </div>
  );
}
