import { getAdminFirestore } from "../firebase-admin";
import { isRecord } from "../schema";
import {
  parseAuthSessionRecord,
  type AuthSessionRecord,
} from "./session-token";
import { parseUserRecord, type UserRecord } from "./user";
import { emailKey } from "./validation";

const USERS_COLLECTION = "users";
const AUTH_SESSIONS_COLLECTION = "authSessions";

export class UserAlreadyExistsError extends Error {
  constructor() {
    super("Ya existe una cuenta con ese correo.");
    this.name = "UserAlreadyExistsError";
  }
}

function isConflict(error: unknown): boolean {
  return isRecord(error) && error.code === 6;
}

export async function findUserByEmail(
  email: string,
): Promise<UserRecord | null> {
  const snapshot = await getAdminFirestore()
    .collection(USERS_COLLECTION)
    .doc(emailKey(email))
    .get();
  if (!snapshot.exists) {
    return null;
  }
  return parseUserRecord(snapshot.data(), snapshot.id);
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const snapshot = await getAdminFirestore()
    .collection(USERS_COLLECTION)
    .doc(id)
    .get();
  if (!snapshot.exists) {
    return null;
  }
  return parseUserRecord(snapshot.data(), snapshot.id);
}

export async function createUser(record: UserRecord): Promise<void> {
  const reference = getAdminFirestore()
    .collection(USERS_COLLECTION)
    .doc(record.id);
  try {
    await reference.create(record);
  } catch (error) {
    if (isConflict(error)) {
      throw new UserAlreadyExistsError();
    }
    throw error;
  }
}

export async function createAuthSession(
  record: AuthSessionRecord,
): Promise<void> {
  await getAdminFirestore()
    .collection(AUTH_SESSIONS_COLLECTION)
    .doc(record.tokenHash)
    .set(record);
}

export async function findAuthSession(
  tokenHash: string,
): Promise<AuthSessionRecord | null> {
  const snapshot = await getAdminFirestore()
    .collection(AUTH_SESSIONS_COLLECTION)
    .doc(tokenHash)
    .get();
  if (!snapshot.exists) {
    return null;
  }
  return parseAuthSessionRecord(snapshot.data(), tokenHash);
}

export async function deleteAuthSession(tokenHash: string): Promise<void> {
  await getAdminFirestore()
    .collection(AUTH_SESSIONS_COLLECTION)
    .doc(tokenHash)
    .delete();
}
