import { NextResponse } from "next/server";
import { replyToStoreQuestion } from "@/lib/store-reply";

export async function GET() {
  return NextResponse.json({
    ok: true,
    channel: "whatsapp-webhook",
    message: "Listo para conectar Twilio, Green API o Meta Cloud API.",
  });
}

export async function POST(request: Request) {
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
  const provided = request.headers.get("x-webhook-secret");

  if (secret && provided !== secret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      Body?: string;
      body?: string;
      question?: string;
    };
    const question = (body.Body || body.body || body.question || "").trim();

    if (!question) {
      return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
    }

    const reply = await replyToStoreQuestion(question, false);
    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json({
      reply:
        "Hola. Pregúntame por un producto, el precio o el horario (lunes a domingo de 8:00 a.m. a 10:00 p.m.).",
      error: error instanceof Error ? error.message : "error",
    });
  }
}
