"use client";

import { useEffect, useMemo, useState } from "react";
import { AppHeader, SessionScreen } from "@/components/AppHeader";
import { ProductShot } from "@/components/ProductShot";
import { useErpSession } from "@/hooks/useErpSession";
import { saveFeedback } from "@/lib/feedback";
import {
  CHARITY_NAME,
  PAYMENT_OPTIONS,
  SHIPPING_OPTIONS,
  STORE_ADDRESS,
  STORE_NAME,
  STORE_PHONE,
  STORE_RFC,
  TRANSFER_INFO,
  loyaltyForAmount,
  type PaymentMethod,
  type ShippingId,
} from "@/lib/store-info";
import { canUsePOS } from "@/lib/erp";
import { saveLocalSale } from "@/lib/local-ledger";

type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
  unit: "PIECE" | "KG";
  stock: number;
  barcode: string;
  imageUrl: string;
  category: string;
};

type CartItem = Product & {
  quantity: number;
};

type ReceiptLine = {
  name: string;
  quantity: number;
  price: number;
};

type SaleReceipt = {
  folio: string;
  dateLabel: string;
  cashier: string;
  items: ReceiptLine[];
  subtotal: number;
  shipping: number;
  donation: number;
  tip: number;
  total: number;
  payment: string;
  change: number;
  coupon: string;
  gift: string;
  discount: number;
};

