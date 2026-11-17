import { parseSubjectsPayload } from "@/lib/api-payload";
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

export async function GET() {
  try {
    return Response.json({ subjects: await readSubjects() });
  } catch {
    return unavailable();
  }
}

export async function PUT(request: Request) {
  const body = await readBody(request);
  const subjects = parseSubjectsPayload(body);
  if (!subjects) {
    return Response.json(
      { error: "Lista de materias inválida." },
      { status: 400 },
    );
  }
  try {
    await writeSubjects(subjects);
    return Response.json({ subjects });
  } catch {
    return unavailable();
  }
}
