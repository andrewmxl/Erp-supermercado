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
  TRANSFER_INFO,
  type PaymentMethod,
  type ShippingId,
} from "@/lib/store-info";
import { createClient } from "@/utils/supabase/client";

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

  async function loadProducts() {
    setLoading(true);
    setErrorMessage("");

    const supabase = createClient();

    const { data, error } = await supabase
      .from("Product")
      .select("id, name, sku, sellPrice, stock, unit, barcode, imageUrl, category")
      .order("name");

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const realProducts: Product[] = (data ?? []).map((product) => ({
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
    setLoading(false);
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

  const cashNumber = Number(
    cash.trim().replace(",", ".")
  ) || 0;

  const change = Math.max(
    cashNumber - grandTotal,
    0
  );

  const paymentReady =
    paymentMethod === "cash"
      ? cashNumber >= grandTotal
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

    if (paymentMethod === "cash" && cashNumber < grandTotal) {
      setErrorMessage(
        "El efectivo recibido no alcanza para cubrir el total (productos + envío + donativo + propina)."
      );
      return;
    }

    setCharging(true);
    setErrorMessage("");
    setSuccessMessage("");

    const supabase = createClient();

    const saleId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const { error: saleError } = await supabase
      .from("Sale")
      .insert({
        id: saleId,
        cashRegister: 1,
        totalAmount: grandTotal,
        userId: profile.id,
        createdAt,
      });

    if (saleError) {
      setErrorMessage(
        `No se pudo registrar la venta: ${saleError.message}`
      );

      setCharging(false);
      return;
    }

    const saleItems = cart.map((item) => ({
      id: crypto.randomUUID(),
      saleId,
      productId: item.id,
      quantity: item.quantity,
      price: Number(item.price.toFixed(2)),
    }));

    const { error: itemsError } = await supabase
      .from("SaleItem")
      .insert(saleItems);

    if (itemsError) {
      await supabase
        .from("Sale")
        .delete()
        .eq("id", saleId);

      setErrorMessage(
        `No se pudieron guardar los productos de la venta: ${itemsError.message}`
      );

      setCharging(false);
      return;
    }

    const updatedProducts: {
      id: string;
      previousStock: number;
    }[] = [];

    for (const item of cart) {
      const newStock = Number(
        (item.stock - item.quantity).toFixed(3)
      );

      if (newStock < 0) {
        for (const previous of updatedProducts) {
          await supabase
            .from("Product")
            .update({
              stock: previous.previousStock,
            })
            .eq("id", previous.id);
        }

        await supabase
          .from("SaleItem")
          .delete()
          .eq("saleId", saleId);

        await supabase
          .from("Sale")
          .delete()
          .eq("id", saleId);

        setErrorMessage(
          `No hay suficiente existencia de ${item.name}.`
        );

        setCharging(false);
        return;
      }

      const { error: stockError } = await supabase
        .from("Product")
        .update({
          stock: newStock,
        })
        .eq("id", item.id);

      if (stockError) {
        for (const previous of updatedProducts) {
          await supabase
            .from("Product")
            .update({
              stock: previous.previousStock,
            })
            .eq("id", previous.id);
        }

        await supabase
          .from("SaleItem")
          .delete()
          .eq("saleId", saleId);

        await supabase
          .from("Sale")
          .delete()
          .eq("id", saleId);

        setErrorMessage(
          `No se pudo actualizar el inventario: ${stockError.message}`
        );

        setCharging(false);
        return;
      }

      updatedProducts.push({
        id: item.id,
        previousStock: item.stock,
      });

      await supabase.from("InventoryMovement").insert({
        id: crypto.randomUUID(),
        productId: item.id,
        type: "OUT",
        quantity: item.quantity,
        reason: `Venta ${saleId}`,
        createdAt,
      });
    }

    const paymentLabel =
      PAYMENT_OPTIONS.find((option) => option.id === paymentMethod)?.label ??
      paymentMethod;

    const ticketParts = [
      `Ticket ${saleId.slice(0, 8)}`,
      `Pago: ${paymentLabel}`,
      `Entrega: ${shipping.label} ($${shippingCost.toFixed(2)})`,
    ];

    if (shippingId !== "pickup") {
      ticketParts.push(`Dirección: ${deliveryAddress.trim()}`);
    }
    if (donationAmount > 0) {
      ticketParts.push(`Donativo ${CHARITY_NAME}: $${donationAmount.toFixed(2)}`);
    }
    if (tipAmount > 0) {
      ticketParts.push(`Propina cajero: $${tipAmount.toFixed(2)}`);
    }
    if (paymentMethod === "cash") {
      ticketParts.push(`Cambio: $${(cashNumber - grandTotal).toFixed(2)}`);
    } else if (paymentMethod === "transfer") {
      ticketParts.push(
        `SPEI ${TRANSFER_INFO.bank} ${TRANSFER_INFO.clabe} · ${TRANSFER_INFO.concept}`
      );
    } else {
      ticketParts.push("Terminal: pago aprobado");
    }

    setSuccessMessage(
      `Venta cobrada. Subtotal $${subtotal.toFixed(2)} · Total $${grandTotal.toFixed(2)}. ${ticketParts.join(" · ")}`
    );
    setAskRating(true);
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

    await loadProducts();

    setCharging(false);
  }

  if (checking || !profile) {
    return <SessionScreen message="Verificando sesión..." />;
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
        <div className="mb-5 rounded-xl border border-amber-800 bg-slate-900 p-5">
          <p className="font-semibold text-amber-200">
            ¿Cómo calificarías la atención de esta compra? (opcional)
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((stars) => (
              <button
                key={stars}
                type="button"
                onClick={() => {
                  saveFeedback({
                    id: crypto.randomUUID(),
                    kind: "calificacion",
                    name: "Cliente en caja",
                    contact: "",
                    message: `Calificación posterior a la compra: ${stars} de 5.`,
                    rating: stars,
                    createdAt: new Date().toISOString(),
                  });
                  setAskRating(false);
                  setRatingSaved(`Gracias. Guardamos ${stars} de 5 estrellas.`);
                }}
                className="rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white hover:bg-amber-600"
              >
                {stars} ★
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAskRating(false)}
              className="rounded-lg bg-slate-800 px-4 py-2 text-slate-200 hover:bg-slate-700"
            >
              Omitir
            </button>
          </div>
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
                        disabled={charging}
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
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-300">Entrega</p>
              <div className="space-y-2">
                {SHIPPING_OPTIONS.map((option) => (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-start gap-2 rounded-lg bg-slate-800 p-3 text-sm"
                  >
                    <input
                      type="radio"
                      name="shipping"
                      checked={shippingId === option.id}
                      onChange={() => setShippingId(option.id)}
                      disabled={charging}
                      className="mt-1"
                    />
                    <span>
                      <span className="font-semibold">{option.label}</span>
                      <span className="text-emerald-400">
                        {" "}
                        · {option.cost === 0 ? "Sin costo" : `$${option.cost.toFixed(2)}`}
                      </span>
                      <span className="mt-1 block text-xs text-slate-400">
                        {option.detail}
                      </span>
                    </span>
                  </label>
                ))}
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
            </div>

            <div className="flex justify-between text-2xl font-bold">
              <span>Total a cobrar</span>
              <span className="text-emerald-400">${grandTotal.toFixed(2)}</span>
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