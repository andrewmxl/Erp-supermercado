import catalog from "@/lib/demo-products.json";
import { photoForProduct } from "@/lib/product-media";

export type DemoProduct = {
  id: string;
  name: string;
  sku: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  minStock: number;
  unit: "PIECE" | "KG";
  category: string;
  barcode: string;
  imageUrl: string;
};

export function demoProducts(): DemoProduct[] {
  return (catalog as DemoProduct[]).map((product) => ({
    ...product,
    unit: product.unit === "KG" ? "KG" : "PIECE",
    imageUrl: product.imageUrl || photoForProduct(product.name, product.category, product.sku),
  }));
}
