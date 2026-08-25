import { NextResponse } from "next/server";
import { remotePhotoUrl } from "@/lib/product-media";

const GROCERY_FALLBACK =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=700&q=80&fm=jpg";

function asJpeg(url: string) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("auto", "format");
    parsed.searchParams.set("fit", "crop");
    parsed.searchParams.set("w", "700");
    parsed.searchParams.set("q", "80");
    parsed.searchParams.set("fm", "jpg");
    return parsed.toString();
  } catch {
    return url;
  }
}

async function fetchPhoto(url: string) {
  const response = await fetch(asJpeg(url), {
    headers: {
      Accept: "image/jpeg",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
    next: { revalidate: 86400 },
  });
  if (!response.ok) {
    throw new Error(`photo ${response.status}`);
  }
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const name = url.searchParams.get("name") ?? "Producto";
  const category = url.searchParams.get("category") ?? "";
  const sku = url.searchParams.get("sku") ?? "";
  const remote = remotePhotoUrl(name, category, sku);

  for (const candidate of [remote, GROCERY_FALLBACK]) {
    try {
      const response = await fetchPhoto(candidate);
      const body = await response.arrayBuffer();
      return new NextResponse(body, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
        },
      });
    } catch {
      // Try the next URL so every SKU still gets a grocery photo.
    }
  }

  return NextResponse.redirect(
    new URL(
      `/api/product-photo?${new URLSearchParams({ name, sku }).toString()}`,
      url.origin
    )
  );
}
