"use client";

import { barcodeSrc } from "@/lib/product-media";

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
  const uploaded = Boolean(
    imageUrl &&
      (imageUrl.includes("supabase.co/storage") || imageUrl.startsWith("blob:"))
  );
  const src = uploaded
    ? imageUrl
    : sku
      ? `/products/${encodeURIComponent(sku)}.svg`
      : `/products/LAC-001.svg`;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
      <div className={compact ? "p-1" : "p-2"}>
        <img
          src={src}
          alt={name || category}
          width={compact ? 96 : 280}
          height={compact ? 96 : 280}
          className={compact ? "h-24 w-24 rounded-lg object-cover" : "h-48 w-full rounded-lg object-cover"}
        />
      </div>
      {barcode ? (
        <div className="border-t border-slate-200 bg-white px-2 py-2">
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
