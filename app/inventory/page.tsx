"use client";

import { useEffect, useMemo, useState } from "react";
import { AppHeader, SessionScreen } from "@/components/AppHeader";
import { BarcodeMark } from "@/components/BarcodeMark";
import { ProductShot } from "@/components/ProductShot";
import { useErpSession } from "@/hooks/useErpSession";
import { barcodeFromSku } from "@/lib/barcode";
import { isAdmin } from "@/lib/erp";
import { photoForProduct } from "@/lib/product-media";
import { createClient } from "@/utils/supabase/client";

type Unit = "PIECE" | "KG";

type Product = {
  id: string;
  name: string;
  sku: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  minStock: number;
  unit: Unit;
  category: string;
  barcode: string;
  imageUrl: string;
};

type ProductForm = {
  name: string;
  sku: string;
  buyPrice: string;
  sellPrice: string;
  stock: string;
  minStock: string;
  unit: Unit;
  category: string;
  barcode: string;
  imageUrl: string;
};

const EMPTY_FORM: ProductForm = {
  name: "",
  sku: "",
  buyPrice: "0",
  sellPrice: "0",
  stock: "0",
  minStock: "0",
  unit: "PIECE",
  category: "",
  barcode: "",
  imageUrl: "",
};

const IMAGE_BUCKET = "product-images";

