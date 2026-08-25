import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(
  readFileSync(join(root, "lib", "demo-products.json"), "utf8")
);
const outDir = join(root, "public", "products");
mkdirSync(outDir, { recursive: true });

function hue(value) {
  let hash = 0;
  for (const char of String(value)) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash % 360;
}

function xml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

for (const product of catalog) {
  const h = hue(product.sku);
  const name = xml(product.name);
  const sku = xml(product.sku);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="hsl(${h},60%,32%)"/>
  <rect x="18" y="18" width="364" height="364" fill="hsl(${h},50%,22%)" stroke="#f6efe4" stroke-width="8" rx="28"/>
  <circle cx="200" cy="150" r="54" fill="#f6efe4"/>
  <text x="200" y="268" text-anchor="middle" fill="#f6efe4" font-size="26" font-family="Arial, Helvetica, sans-serif" font-weight="700">${name}</text>
  <text x="200" y="308" text-anchor="middle" fill="#d9c89a" font-size="20" font-family="Arial, Helvetica, sans-serif">${sku}</text>
</svg>`;
  writeFileSync(join(outDir, `${product.sku}.svg`), svg);
}

console.log(`Wrote ${catalog.length} SVGs to public/products`);
