import { NextResponse } from "next/server";
import { enrichProductMedia } from "@/lib/enrich-products";

export async function GET() {
  return POST();
}

export async function POST() {
  try {
    const result = await enrichProductMedia();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo actualizar el catálogo." },
      { status: 500 }
    );
  }
}
