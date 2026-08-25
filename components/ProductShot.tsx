"use client";

import { barcodeSrc, hueFrom } from "@/lib/product-media";

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
  const hue = hueFrom(`${sku}|${name}|${category}`);
  const size = compact ? 88 : 220;
  const title = name || "Producto";
  const code = sku || "";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
      <div className={compact ? "p-1" : "p-2"}>
        {uploaded ? (
          <img
            src={imageUrl}
            alt={title}
            className={compact ? "h-24 w-24 object-cover" : "h-48 w-full object-cover"}
          />
        ) : (
          <svg
            width={size}
            height={size}
            viewBox="0 0 400 400"
            role="img"
            aria-label={title}
            className="block rounded-lg"
          >
            <rect width="400" height="400" fill={`hsl(${hue}, 62%, 30%)`} />
            <rect
              x="16"
              y="16"
              width="368"
              height="368"
              rx="28"
              fill={`hsl(${hue}, 48%, 20%)`}
              stroke="#f6efe4"
              strokeWidth="10"
            />
            <circle cx="200" cy="148" r="58" fill="#f6efe4" />
            <text
              x="200"
              y="262"
              textAnchor="middle"
              fill="#f6efe4"
              fontSize="28"
              fontFamily="Arial, Helvetica, sans-serif"
              fontWeight="700"
            >
              {title.length > 22 ? `${title.slice(0, 20)}…` : title}
            </text>
            <text
              x="200"
              y="304"
              textAnchor="middle"
              fill="#d9c89a"
              fontSize="22"
              fontFamily="Arial, Helvetica, sans-serif"
            >
              {code}
            </text>
          </svg>
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
