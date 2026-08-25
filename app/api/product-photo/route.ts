import { NextResponse } from "next/server";

function hueFrom(value: string) {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash % 360;
}

function xml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const name = xml((url.searchParams.get("name") ?? "Producto").slice(0, 36));
  const sku = xml((url.searchParams.get("sku") ?? "").slice(0, 20));
  const hue = hueFrom(`${sku}|${name}`);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="560" viewBox="0 0 800 560">
  <rect width="800" height="560" fill="hsl(${hue},55%,28%)"/>
  <rect x="24" y="24" width="752" height="512" fill="none" stroke="#f4efe6" stroke-width="4" rx="24"/>
  <text x="400" y="250" text-anchor="middle" fill="#f4efe6" font-size="36" font-family="Arial, Helvetica, sans-serif" font-weight="700">${name}</text>
  <text x="400" y="310" text-anchor="middle" fill="#d7c39a" font-size="22" font-family="Arial, Helvetica, sans-serif">${sku || "Cachanilla"}</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
