import { NextResponse } from "next/server";
import { CASHIER_REVIEW_PROFILE, REVIEW_PROFILE } from "@/lib/erp";
import { createDataClient } from "@/utils/supabase/data";

function demoUsers() {
  return [
    {
      id: REVIEW_PROFILE.id,
      name: REVIEW_PROFILE.name,
      email: REVIEW_PROFILE.email,
      role: REVIEW_PROFILE.role,
      active: REVIEW_PROFILE.active,
      createdAt: null as string | null,
    },
    {
      id: CASHIER_REVIEW_PROFILE.id,
      name: CASHIER_REVIEW_PROFILE.name,
      email: CASHIER_REVIEW_PROFILE.email,
      role: CASHIER_REVIEW_PROFILE.role,
      active: CASHIER_REVIEW_PROFILE.active,
      createdAt: null as string | null,
    },
  ];
}

export async function GET() {
  try {
    const supabase = createDataClient();
    const query = supabase
      .from("AppUser")
      .select("id, name, email, role, active, createdAt")
      .order("name");

    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), 8000);
    });

    const { data, error } = await Promise.race([query, timeout]);

    if (error) {
      return NextResponse.json({
        users: demoUsers(),
        source: "demo",
        warning: error.message,
      });
    }

    if (!data?.length) {
      return NextResponse.json({
        users: demoUsers(),
        source: "demo",
        warning:
          "La tabla AppUser está vacía. Se muestran el revisor y el cajero de demostración.",
      });
    }

    return NextResponse.json({ users: data, source: "database" });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "timeout"
        ? "Supabase no respondió a tiempo."
        : error instanceof Error
          ? error.message
          : "No se pudieron leer los usuarios.";

    return NextResponse.json({
      users: demoUsers(),
      source: "demo",
      warning: message,
    });
  }
}