function parseQuantity(value: string) {
  const normalized = value.trim().replace(",", ".");

  if (normalized === "") {
    return null;
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function formatQuantity(quantity: number, unit: "PIECE" | "KG") {
  if (unit === "PIECE") {
    return String(Math.floor(quantity));
  }

  return String(Number(quantity.toFixed(3)));
}

function receiptHtml(receipt: SaleReceipt) {
  const rows = receipt.items
    .map(
      (item) =>
        `<tr><td>${item.name}</td><td>${item.quantity}</td><td>$${(item.price * item.quantity).toFixed(2)}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Ticket ${receipt.folio}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #111; max-width: 420px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px 0; border-bottom: 1px solid #ddd; text-align: left; }
    .total { font-size: 20px; font-weight: 700; }
  </style>
</head>
<body>
  <h1>${STORE_NAME}</h1>
  <p>${STORE_ADDRESS}<br/>Tel. ${STORE_PHONE} · RFC ${STORE_RFC}</p>
  <p><strong>Folio ${receipt.folio}</strong><br/>${receipt.dateLabel}<br/>${receipt.cashier}</p>
  <table>
    <thead><tr><th>Producto</th><th>Cant.</th><th>Importe</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p>Subtotal: $${receipt.subtotal.toFixed(2)}</p>
  ${receipt.shipping > 0 ? `<p>Envío: $${receipt.shipping.toFixed(2)}</p>` : ""}
  ${receipt.donation > 0 ? `<p>Donativo: $${receipt.donation.toFixed(2)}</p>` : ""}
  ${receipt.tip > 0 ? `<p>Propina: $${receipt.tip.toFixed(2)}</p>` : ""}
  ${receipt.discount > 0 ? `<p>Premio ahora: -$${receipt.discount.toFixed(2)}</p>` : ""}
  <p class="total">Total: $${receipt.total.toFixed(2)}</p>
  <p>Pago: ${receipt.payment}</p>
  ${receipt.change > 0 ? `<p>Cambio: $${receipt.change.toFixed(2)}</p>` : ""}
  <p><strong>${receipt.gift}</strong><br/>${receipt.coupon}</p>
</body>
</html>`;
}

function saveReceiptFile(receipt: SaleReceipt) {
  const blob = new Blob([receiptHtml(receipt)], {
    type: "text/html;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ticket-${receipt.folio}.html`;
  link.click();
  URL.revokeObjectURL(url);
}

function printReceiptFile(receipt: SaleReceipt) {
  const popup = window.open("", "_blank", "width=480,height=720");
  if (!popup) {
    saveReceiptFile(receipt);
    return;
  }
  popup.document.write(receiptHtml(receipt));
  popup.document.close();
  popup.focus();
  popup.print();
}

export default function PosPage() {
  const { checking, profile } = useErpSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  const [quantityInputs, setQuantityInputs] = useState<
    Record<string, string>
  >({});

  const [cash, setCash] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [shippingId, setShippingId] = useState<ShippingId>("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [donationAmount, setDonationAmount] = useState(0);
  const [tipPercent, setTipPercent] = useState(0);
  const [customTip, setCustomTip] = useState("");
  const [loading, setLoading] = useState(true);
  const [charging, setCharging] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [askRating, setAskRating] = useState(false);
  const [ratingSaved, setRatingSaved] = useState("");
  const [receipt, setReceipt] = useState<SaleReceipt | null>(null);
  const [purchaseRating, setPurchaseRating] = useState(0);
  const [storeRating, setStoreRating] = useState(0);
  const [cashierRating, setCashierRating] = useState(0);

  async function loadProducts() {
    setLoading(true);
    setErrorMessage("");

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch("/api/products", {
        cache: "no-store",
        signal: controller.signal,
      });
      const payload = (await response.json()) as {
        products?: Array<{
          id: string;
          name: string;
          sku: string;
          sellPrice?: number;
          stock: number;
          unit: string;
          barcode?: string;
          imageUrl?: string;
          category?: string;
        }>;
      };

      if (!response.ok) {
        throw new Error("No se pudo leer el inventario.");
      }

      const realProducts: Product[] = (payload.products ?? []).map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: Number(product.sellPrice),
        stock: Number(product.stock),
        unit: product.unit === "KG" ? "KG" : "PIECE",
        barcode: product.barcode ?? "",
        imageUrl: product.imageUrl ?? "",
        category: product.category ?? "",
      }));

      setProducts(realProducts);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo cargar la caja."
      );
      setProducts([]);
    } finally {
      window.clearTimeout(timer);
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!checking && profile) {
      void loadProducts();
    }
  }, [checking, profile]);

  const filteredProducts = useMemo(() => {
    const text = search.trim().toLowerCase();

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(text) ||
        product.sku.toLowerCase().includes(text) ||
        product.barcode.toLowerCase().includes(text)
    );
  }, [products, search]);

  function handleSearchKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key !== "Enter") {
      return;
    }

    const value = search.trim();

    if (!value) {
      return;
    }

    const exactBarcodeProduct = products.find(
      (product) => product.barcode === value
    );

    if (exactBarcodeProduct) {
      addProduct(exactBarcodeProduct);
      setSearch("");
    }
  }

  function addProduct(product: Product) {
    setErrorMessage("");
    setSuccessMessage("");

    const increment = product.unit === "KG" ? 0.001 : 1;

    setCart((current) => {
      const existing = current.find(
        (item) => item.id === product.id
      );

      if (existing) {
        const newQuantity =
          product.unit === "KG"
            ? Number((existing.quantity + increment).toFixed(3))
            : existing.quantity + 1;

        if (newQuantity > product.stock) {
          setErrorMessage(
            `No hay suficiente existencia de ${product.name}.`
          );

          return current;
        }

        setQuantityInputs((previous) => ({
          ...previous,
          [product.id]: formatQuantity(
            newQuantity,
            product.unit
          ),
        }));

        return current.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: newQuantity,
              }
            : item
        );
      }

      if (product.stock < increment) {
        setErrorMessage(
          `No hay suficiente existencia de ${product.name}.`
        );

        return current;
      }

      setQuantityInputs((previous) => ({
        ...previous,
        [product.id]: formatQuantity(
          increment,
          product.unit
        ),
      }));

      return [
        ...current,
        {
          ...product,
          quantity: increment,
        },
      ];
    });
  }

  function confirmQuantity(item: CartItem) {
    const rawValue =
      quantityInputs[item.id] ?? String(item.quantity);

    const parsed = parseQuantity(rawValue);

    if (parsed === null || parsed <= 0) {
      setQuantityInputs((previous) => ({
        ...previous,
        [item.id]: formatQuantity(
          item.quantity,
          item.unit
        ),
      }));

      setErrorMessage(
        `Escribe una cantidad válida mayor que cero para ${item.name}.`
      );

      return;
    }

    let quantity: number;

    if (item.unit === "PIECE") {
      if (!Number.isInteger(parsed)) {
        setQuantityInputs((previous) => ({
          ...previous,
          [item.id]: formatQuantity(
            item.quantity,
            item.unit
          ),
        }));

        setErrorMessage(
          `${item.name} se vende por pieza. Usa números enteros como 1, 2, 3...`
        );

        return;
      }

      quantity = parsed;
    } else {
      quantity = Number(parsed.toFixed(3));

      if (quantity < 0.001) {
        quantity = 0.001;
      }
    }

    if (quantity > item.stock) {
      setQuantityInputs((previous) => ({
        ...previous,
        [item.id]: formatQuantity(
          item.quantity,
          item.unit
        ),
      }));

      setErrorMessage(
        `No hay suficiente inventario. ${item.name} tiene únicamente ${
          item.stock
        } ${item.unit === "KG" ? "kg" : "pzas"} disponibles.`
      );

      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    setCart((current) =>
      current.map((currentItem) =>
        currentItem.id === item.id
          ? {
              ...currentItem,
              quantity,
            }
          : currentItem
      )
    );

    setQuantityInputs((previous) => ({
      ...previous,
      [item.id]: formatQuantity(
        quantity,
        item.unit
      ),
    }));
  }

  function changeQuantityWithArrow(
    item: CartItem,
    amount: number
  ) {
    const rawValue =
      quantityInputs[item.id] ?? String(item.quantity);

    const parsed = parseQuantity(rawValue);

    const currentQuantity =
      parsed !== null ? parsed : item.quantity;

    let newQuantity = currentQuantity + amount;

    if (item.unit === "PIECE") {
      newQuantity = Math.floor(newQuantity);

      if (newQuantity < 1) {
        newQuantity = 1;
      }
    } else {
      newQuantity = Number(newQuantity.toFixed(3));

      if (newQuantity < 0.001) {
        newQuantity = 0.001;
      }
    }

    if (newQuantity > item.stock) {
      setErrorMessage(
        `No puedes exceder el stock disponible de ${item.name}: ${
          item.stock
        } ${item.unit === "KG" ? "kg" : "pzas"}.`
      );

      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    setCart((current) =>
      current.map((currentItem) =>
        currentItem.id === item.id
          ? {
              ...currentItem,
              quantity: newQuantity,
            }
          : currentItem
      )
    );

    setQuantityInputs((previous) => ({
      ...previous,
      [item.id]: formatQuantity(
        newQuantity,
        item.unit
      ),
    }));
  }

  function removeProduct(id: string) {
    setErrorMessage("");
    setSuccessMessage("");

    setCart((current) =>
      current.filter((item) => item.id !== id)
    );

    setQuantityInputs((previous) => {
      const copy = { ...previous };
      delete copy[id];
      return copy;
    });
  }

  const subtotal = useMemo(() => {
    return cart.reduce(
      (sum, item) =>
        sum + item.price * item.quantity,
      0
    );
  }, [cart]);

  const shipping = SHIPPING_OPTIONS.find((option) => option.id === shippingId)!;
  const shippingCost = shipping.cost;
  const parsedCustomTip = Number(customTip.replace(",", ".")) || 0;
  const tipAmount =
    tipPercent > 0
      ? Number(((subtotal * tipPercent) / 100).toFixed(2))
      : Number(parsedCustomTip.toFixed(2));
  const grandTotal = Number(
    (subtotal + shippingCost + donationAmount + tipAmount).toFixed(2)
  );
  const loyalty = loyaltyForAmount(subtotal);
  const payableTotal = Number((grandTotal - loyalty.discount).toFixed(2));

  const cashNumber = Number(
    cash.trim().replace(",", ".")
  ) || 0;

  const change = Math.max(
    cashNumber - payableTotal,
    0
  );

  const paymentReady =
    paymentMethod === "cash"
      ? cashNumber >= payableTotal
      : true;

  const shippingReady =
    shippingId === "pickup" || deliveryAddress.trim().length >= 8;

  async function chargeSale() {
    if (charging) {
      return;
    }

    if (!profile) {
      setErrorMessage("No hay una sesión de cajero activa.");
      return;
    }

    if (cart.length === 0) {
      setErrorMessage("El carrito está vacío.");
      return;
    }

    if (!shippingReady) {
      setErrorMessage("Para envío a domicilio escribe la dirección de entrega.");
      return;
    }

    if (paymentMethod === "cash" && cashNumber < payableTotal) {
      setErrorMessage(
        "El efectivo recibido no alcanza para cubrir el total (productos + envío + donativo + propina)."
      );
      return;
    }

    setCharging(true);
    setErrorMessage("");
    setSuccessMessage("");

    const saleId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const folio = saleId.slice(0, 8).toUpperCase();
    const soldCart = cart.map((item) => ({ ...item }));
    const soldSubtotal = subtotal;
    const soldShipping = shippingCost;
    const soldDonation = donationAmount;
    const soldTip = tipAmount;
    const soldDiscount = loyalty.discount;
    const soldTotal = payableTotal;
    const soldChange = change;
    const soldPayment =
      PAYMENT_OPTIONS.find((option) => option.id === paymentMethod)?.label ??
      paymentMethod;
    const soldCoupon = loyalty.coupon || "Sigue comprando para ganar cupones CACHA.";
    const soldGift =
      loyalty.gift ||
      (loyalty.nextMin
        ? `Te faltan $${loyalty.remaining.toFixed(2)} para: ${loyalty.nextGift}`
        : "Gracias por tu compra");

    try {
      saveLocalSale({
        id: saleId,
        folio,
        totalAmount: soldTotal,
        createdAt,
        cashRegister: 1,
      });
    } catch {
      // El ticket se emite igual si el almacenamiento local falla.
    }

    setProducts((current) =>
      current.map((product) => {
        const sold = soldCart.find((item) => item.id === product.id);
        if (!sold) return product;
        return {
          ...product,
          stock: Number((product.stock - sold.quantity).toFixed(3)),
        };
      })
    );

    setReceipt({
      folio,
      dateLabel: new Date(createdAt).toLocaleString("es-MX"),
      cashier: `${profile.name} · ${profile.role}`,
      items: soldCart.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal: soldSubtotal,
      shipping: soldShipping,
      donation: soldDonation,
      tip: soldTip,
      total: soldTotal,
      payment: soldPayment,
      change: paymentMethod === "cash" ? soldChange : 0,
      coupon: soldCoupon,
      gift: soldGift,
      discount: soldDiscount,
    });

    setSuccessMessage(
      `Venta cobrada. Folio ${folio}. Total $${soldTotal.toFixed(2)}. Entrega el ticket al cliente.`
    );
    setAskRating(true);
    setPurchaseRating(0);
    setStoreRating(0);
    setCashierRating(0);
    setRatingSaved("");

    setCart([]);
    setQuantityInputs({});
    setCash("");
    setSearch("");
    setDonationAmount(0);
    setTipPercent(0);
    setCustomTip("");
    setDeliveryAddress("");
    setShippingId("pickup");
    setPaymentMethod("cash");
    setCharging(false);

    void loadProducts();
  }

  if (checking || !profile) {
    return <SessionScreen message="Verificando sesión..." />;
  }

  if (!canUsePOS(profile.role)) {
    return (
      <SessionScreen message="Este perfil no cobra en caja. Entra como cajero, supervisor, gerente o cliente." />
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-7xl">
      <AppHeader profile={profile} />
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-sky-400">Punto de venta</h1>
        <p className="mt-1 text-slate-400">
          Caja 1 · {profile.name} · {profile.role}
        </p>
      </header>

      {successMessage && (
        <div className="mb-5 rounded-lg border border-emerald-800 bg-emerald-950 p-4 text-emerald-300">
          {successMessage}
        </div>
      )}

      {askRating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="w-full max-w-lg rounded-xl border border-amber-800 bg-slate-900 p-5">
          <p className="font-semibold text-amber-200">
            Califica esta visita
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Compra, sucursal y personal. Luego te mostramos el recibo para guardarlo o imprimirlo.
          </p>
          {receipt?.gift ? (
            <div className="mt-3 rounded-lg border border-amber-600 bg-amber-950/60 p-3 text-sm text-amber-100">
              <p className="font-semibold">Premio de esta compra</p>
              <p>{receipt.gift}</p>
              <p>{receipt.coupon}</p>
              {receipt.discount > 0 ? (
                <p>Descuento aplicado ahora: ${receipt.discount.toFixed(2)}</p>
              ) : null}
            </div>
          ) : null}
          {(
            [
              ["Compra", purchaseRating, setPurchaseRating],
              ["Sucursal", storeRating, setStoreRating],
              ["Personal", cashierRating, setCashierRating],
            ] as const
          ).map(([label, value, setter]) => (
            <div key={label} className="mt-3 flex flex-wrap items-center gap-2">
              <span className="w-24 text-sm text-slate-300">{label}</span>
              {[1, 2, 3, 4, 5].map((stars) => (
                <button
                  key={stars}
                  type="button"
                  onClick={() => setter(stars)}
                  className={`rounded-lg px-3 py-1 text-sm font-semibold ${
                    value >= stars
                      ? "bg-amber-600 text-white"
                      : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                  }`}
                >
                  {stars} ★
                </button>
              ))}
            </div>
          ))}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                const scores = [purchaseRating, storeRating, cashierRating].filter(
                  (value) => value > 0
                );
                const average = scores.length
                  ? Math.round(
                      scores.reduce((sum, value) => sum + value, 0) / scores.length
                    )
                  : null;
                saveFeedback({
                  id: crypto.randomUUID(),
                  kind: "calificacion",
                  name: "Cliente en caja",
                  contact: "",
                  message: `Compra ${purchaseRating}/5 · sucursal ${storeRating}/5 · cajero ${cashierRating}/5. Folio ${receipt?.folio ?? ""}.`,
                  rating: average || null,
                  purchaseRating,
                  storeRating,
                  cashierRating,
                  createdAt: new Date().toISOString(),
                });
                setAskRating(false);
                setRatingSaved("Gracias. Guardamos tu calificación.");
              }}
              className="rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white hover:bg-amber-600"
            >
              Enviar calificación
            </button>
            <button
              type="button"
              onClick={() => setAskRating(false)}
              className="rounded-lg bg-slate-800 px-4 py-2 text-slate-200 hover:bg-slate-700"
            >
              Omitir
            </button>
          </div>
        </div>
        </div>
      )}

      {!askRating && receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <section className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl border border-emerald-800 bg-white p-5 text-slate-900">
            <button
              type="button"
              onClick={() => setReceipt(null)}
              className="absolute right-3 top-3 rounded-full bg-slate-800 px-3 py-1 text-lg font-bold text-white hover:bg-slate-700"
              aria-label="Cerrar recibo"
            >
              ×
            </button>
            <div className="flex flex-wrap items-start justify-between gap-3 pr-10">
              <div>
                <p className="text-xs uppercase tracking-widest text-emerald-800">
                  Ticket de compra
                </p>
                <h2 className="text-2xl font-bold">{STORE_NAME}</h2>
                <p className="text-sm text-slate-600">{STORE_ADDRESS}</p>
                <p className="text-sm text-slate-600">
                  Tel. {STORE_PHONE} · RFC {STORE_RFC}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-lg font-bold">Folio {receipt.folio}</p>
                <p className="text-sm text-slate-600">{receipt.dateLabel}</p>
                <p className="text-sm text-slate-600">{receipt.cashier}</p>
              </div>
            </div>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="py-2">Producto</th>
                  <th className="py-2">Cant.</th>
                  <th className="py-2 text-right">Importe</th>
                </tr>
              </thead>
              <tbody>
                {receipt.items.map((item, index) => (
                  <tr key={`${item.name}-${index}`} className="border-b border-slate-100">
                    <td className="py-2">{item.name}</td>
                    <td className="py-2">{item.quantity}</td>
                    <td className="py-2 text-right">
                      ${(item.price * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 space-y-1 text-sm">
              <p>Subtotal: ${receipt.subtotal.toFixed(2)}</p>
              {receipt.shipping > 0 && <p>Envío: ${receipt.shipping.toFixed(2)}</p>}
              {receipt.donation > 0 && (
                <p>
                  Donativo {CHARITY_NAME}: ${receipt.donation.toFixed(2)}
                </p>
              )}
              {receipt.tip > 0 && <p>Propina: ${receipt.tip.toFixed(2)}</p>}
              {receipt.discount > 0 && (
                <p className="text-emerald-700">
                  Premio ahora: -${receipt.discount.toFixed(2)}
                </p>
              )}
              <p className="text-lg font-bold">Total: ${receipt.total.toFixed(2)}</p>
              <p>Pago: {receipt.payment}</p>
              {receipt.change > 0 && <p>Cambio: ${receipt.change.toFixed(2)}</p>}
              <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
                <p className="font-semibold text-amber-900">{receipt.gift}</p>
                <p className="text-sm text-amber-800">{receipt.coupon}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              ¿Quieres guardar el ticket, imprimirlo, o ambos?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => saveReceiptFile(receipt)}
                className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Guardar ticket
              </button>
              <button
                type="button"
                onClick={() => printReceiptFile(receipt)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Imprimir
              </button>
              <button
                type="button"
                onClick={() => {
                  saveReceiptFile(receipt);
                  printReceiptFile(receipt);
                }}
                className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
              >
                Guardar e imprimir
              </button>
            </div>
          </section>
        </div>
      )}

      {ratingSaved && (
        <p className="mb-5 text-sm text-amber-300">{ratingSaved}</p>
      )}

      {errorMessage && (
        <div className="mb-5 rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
          Error: {errorMessage}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <section>
          <input
            type="text"
            placeholder="Buscar por nombre, SKU o código de barras..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            onKeyDown={handleSearchKeyDown}
            className="mb-5 w-full rounded-xl border border-slate-700 bg-slate-900 p-4 outline-none focus:border-sky-500"
          />

          {loading && (
            <p className="text-slate-400">
              Cargando productos de Supabase...
            </p>
          )}

          {!loading && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() =>
                    addProduct(product)
                  }
                  disabled={
                    charging ||
                    product.stock <= 0
                  }
                  className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-left transition hover:border-sky-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ProductShot
                    name={product.name}
                    category={product.category}
                    imageUrl={product.imageUrl}
                    barcode={product.barcode}
                    sku={product.sku}
                  />

                  <h2 className="text-lg font-semibold">
                    {product.name}
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    SKU: {product.sku}
                  </p>

                  <p className="mt-4 text-2xl font-bold text-emerald-400">
                    $
                    {product.price.toFixed(
                      2
                    )}

                    <span className="text-sm text-slate-400">
                      {product.unit === "KG"
                        ? " / kg"
                        : " / pza"}
                    </span>
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    Stock: {product.stock}{" "}
                    {product.unit === "KG"
                      ? "kg"
                      : "pzas"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-5 text-2xl font-bold">
            Carrito
          </h2>

          {cart.length === 0 ? (
            <div className="rounded-lg bg-slate-800 p-8 text-center text-slate-400">
              Agrega productos para comenzar la venta.
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg bg-slate-800 p-4"
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {item.name}
                      </p>

                      <p className="text-sm text-slate-400">
                        $
                        {item.price.toFixed(
                          2
                        )}
                        {item.unit === "KG"
                          ? " / kg"
                          : " / pza"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeProduct(
                          item.id
                        )
                      }
                      disabled={charging}
                      className="text-red-400 disabled:opacity-40"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mt-3">
                    <label className="mb-2 block text-xs text-slate-400">
                      {item.unit === "KG"
                        ? "Cantidad en kg"
                        : "Cantidad en piezas"}
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={charging}
                        onClick={() =>
                          changeQuantityWithArrow(
                            item,
                            item.unit ===
                              "KG"
                              ? -0.001
                              : -1
                          )
                        }
                        className="rounded-lg bg-slate-700 px-3 py-2 font-bold hover:bg-slate-600 disabled:opacity-40"
                      >
                        −
                      </button>

                      <input
                        type="text"
                        inputMode={
                          item.unit === "KG"
                            ? "decimal"
                            : "numeric"
                        }
                        value={
                          quantityInputs[
                            item.id
                          ] ??
                          formatQuantity(
                            item.quantity,
                            item.unit
                          )
                        }
                        disabled={charging}
                        onChange={(
                          event
                        ) => {
                          setQuantityInputs(
                            (previous) => ({
                              ...previous,
                              [item.id]:
                                event
                                  .target
                                  .value,
                            })
                          );
                        }}
                        onBlur={() =>
                          confirmQuantity(
                            item
                          )
                        }
                        onKeyDown={(
                          event
                        ) => {
                          if (
                            event.key ===
                            "Enter"
                          ) {
                            confirmQuantity(
                              item
                            );

                            event.currentTarget.blur();
                          }
                        }}
                        className="w-32 rounded-lg border border-slate-600 bg-slate-950 p-2 text-center disabled:opacity-50"
                      />

                      <button
                        type="button"
                        disabled={charging || item.quantity >= item.stock}
                        onClick={() =>
                          changeQuantityWithArrow(
                            item,
                            item.unit ===
                              "KG"
                              ? 0.001
                              : 1
                          )
                        }
                        className="rounded-lg bg-slate-700 px-3 py-2 font-bold hover:bg-slate-600 disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>

                    <p className="mt-2 text-xs text-amber-200">
                      Inventario disponible: {item.stock}
                      {item.unit === "KG" ? " kg" : " pzas"}.
                      {item.quantity >= item.stock
                        ? " Ya llegaste al máximo; no hay más existencia de este producto."
                        : ` Puedes agregar hasta ${
                            item.unit === "KG"
                              ? Number((item.stock - item.quantity).toFixed(3))
                              : item.stock - item.quantity
                          }${item.unit === "KG" ? " kg" : " pzas"} más.`}
                    </p>

                    {item.unit ===
                      "KG" && (
                      <p className="mt-2 text-xs text-slate-500">
                        Ejemplos:
                        0.009 = 9 g ·
                        0.100 = 100 g ·
                        0.500 = 500 g ·
                        1.5 = 1.5 kg
                      </p>
                    )}

                    {item.unit ===
                      "PIECE" && (
                      <p className="mt-2 text-xs text-slate-500">
                        Este producto
                        se vende por
                        piezas enteras.
                      </p>
                    )}

                    <div className="mt-3 flex justify-between">
                      <span className="text-sm text-slate-400">
                        Subtotal
                      </span>

                      <span className="font-bold">
                        $
                        {(
                          item.price *
                          item.quantity
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 space-y-4 border-t border-slate-700 pt-5">
            <div className="rounded-lg border border-amber-700 bg-amber-950/40 p-3 text-sm text-amber-100">
              {loyalty.gift ? (
                <>
                  <p className="font-semibold">Premio por esta compra</p>
                  <p>{loyalty.gift}</p>
                  <p>{loyalty.coupon}</p>
                  {loyalty.discount > 0 ? (
                    <p>Descuento ahora: ${loyalty.discount.toFixed(2)}</p>
                  ) : null}
                </>
              ) : loyalty.nextMin ? (
                <>
                  <p className="font-semibold">Premios para que compres más</p>
                  <p>
                    Te faltan ${loyalty.remaining.toFixed(2)} para llegar a $
                    {loyalty.nextMin.toLocaleString("es-MX")} y obtener: {loyalty.nextGift}
                  </p>
                  <p className="mt-1 text-xs text-amber-200/80">
                    $150 cupón 5% · $400 vale $50 · $1,000 despensa $100 + 5% ahora + cupón 15%
                  </p>
                </>
              ) : null}
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-300">Entrega</p>
              <div className="space-y-2">
                {SHIPPING_OPTIONS.map((option) => {
                  const selected = shippingId === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={charging}
                      onClick={() => setShippingId(option.id)}
                      className={`w-full rounded-lg border p-3 text-left text-sm ${
                        selected
                          ? "border-amber-400 bg-amber-900/70 text-amber-50"
                          : "border-slate-700 bg-slate-800 text-slate-200 hover:border-slate-500"
                      }`}
                    >
                      <span className="font-semibold">{option.label}</span>
                      <span className={selected ? "text-amber-200" : "text-emerald-400"}>
                        {" "}
                        · {option.cost === 0 ? "Sin costo" : `$${option.cost.toFixed(2)}`}
                      </span>
                      <span className="mt-1 block text-xs text-slate-300">
                        {option.detail}
                      </span>
                    </button>
                  );
                })}
              </div>
              {shippingId !== "pickup" && (
                <input
                  value={deliveryAddress}
                  onChange={(event) => setDeliveryAddress(event.target.value)}
                  disabled={charging}
                  placeholder="Dirección de entrega"
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm"
                />
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-300">
                ¿Donativo a {CHARITY_NAME}?
              </p>
              <div className="flex flex-wrap gap-2">
                {[0, 10, 20, 50].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    disabled={charging}
                    onClick={() => setDonationAmount(amount)}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      donationAmount === amount
                        ? "bg-rose-700"
                        : "bg-slate-800 hover:bg-slate-700"
                    }`}
                  >
                    {amount === 0 ? "No, gracias" : `$${amount}`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-300">
                ¿Propina para el cajero?
              </p>
              <div className="flex flex-wrap gap-2">
                {[0, 10, 15].map((percent) => (
                  <button
                    key={percent}
                    type="button"
                    disabled={charging}
                    onClick={() => {
                      setTipPercent(percent);
                      setCustomTip("");
                    }}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      tipPercent === percent && customTip === ""
                        ? "bg-amber-700"
                        : "bg-slate-800 hover:bg-slate-700"
                    }`}
                  >
                    {percent === 0 ? "Sin propina" : `${percent}%`}
                  </button>
                ))}
              </div>
              <input
                value={customTip}
                disabled={charging}
                onChange={(event) => {
                  setCustomTip(event.target.value);
                  setTipPercent(0);
                }}
                placeholder="Otra propina $"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm"
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-300">Forma de pago</p>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    disabled={charging}
                    onClick={() => setPaymentMethod(option.id)}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      paymentMethod === option.id
                        ? "bg-sky-700"
                        : "bg-slate-800 hover:bg-slate-700"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {paymentMethod === "transfer" && (
                <p className="mt-2 text-xs text-slate-400">
                  {TRANSFER_INFO.bank} · CLABE {TRANSFER_INFO.clabe} · {TRANSFER_INFO.beneficiary}
                </p>
              )}
              {(paymentMethod === "card" || paymentMethod === "contactless") && (
                <p className="mt-2 text-xs text-slate-400">
                  Pasa la tarjeta o acerca el celular. En esta demo el cobro se marca aprobado.
                </p>
              )}
            </div>

            <div className="space-y-1 text-sm text-slate-400">
              <div className="flex justify-between">
                <span>Productos</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Envío</span>
                <span>${shippingCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Donativo</span>
                <span>${donationAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Propina</span>
                <span>${tipAmount.toFixed(2)}</span>
              </div>
              {loyalty.discount > 0 && (
                <div className="flex justify-between text-amber-200">
                  <span>Premio ahora</span>
                  <span>-${loyalty.discount.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between text-2xl font-bold">
              <span>Total a cobrar</span>
              <span className="text-emerald-400">${payableTotal.toFixed(2)}</span>
            </div>

            {paymentMethod === "cash" && (
              <>
                <label className="block text-sm text-slate-400">Efectivo recibido</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={cash}
                  disabled={charging}
                  onChange={(event) => setCash(event.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-xl disabled:opacity-50"
                />
                <div className="flex justify-between">
                  <span className="text-slate-400">Cambio</span>
                  <span className="text-xl font-bold text-sky-400">${change.toFixed(2)}</span>
                </div>
              </>
            )}

            <button
              type="button"
              onClick={chargeSale}
              disabled={
                charging ||
                cart.length === 0 ||
                !paymentReady ||
                !shippingReady
              }
              className="w-full rounded-xl bg-emerald-600 p-4 text-lg font-bold hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {charging ? "Procesando venta..." : "Cobrar venta"}
            </button>
          </div>
        </aside>
      </div>
      </div>
    </main>
  );
}