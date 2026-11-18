import { requireApiUser } from "@/lib/auth/dal";
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

function unauthorized(): Response {
  return Response.json({ error: "No autenticado." }, { status: 401 });
}

export async function GET() {
  const user = await requireApiUser();
  if (!user) {
    return unauthorized();
  }
  try {
    return Response.json({ sessions: await listSessions(user.id) });
  } catch {
    return unavailable();
  }
}

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) {
    return unauthorized();
  }
  const body = await readBody(request);
  const session = parseSessionPayload(body);
  if (!session) {
    return Response.json({ error: "Sesión inválida." }, { status: 400 });
  }
  try {
    await saveSession(user.id, session);
    return Response.json({ session }, { status: 201 });
  } catch {
    return unavailable();
  }
}

export async function DELETE(request: Request) {
  const user = await requireApiUser();
  if (!user) {
    return unauthorized();
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return Response.json({ error: "Falta el parámetro id." }, { status: 400 });
  }
  try {
    const removed = await deleteSession(user.id, id);
    if (!removed) {
      return Response.json({ error: "Sesión no encontrada." }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch {
    return unavailable();
  }
}
