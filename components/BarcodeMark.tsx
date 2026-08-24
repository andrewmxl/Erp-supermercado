export function BarcodeMark({ code }: { code: string }) {
  if (!code) {
    return null;
  }

  const isEan13 = /^\d{13}$/.test(code);
  const bcid = isEan13 ? "ean13" : "code128";
  const src = `https://bwipjs-api.metafloor.com/?bcid=${bcid}&text=${encodeURIComponent(code)}&scale=2&includetext&backgroundcolor=ffffff`;

  return (
    <div className="mt-2 rounded bg-white p-2">
      <img src={src} alt={`Código de barras ${code}`} className="mx-auto h-12 w-full object-contain" />
    </div>
  );
}
