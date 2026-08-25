"use client";

import { barcodeSrc, productSwatch } from "@/lib/product-media";

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
      (imageUrl.includes("supabase.co/storage") ||
        imageUrl.startsWith("blob:") ||
        (imageUrl.startsWith("data:image/") && !imageUrl.includes("svg")))
  );

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      <div
        className={`relative flex items-center justify-center px-2 text-center ${compact ? "h-16 w-16" : "h-40"}`}
        style={{ background: swatch.background }}
      >
        {uploaded ? (
          <img src={imageUrl} alt={name} className="h-full w-full object-contain" />
        ) : (
          <div>
            <p
              className={`font-semibold leading-tight text-amber-50 ${compact ? "text-[9px]" : "text-sm"}`}
            >
              {name}
            </p>
            {!compact && sku ? (
              <p className="mt-1 font-mono text-[11px] text-amber-200/80">{sku}</p>
            ) : null}
          </div>
        )}
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
