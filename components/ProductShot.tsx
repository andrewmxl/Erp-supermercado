"use client";

import { useEffect, useState } from "react";
import { barcodeSrc, displayPhoto, placeholderPhoto } from "@/lib/product-media";

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
  const photo = displayPhoto(name, category, imageUrl, sku);
  const [src, setSrc] = useState(photo);

  useEffect(() => {
    setSrc(photo);
  }, [photo]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      <div
        className={`flex items-center justify-center bg-slate-900 ${compact ? "h-16 w-16" : "h-40"}`}
      >
        <img
          src={src}
          alt={name}
          className="h-full w-full object-contain"
          loading="lazy"
          onError={() => setSrc(placeholderPhoto(name))}
        />
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
