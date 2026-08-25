import { NextResponse } from "next/server";
import { replyToStoreQuestion } from "@/lib/store-reply";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { question?: string; role?: string };
    const question = body.question?.trim() ?? "";
    const isAdmin = body.role === "admin";

    if (!question) {
      return NextResponse.json({ error: "Escribe una pregunta." }, { status: 400 });
    }

    const reply = await replyToStoreQuestion(question, isAdmin);
    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json({
      reply:
        error instanceof Error
          ? `No pude consultar el catálogo (${error.message}). Pregunta de nuevo por un producto, el precio o el horario.`
          : "No pude responder ahora. Pregunta por un producto, el precio o el horario.",
    });
  }
}