export default function InventoryPage() {
  const { checking, profile } = useErpSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);

  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

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
        products?: Product[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "No se pudo leer el inventario.");
      }

      const mappedProducts: Product[] = (payload.products ?? []).map((product) => ({
        id: product.id,
        name: product.name ?? "",
        sku: product.sku ?? "",
        buyPrice: Number(product.buyPrice ?? 0),
        sellPrice: Number(product.sellPrice ?? 0),
        stock: Number(product.stock ?? 0),
        minStock: Number(product.minStock ?? 0),
        unit: product.unit === "KG" ? "KG" : "PIECE",
        category: product.category ?? "",
        barcode: product.barcode ?? "",
        imageUrl: product.imageUrl ?? "",
      }));

      setProducts(mappedProducts);
    } catch (error) {
      const aborted =
        error instanceof Error &&
        (error.name === "AbortError" || /abort/i.test(error.message));
      setErrorMessage(
        aborted
          ? "La carga se detuvo a los 10 segundos. En Vercel faltan o fallan las variables de Supabase, o la tabla Product no es accesible."
          : error instanceof Error
            ? error.message
            : "No se pudo conectar a la base de datos."
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
  }, [checking, profile?.id]);

  const filteredProducts = useMemo(() => {
    const text = search.trim().toLowerCase();

    if (!text) {
      return products;
    }

    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(text) ||
        product.sku.toLowerCase().includes(text) ||
        product.category.toLowerCase().includes(text) ||
        product.barcode.toLowerCase().includes(text)
      );
    });
  }, [products, search]);

  const inventoryValue = useMemo(() => {
    return products.reduce(
      (total, product) =>
        total + product.buyPrice * product.stock,
      0
    );
  }, [products]);

  const lowStockProducts = useMemo(() => {
    return products.filter(
      (product) => product.stock <= product.minStock
    );
  }, [products]);

  function clearSelectedImage() {
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(null);
    setImagePreview("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    clearSelectedImage();
  }

  function startEdit(product: Product) {
    clearSelectedImage();

    setEditingId(product.id);

    setForm({
      name: product.name,
      sku: product.sku,
      buyPrice: String(product.buyPrice),
      sellPrice: String(product.sellPrice),
      stock: String(product.stock),
      minStock: String(product.minStock),
      unit: product.unit,
      category: product.category,
      barcode: product.barcode,
      imageUrl: product.imageUrl,
    });

    setImagePreview(product.imageUrl);

    setErrorMessage("");
    setSuccessMessage("");

    document.getElementById("alta-producto")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function handleImageChange(file: File | null) {
    if (!file) {
      clearSelectedImage();
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Selecciona un archivo de imagen válido.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage(
        "La imagen es demasiado grande. Usa una imagen menor de 5 MB."
      );
      return;
    }

    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setErrorMessage("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function validateForm() {
    if (!form.name.trim()) {
      return "Escribe el nombre del producto.";
    }

    if (!form.sku.trim()) {
      return "Escribe el SKU del producto.";
    }

    const buyPrice = Number(form.buyPrice);
    const sellPrice = Number(form.sellPrice);
    const stock = Number(form.stock);
    const minStock = Number(form.minStock);

    if (!Number.isFinite(buyPrice) || buyPrice < 0) {
      return "El precio de compra no es válido.";
    }

    if (!Number.isFinite(sellPrice) || sellPrice < 0) {
      return "El precio de venta no es válido.";
    }

    if (!Number.isFinite(stock) || stock < 0) {
      return "El stock no es válido.";
    }

    if (!Number.isFinite(minStock) || minStock < 0) {
      return "El stock mínimo no es válido.";
    }

    return "";
  }

  async function uploadProductImage(
    productId: string,
    file: File
  ): Promise<string> {
    const supabase = createClient();

    const extension =
      file.name.split(".").pop()?.toLowerCase() || "jpg";

    const safeExtension = extension.replace(
      /[^a-z0-9]/g,
      ""
    );

    const filePath = `${productId}/${Date.now()}.${safeExtension || "jpg"}`;

    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      throw new Error(
        `No se pudo subir la imagen: ${uploadError.message}`
      );
    }

    const { data } = supabase.storage
      .from(IMAGE_BUCKET)
      .getPublicUrl(filePath);

    if (!data.publicUrl) {
      throw new Error(
        "Supabase no devolvió la URL pública de la imagen."
      );
    }

    return data.publicUrl;
  }

  async function saveProduct() {
    if (saving) {
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const supabase = createClient();
    const now = new Date().toISOString();

    const productId = editingId ?? crypto.randomUUID();

    let finalImageUrl = form.imageUrl.trim();

    try {
      if (imageFile) {
        finalImageUrl = await uploadProductImage(
          productId,
          imageFile
        );
      }

      const productData = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        buyPrice: Number(
          Number(form.buyPrice).toFixed(2)
        ),
        sellPrice: Number(
          Number(form.sellPrice).toFixed(2)
        ),
        stock: Number(
          Number(form.stock).toFixed(3)
        ),
        minStock: Number(
          Number(form.minStock).toFixed(3)
        ),
        unit: form.unit,
        category: form.category.trim(),
        barcode: form.barcode.trim() || barcodeFromSku(form.sku.trim()),
        imageUrl: finalImageUrl || photoForProduct(form.name, form.category),
        updatedAt: now,
      };

      if (editingId) {
        const { error } = await supabase
          .from("Product")
          .update(productData)
          .eq("id", editingId);

        if (error) {
          throw new Error(
            `No se pudo actualizar el producto: ${error.message}`
          );
        }

        setSuccessMessage(
          imageFile
            ? "Producto e imagen actualizados correctamente."
            : "Producto actualizado correctamente."
        );
      } else {
        const { error } = await supabase
          .from("Product")
          .insert({
            id: productId,
            ...productData,
            createdAt: now,
          });

        if (error) {
          throw new Error(
            `No se pudo crear el producto: ${error.message}`
          );
        }

        setSuccessMessage(
          "Producto agregado correctamente."
        );
      }

      resetForm();
      await loadProducts();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al guardar el producto."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(product: Product) {
    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar "${product.name}"?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const supabase = createClient();

    const { error } = await supabase
      .from("Product")
      .delete()
      .eq("id", product.id);

    if (error) {
      setErrorMessage(
        `No se pudo eliminar el producto: ${error.message}`
      );
      setSaving(false);
      return;
    }

    if (editingId === product.id) {
      resetForm();
    }

    setSuccessMessage(
      `"${product.name}" fue eliminado.`
    );

    await loadProducts();
    setSaving(false);
  }

  async function fillPhotosAndBarcodes() {
    setEnriching(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/products/enrich", { method: "POST" });
      const payload = (await response.json()) as { updated?: number; error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "No se pudieron cargar fotos y códigos.");
      }
      setSuccessMessage(
        `Se actualizaron ${payload.updated ?? 0} productos con foto y código de barras.`
      );
      await loadProducts();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error al completar el catálogo.");
    } finally {
      setEnriching(false);
    }
  }

  function formatStock(product: Product) {
    if (product.unit === "KG") {
      return `${product.stock} kg`;
    }

    return `${product.stock} pzas`;
  }

  if (checking || !profile) {
    return <SessionScreen message="Verificando sesión..." />;
  }

  const canEdit = isAdmin(profile.role);

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-7xl">
      <AppHeader profile={profile} />
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-amber-200">Inventario</h1>
        <p className="mt-1 text-slate-400">
          Consulta el catálogo. Solo el administrador da de alta productos, más abajo.
        </p>
        {!canEdit ? (
          <p className="mt-2 text-sm text-emerald-200/80">
            Entraste como cajero: puedes buscar y ver. No puedes agregar ni borrar.
          </p>
        ) : null}
      </header>

      {successMessage && (
        <div className="mb-5 rounded-lg border border-emerald-800 bg-emerald-950 p-4 text-emerald-300">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mb-5 rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
          Error: {errorMessage}
        </div>
      )}

      <section className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              Productos
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              {loading
                ? "Cargando…"
                : `${filteredProducts.length} productos mostrados`}
            </p>
          </div>

          <div className="flex w-full gap-3 md:w-auto">
            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Buscar nombre, SKU, código o categoría..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none focus:border-sky-500 md:w-96"
            />

            <button
              type="button"
              onClick={loadProducts}
              disabled={loading || saving}
              className="rounded-lg bg-slate-700 px-4 py-2 hover:bg-slate-600 disabled:opacity-40"
            >
              ↻
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400">
            Cargando inventario (máximo 12 segundos)…
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            No se encontraron productos.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1350px]">
              <thead>
                <tr className="border-b border-slate-700 text-left text-sm text-slate-400">
                  <th className="p-3">Imagen</th>
                  <th className="p-3">Producto</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Código de barras</th>
                  <th className="p-3">Categoría</th>
                  <th className="p-3">Compra</th>
                  <th className="p-3">Venta</th>
                  <th className="p-3">Stock</th>
                  <th className="p-3">Mínimo</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((product) => {
                  const lowStock =
                    product.stock <= product.minStock;

                  return (
                    <tr
                      key={product.id}
                      className="border-b border-slate-800 hover:bg-slate-800/50"
                    >
                      <td className="p-3">
                        <ProductShot
                          name={product.name}
                          category={product.category}
                          imageUrl={product.imageUrl}
                          compact
                        />
                      </td>

                      <td className="p-3 font-semibold">
                        {product.name}
                      </td>

                      <td className="p-3 text-slate-400">
                        {product.sku}
                      </td>

                      <td className="p-3 font-mono text-sm text-slate-300">
                        <p>{product.barcode || "—"}</p>
                        {product.barcode ? <BarcodeMark code={product.barcode} /> : null}
                      </td>

                      <td className="p-3 text-slate-400">
                        {product.category || "—"}
                      </td>

                      <td className="p-3">
                        ${product.buyPrice.toFixed(2)}
                      </td>

                      <td className="p-3 font-semibold text-emerald-400">
                        ${product.sellPrice.toFixed(2)}
                      </td>

                      <td className="p-3">
                        {formatStock(product)}
                      </td>

                      <td className="p-3 text-slate-400">
                        {product.minStock}
                        {product.unit === "KG"
                          ? " kg"
                          : " pzas"}
                      </td>

                      <td className="p-3">
                        {lowStock ? (
                          <span className="rounded-full bg-amber-950 px-3 py-1 text-xs font-semibold text-amber-300">
                            Stock bajo
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-950 px-3 py-1 text-xs font-semibold text-emerald-300">
                            Disponible
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          {canEdit && (
                            <>
                          <button
                            type="button"
                            onClick={() =>
                              startEdit(product)
                            }
                            disabled={saving}
                            className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold hover:bg-sky-600 disabled:opacity-40"
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteProduct(product)
                            }
                            disabled={saving}
                            className="rounded-lg bg-red-900 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-800 disabled:opacity-40"
                          >
                            Eliminar
                          </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">
            Productos registrados
          </p>

          <p className="mt-2 text-3xl font-bold">
            {products.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">
            Productos con stock bajo
          </p>

          <p
            className={`mt-2 text-3xl font-bold ${
              lowStockProducts.length > 0
                ? "text-amber-400"
                : "text-emerald-400"
            }`}
          >
            {lowStockProducts.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">
            Valor del inventario a costo
          </p>

          <p className="mt-2 text-3xl font-bold text-emerald-400">
            ${inventoryValue.toFixed(2)}
          </p>
        </div>
      </section>

      {canEdit && (
      <section id="alta-producto" className="mb-6 rounded-xl border border-emerald-900 bg-slate-900 p-5">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-amber-200">
              {editingId
                ? "Editar producto"
                : "Agregar producto (solo administrador)"}
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              {editingId
                ? "Modifica los datos, código de barras o imagen y guarda los cambios."
                : "Registra un nuevo producto en el inventario."}
            </p>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="rounded-lg bg-slate-700 px-4 py-2 hover:bg-slate-600 disabled:opacity-40"
            >
              Cancelar edición
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => void fillPhotosAndBarcodes()}
          disabled={enriching || saving}
          className="mb-5 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-amber-50 hover:bg-emerald-700 disabled:opacity-50"
        >
          {enriching ? "Cargando fotos y códigos..." : "Cargar fotos y códigos de barras"}
        </button>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm text-slate-400">
              Nombre
            </label>

            <input
              type="text"
              value={form.name}
              disabled={saving}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Ej. Arroz 1kg"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">
              SKU
            </label>

            <input
              type="text"
              value={form.sku}
              disabled={saving}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  sku: event.target.value,
                }))
              }
              placeholder="Ej. ABA-001"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">
              Código de barras
            </label>

            <input
              type="text"
              inputMode="numeric"
              value={form.barcode}
              disabled={saving}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  barcode: event.target.value,
                }))
              }
              placeholder="Ej. 2900000000094"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">
              Categoría
            </label>

            <input
              type="text"
              value={form.category}
              disabled={saving}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
              placeholder="Ej. Abarrotes"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">
              Unidad
            </label>

            <select
              value={form.unit}
              disabled={saving}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  unit:
                    event.target.value === "KG"
                      ? "KG"
                      : "PIECE",
                }))
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none focus:border-sky-500"
            >
              <option value="PIECE">Pieza</option>
              <option value="KG">Kilogramo</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">
              Precio de compra
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={form.buyPrice}
              disabled={saving}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  buyPrice: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">
              Precio de venta
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={form.sellPrice}
              disabled={saving}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  sellPrice: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">
              Stock actual
            </label>

            <input
              type="number"
              min="0"
              step={form.unit === "KG" ? "0.001" : "1"}
              value={form.stock}
              disabled={saving}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  stock: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">
              Stock mínimo
            </label>

            <input
              type="number"
              min="0"
              step={form.unit === "KG" ? "0.001" : "1"}
              value={form.minStock}
              disabled={saving}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  minStock: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none focus:border-sky-500"
            />
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            <label className="mb-2 block text-sm text-slate-400">
              Imagen del producto
            </label>

            <input
              type="file"
              accept="image/*"
              disabled={saving}
              onChange={(event) =>
                handleImageChange(
                  event.target.files?.[0] ?? null
                )
              }
              className="block w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-sky-700 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-sky-600"
            />

            <p className="mt-2 text-xs text-slate-500">
              JPG, PNG, WEBP u otra imagen compatible. Máximo 5 MB.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">
              Vista previa
            </label>

            <div className="flex h-32 items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt={form.name || "Vista previa del producto"}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="px-3 text-center text-sm text-slate-500">
                  Sin imagen
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={saveProduct}
          disabled={saving}
          className="mt-5 rounded-xl bg-sky-600 px-6 py-3 font-bold hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving
            ? imageFile
              ? "Subiendo imagen y guardando..."
              : "Guardando..."
            : editingId
              ? "Guardar cambios"
              : "Agregar producto"}
        </button>
      </section>
      )}


      </div>
    </main>
  );
}