import { pingFirestore } from "@/lib/firestore-repository";

export async function GET() {
  try {
    await pingFirestore();
    return Response.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return Response.json({ ok: false, error: message }, { status: 503 });
  }
}
