import { parseSessionPayload } from "@/lib/api-payload";
import {
  deleteSession,
  listSessions,
  saveSession,
} from "@/lib/firestore-repository";

async function readBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function unavailable(): Response {
  return Response.json(
    { error: "Firestore no está disponible." },
    { status: 503 },
  );
}

export async function GET() {
  try {
    return Response.json({ sessions: await listSessions() });
  } catch {
    return unavailable();
  }
}

export async function POST(request: Request) {
  const body = await readBody(request);
  const session = parseSessionPayload(body);
  if (!session) {
    return Response.json({ error: "Sesión inválida." }, { status: 400 });
  }
  try {
    await saveSession(session);
    return Response.json({ session }, { status: 201 });
  } catch {
    return unavailable();
  }
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return Response.json({ error: "Falta el parámetro id." }, { status: 400 });
  }
  try {
    const removed = await deleteSession(id);
    if (!removed) {
      return Response.json({ error: "Sesión no encontrada." }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch {
    return unavailable();
  }
}
