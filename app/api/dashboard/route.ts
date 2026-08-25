import { NextResponse } from "next/server";
import { adminCatalogStats } from "@/lib/dashboard-stats";

export async function GET() {
  return NextResponse.json({
    ...adminCatalogStats(),
    source: "catalog",
  });
}
