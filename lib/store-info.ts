export const STORE_NAME = "Supermercado Cachanilla";
export const STORE_TAGLINE = "Abarrotes, fresco y despensa · Mexicali, B.C.";
export const STORE_ADDRESS = "Calle Comercial 120, Centro Cívico, Mexicali, B.C.";
export const STORE_PHONE = "686 123 4500";
export const STORE_RFC = "SCA010101XX1";
export const STORE_HERO_IMAGE =
  "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1600&q=80";

export const CHARITY_NAME = "Comedor Comunitario Mexicali";

export const PAYMENT_OPTIONS = [
  { id: "cash", label: "Efectivo" },
  { id: "transfer", label: "Transferencia SPEI" },
  { id: "card", label: "Tarjeta débito/crédito" },
  { id: "contactless", label: "Contactless / NFC" },
] as const;

export type PaymentMethod = (typeof PAYMENT_OPTIONS)[number]["id"];

export const SHIPPING_OPTIONS = [
  {
    id: "pickup",
    label: "Recoger en tienda",
    cost: 0,
    detail: "Listo en 20 a 40 minutos. Calle Comercial 120, Mexicali.",
  },
  {
    id: "center",
    label: "Envío zona centro (hasta 5 km)",
    cost: 35,
    detail: "Entrega el mismo día, 1 a 2 horas.",
  },
  {
    id: "city",
    label: "Envío zona urbana",
    cost: 55,
    detail: "Entrega el mismo día, 2 a 4 horas.",
  },
  {
    id: "express",
    label: "Envío express (60 min)",
    cost: 85,
    detail: "Prioritario dentro de 8 km. Pedido mínimo $150.",
  },
] as const;

export type ShippingId = (typeof SHIPPING_OPTIONS)[number]["id"];

export const TRANSFER_INFO = {
  bank: "BBVA",
  clabe: "012 760 001234567890",
  beneficiary: "Supermercado Cachanilla S.A. de C.V.",
  concept: "Venta caja 1",
};

export function shippingCopy() {
  return SHIPPING_OPTIONS.map(
    (option) =>
      `• ${option.label}: ${option.cost === 0 ? "sin costo" : `$${option.cost.toFixed(2)}`} — ${option.detail}`
  ).join("\n");
}

export function paymentCopy() {
  return (
    "Formas de pago: efectivo, transferencia SPEI, tarjeta y contactless (NFC).\n" +
    `Transferencia: ${TRANSFER_INFO.bank} · CLABE ${TRANSFER_INFO.clabe} · ${TRANSFER_INFO.beneficiary}.`
  );
}
