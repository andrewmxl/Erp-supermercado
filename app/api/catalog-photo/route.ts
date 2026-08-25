import { NextResponse } from "next/server";
import { remotePhotoUrl } from "@/lib/product-media";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const name = url.searchParams.get("name") ?? "Producto";
  const category = url.searchParams.get("category") ?? "";
  const sku = url.searchParams.get("sku") ?? "";
  const remote = remotePhotoUrl(name, category, sku);

  try {
    const response = await fetch(remote, {
      headers: {
        Accept: "image/avif,image/webp,image/jpeg,image/*,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      throw new Error(`photo ${response.status}`);
    }

    const body = await response.arrayBuffer();
    return new NextResponse(body, {
      headers: {
        "Content-Type": response.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return NextResponse.redirect(
      new URL(
        `/api/product-photo?${new URLSearchParams({ name, sku }).toString()}`,
        url.origin
      )
    );
  }
}
