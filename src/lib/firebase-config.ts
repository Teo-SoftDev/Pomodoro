export interface FirebaseAdminConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export type FirebaseEnv = Readonly<Record<string, string | undefined>>;

export class FirebaseConfigError extends Error {
  readonly missing: readonly string[];

  constructor(missing: readonly string[]) {
    super(
      `Variables de Firebase ausentes o inválidas: ${missing.join(", ")}. Revisa .env.local.`,
    );
    this.name = "FirebaseConfigError";
    this.missing = missing;
  }
}

export function normalizePrivateKey(raw: string): string {
  return raw.replace(/\\n/g, "\n").trim();
}

function readValue(env: FirebaseEnv, name: string): string | null {
  const value = env[name];
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isValidPrivateKey(value: string): boolean {
  const normalized = normalizePrivateKey(value);
  return (
    normalized.includes("BEGIN PRIVATE KEY") &&
    normalized.includes("END PRIVATE KEY")
  );
}

export function parseFirebaseAdminConfig(
  env: FirebaseEnv,
): FirebaseAdminConfig {
  const projectId = readValue(env, "PROJECT_ID");
  const clientEmail = readValue(env, "CLIENT_EMAIL");
  const privateKey = readValue(env, "PRIVATE_KEY");
  const missing: string[] = [];

  if (!projectId) {
    missing.push("PROJECT_ID");
  }
  if (!clientEmail) {
    missing.push("CLIENT_EMAIL");
  }
  if (!privateKey || !isValidPrivateKey(privateKey)) {
    missing.push("PRIVATE_KEY");
  }

  if (!projectId || !clientEmail || !privateKey || missing.length > 0) {
    throw new FirebaseConfigError(missing);
  }

  return {
    projectId,
    clientEmail,
    privateKey: normalizePrivateKey(privateKey),
  };
}
