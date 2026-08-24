export type AssistantProduct = {
  id: string;
  name: string;
  sku: string;
  sellPrice: number;
  stock: number;
  minStock: number;
  unit: "PIECE" | "KG";
  category: string;
  barcode: string;
};

export type AssistantSale = {
  id: string;
  totalAmount: number;
  createdAt: string;
};

export type AssistantSaleItem = {
  productId: string;
  quantity: number;
};

export type AssistantContext = {
  products: AssistantProduct[];
  sales: AssistantSale[];
  saleItems: AssistantSaleItem[];
  storeHours: string;
  isAdmin?: boolean;
};

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatStock(product: AssistantProduct) {
  return product.unit === "KG"
    ? `${product.stock} kg`
    : `${product.stock} pzas`;
}

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`;
}

function findProduct(question: string, products: AssistantProduct[]) {
  const normalizedQuestion = normalize(question);

  const candidates = products
    .map((product) => {
      const normalizedName = normalize(product.name);
      const normalizedSku = normalize(product.sku);
      const normalizedBarcode = normalize(product.barcode);
      let score = 0;

      if (normalizedQuestion.includes(normalizedName)) score += 100;
      if (normalizedSku && normalizedQuestion.includes(normalizedSku)) score += 90;
      if (normalizedBarcode && normalizedQuestion.includes(normalizedBarcode)) {
        score += 90;
      }

      const words = normalizedName.split(" ").filter((word) => word.length >= 3);
      for (const word of words) {
        if (normalizedQuestion.includes(word)) score += 10;
      }

      return { product, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.product ?? null;
}

export function answerBusinessQuestion(
  question: string,
  context: AssistantContext
) {
  const text = normalize(question);
  const { products, sales, saleItems, storeHours, isAdmin = false } = context;
  const product = findProduct(question, products);

  const lowStockProducts = products.filter(
    (item) => item.stock <= item.minStock
  );

  const now = new Date();
  const todaySales = sales
    .filter((sale) => {
      const date = new Date(sale.createdAt);
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
      );
    })
    .reduce((sum, sale) => sum + sale.totalAmount, 0);

  let bestSelling: { name: string; quantity: number } | null = null;
  if (saleItems.length > 0) {
    const totals = new Map<string, number>();
    for (const item of saleItems) {
      totals.set(item.productId, (totals.get(item.productId) ?? 0) + item.quantity);
    }
    const top = Array.from(totals.entries()).sort((a, b) => b[1] - a[1])[0];
    if (top) {
      const found = products.find((item) => item.id === top[0]);
      bestSelling = {
        name: found?.name ?? "Producto desconocido",
        quantity: top[1],
      };
    }
  }

  if (
    text.includes("hola") ||
    text.includes("buenos dias") ||
    text.includes("buenas tardes") ||
    text.includes("buenas noches")
  ) {
    return isAdmin
      ? "¡Hola! Estás conectado como administrador. Puedes preguntar por ventas, stock bajo, productos y operar el ERP desde este número."
      : "¡Hola! Soy el asistente del supermercado. Pregúntame si tenemos un producto, el precio o el horario.";
  }

  if (
    text.includes("horario") ||
    text.includes("abren") ||
    text.includes("cierran")
  ) {
    return `Nuestro horario es: ${storeHours}.`;
  }

  if (
    text.includes("envio") ||
    text.includes("envios") ||
    text.includes("entrega") ||
    text.includes("domicilio") ||
    text.includes("reparten")
  ) {
    return (
      "Opciones de envío y costo:\n" +
      "• Recoger en tienda: sin costo. Listo en 20 a 40 min. Calle Comercial 120, Mexicali.\n" +
      "• Zona centro (hasta 5 km): $35.00 · mismo día, 1 a 2 horas.\n" +
      "• Zona urbana: $55.00 · mismo día, 2 a 4 horas.\n" +
      "• Express 60 min (hasta 8 km): $85.00 · pedido mínimo $150.\n" +
      "El costo se suma al pagar en caja o al confirmar el pedido."
    );
  }

  if (
    text.includes("forma de pago") ||
    text.includes("metodo de pago") ||
    text.includes("como pago") ||
    text.includes("pagan con") ||
    text.includes("transferencia") ||
    text.includes("tarjeta") ||
    text.includes("contactless")
  ) {
    return (
      "Aceptamos efectivo, transferencia SPEI, tarjeta de débito/crédito y contactless (NFC). " +
      "SPEI: BBVA · CLABE 012 760 001234567890 · ERP Supermercado S.A. de C.V."
    );
  }

  if (text.includes("donativ") || text.includes("propina") || text.includes("obra benefic")) {
    return (
      "En caja, antes de pagar, preguntamos si deseas un donativo al Comedor Comunitario Mexicali " +
      "($10, $20, $50 o otro monto) o una propina para el cajero. Es opcional."
    );
  }

  if (product) {
    const available = product.stock > 0;

    if (
      text.includes("precio") ||
      text.includes("cuanto cuesta") ||
      text.includes("cuesta") ||
      text.includes("vale")
    ) {
      return `${product.name} cuesta ${formatMoney(product.sellPrice)}${
        product.unit === "KG" ? " por kg" : " por pieza"
      }. Existencia: ${formatStock(product)}.`;
    }

    if (
      text.includes("tienen") ||
      text.includes("hay") ||
      text.includes("existencia") ||
      text.includes("stock") ||
      text.includes("disponible")
    ) {
      return available
        ? `Sí, tenemos ${product.name}. Existencia: ${formatStock(product)}. Precio: ${formatMoney(product.sellPrice)}.`
        : `${product.name} aparece agotado actualmente.`;
    }

    return `${product.name}: ${formatMoney(product.sellPrice)} · Stock: ${formatStock(product)} · Categoría: ${product.category || "Sin categoría"} · SKU: ${product.sku}.`;
  }

  if (
    text.includes("productos disponibles") ||
    text.includes("que productos") ||
    text.includes("catalogo")
  ) {
    const available = products.filter((item) => item.stock > 0);
    const sample = available.slice(0, 8).map((item) => item.name);
    return `Tenemos ${available.length} productos con existencia. Algunos son: ${sample.join(", ")}.`;
  }

  if (
    text.includes("stock bajo") ||
    text.includes("poco stock") ||
    text.includes("por agotarse")
  ) {
    if (!isAdmin) {
      return "Esa consulta es interna. Si buscas un producto, escribe su nombre.";
    }
    if (lowStockProducts.length === 0) {
      return "No hay productos con stock bajo en este momento.";
    }
    const sample = lowStockProducts
      .slice(0, 6)
      .map((item) => `${item.name} (${formatStock(item)})`);
    return `Hay ${lowStockProducts.length} productos con stock bajo. Ejemplos: ${sample.join(", ")}.`;
  }

  if (text.includes("cuantos productos") || text.includes("productos registrados")) {
    if (!isAdmin) {
      return "Si buscas algo, escribe el nombre del producto y te digo precio y existencia.";
    }
    return `El sistema tiene ${products.length} productos registrados.`;
  }

  if (
    text.includes("vendimos hoy") ||
    text.includes("ventas de hoy") ||
    text.includes("venta de hoy")
  ) {
    if (!isAdmin) {
      return "Las ventas son información interna. ¿Te ayudo con un producto o el horario?";
    }
    return `Las ventas registradas hoy suman ${formatMoney(todaySales)}.`;
  }

  if (
    text.includes("mas vendido") ||
    text.includes("mas ventas") ||
    text.includes("producto estrella")
  ) {
    if (!isAdmin) {
      return "Esa información es del negocio. Pregúntame por un producto, su precio o si hay existencia.";
    }
    if (!bestSelling) {
      return "Todavía no hay suficiente información de ventas para calcularlo.";
    }
    return `El producto más vendido es ${bestSelling.name}, con ${bestSelling.quantity.toFixed(3)} unidades acumuladas.`;
  }

  if (text.includes("gracias")) {
    return "Con gusto. Pregúntame por otro producto, precio o existencia.";
  }

  return isAdmin
    ? "No entendí. Pregunta por un producto, ventas de hoy, stock bajo o el horario."
    : "No entendí. Escribe el nombre de un producto, pregunta el precio o el horario de la tienda.";
}
