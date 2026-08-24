export function ean13Checksum(digits12: string) {
  const digits = digits12.split("").map(Number);
  let sum = 0;
  for (let index = 0; index < 12; index += 1) {
    sum += digits[index] * (index % 2 === 0 ? 1 : 3);
  }
  return String((10 - (sum % 10)) % 10);
}

export function barcodeFromSku(sku: string, fallbackIndex = 1) {
  const cleaned = sku.replace(/[^0-9a-z]/gi, "").toUpperCase();
  let hash = 0;
  for (let index = 0; index < cleaned.length; index += 1) {
    hash = (hash * 31 + cleaned.charCodeAt(index)) % 10000000;
  }
  const body = String(750000000000 + (hash || fallbackIndex) + fallbackIndex).slice(0, 12);
  return body + ean13Checksum(body);
}

export function barcodeImageUrl(code: string) {
  const value = code.trim() || "0";
  const isEan13 = /^\d{13}$/.test(value);
  const bcid = isEan13 ? "ean13" : "code128";
  return `https://bwipjs-api.metafloor.com/?bcid=${bcid}&text=${encodeURIComponent(value)}&scale=2&includetext&backgroundcolor=ffffff`;
}
