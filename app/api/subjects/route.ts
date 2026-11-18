import { parseSubjectsPayload } from "@/lib/api-payload";
import { requireApiUser } from "@/lib/auth/dal";
import { readSubjects, writeSubjects } from "@/lib/firestore-repository";

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
    return Response.json({ subjects: await readSubjects(user.id) });
  } catch {
    return unavailable();
  }
}

export async function PUT(request: Request) {
  const user = await requireApiUser();
  if (!user) {
    return unauthorized();
  }
  const body = await readBody(request);
  const subjects = parseSubjectsPayload(body);
  if (!subjects) {
    return Response.json(
      { error: "Lista de materias inválida." },
      { status: 400 },
    );
  }
  try {
    await writeSubjects(user.id, subjects);
    return Response.json({ subjects });
  } catch {
    return unavailable();
  }
}
