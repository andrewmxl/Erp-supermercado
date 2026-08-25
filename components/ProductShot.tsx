"use client";

import { barcodeSrc, productIcon, productSwatch } from "@/lib/product-media";

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
  const icon = productIcon(name, sku, category);
  const swatch = productSwatch(name, sku || category);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
      <div
        className={`flex flex-col items-center justify-center px-2 ${compact ? "h-20 w-20" : "min-h-44 w-full py-4"}`}
        style={{ background: uploaded ? "#fff" : swatch.background }}
      >
        {uploaded ? (
          <img src={imageUrl} alt={name} className="h-28 w-full object-contain" />
        ) : (
          <>
            <span className={compact ? "text-3xl" : "text-7xl"} aria-hidden>
              {icon}
            </span>
            {!compact ? (
              <p className="mt-3 max-w-full truncate text-center text-base font-bold text-white drop-shadow">
                {name}
              </p>
            ) : null}
          </>
        )}
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
