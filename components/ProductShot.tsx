"use client";

import { useEffect, useRef } from "react";
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uploaded = Boolean(
    imageUrl &&
      (imageUrl.includes("supabase.co/storage") || imageUrl.startsWith("blob:"))
  );
  const width = compact ? 108 : 280;
  const height = compact ? 108 : 200;
  const label = name || "Producto";
  const code = sku || category || "";

  useEffect(() => {
    if (uploaded) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const hue = hueFrom(`${sku}|${label}|${category}`);
    ctx.fillStyle = `hsl(${hue}, 70%, 38%)`;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = `hsl(${hue}, 55%, 22%)`;
    ctx.fillRect(8, 8, width - 16, height - 16);

    ctx.beginPath();
    ctx.arc(width / 2, height * 0.38, Math.min(width, height) * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = "#fff6e8";
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = compact ? "bold 11px Arial" : "bold 18px Arial";
    wrapText(ctx, label, width / 2, height * 0.68, width - 16, compact ? 13 : 22);
    ctx.fillStyle = "#ffe08a";
    ctx.font = compact ? "10px Arial" : "14px Arial";
    ctx.fillText(code, width / 2, height - 14);
  }, [uploaded, label, code, category, sku, width, height]);

  return (
    <div className="overflow-hidden rounded-xl border-2 border-amber-400 bg-white">
      <div className="flex justify-center bg-slate-900 p-1">
        {uploaded ? (
          <img
            src={imageUrl}
            alt={label}
            width={width}
            height={height}
            className="rounded-md object-cover"
          />
        ) : (
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="rounded-md"
          />
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

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  let row = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, row);
      line = word;
      row += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, row);
}
