import { NextResponse } from "next/server";
import { CASHIER_REVIEW_PROFILE, REVIEW_PROFILE } from "@/lib/erp";
import { createDataClient, tryCreateDataClient } from "@/utils/supabase/data";

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      phone?: string;
      role?: string;
    };

    const name = (body.name ?? "").trim();
    const email = (body.email ?? "").trim().toLowerCase();
    const phone = (body.phone ?? "").trim();
    const role = (body.role ?? "").trim();

    if (!name || !email || !phone || !role) {
      return NextResponse.json(
        { error: "Nombre, correo, teléfono y puesto son obligatorios." },
        { status: 400 }
      );
    }

    const user = {
      id: crypto.randomUUID(),
      name,
      email,
      phone,
      role,
      active: true,
      createdAt: new Date().toISOString(),
    };

    try {
      const supabase = tryCreateDataClient();
      if (supabase) {
        const insert = supabase.from("AppUser").insert({
          id: user.id,
          name,
          email,
          role,
          active: true,
        });
        const timeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("timeout")), 8000);
        });
        const { error } = await Promise.race([insert, timeout]);
        if (!error) {
          return NextResponse.json({ user, source: "database" });
        }
      }
    } catch {
      // Alta local si Auth/AppUser no está listo en el demo.
    }

    return NextResponse.json({
      user,
      source: "local",
      warning:
        "El usuario quedó en esta sesión. En producción también debe existir en Authentication.",
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo dar de alta el usuario." },
      { status: 500 }
    );
  }
}
