"use client";

import { useEffect, useState } from "react";
import { barcodeSrc, displayPhoto, uniquePhoto } from "@/lib/product-media";

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
  const boxWidth = compact ? 108 : 280;
  const height = compact ? 108 : 200;
  const label = name || "Producto";
  const photo = displayPhoto(label, category, imageUrl, sku);
  const fallback = `/api/catalog-photo?${new URLSearchParams({
    name: label,
    category,
    sku,
  }).toString()}`;
  const [src, setSrc] = useState(photo);

  useEffect(() => {
    setSrc(photo);
  }, [photo]);

  return (
    <div className="overflow-hidden rounded-xl border-2 border-amber-400 bg-white">
      <div className="flex justify-center bg-slate-900 p-1">
        <img
          src={src}
          alt=""
          width={boxWidth}
          height={height}
          referrerPolicy="no-referrer"
          className="rounded-md object-cover"
          style={{ width: boxWidth, height, minWidth: boxWidth, minHeight: height }}
          onError={() => {
            if (src !== fallback && src !== uniquePhoto(label, sku)) {
              setSrc(fallback);
              return;
            }
            if (src !== uniquePhoto(label, sku)) {
              setSrc(uniquePhoto(label, sku));
            }
          }}
        />
      </div>
      {barcode ? (
        <div className="border-t border-slate-200 bg-white px-2 py-2">
          <img
            src={barcodeSrc(barcode)}
            alt=""
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
