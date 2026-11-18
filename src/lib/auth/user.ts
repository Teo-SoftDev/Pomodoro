import { isRecord } from "../schema";

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
}

export function parseUserRecord(value: unknown, id: string): UserRecord | null {
  if (!isRecord(value)) {
    return null;
  }
  const { email, passwordHash, createdAt } = value;
  if (
    typeof email !== "string" ||
    typeof passwordHash !== "string" ||
    typeof createdAt !== "string"
  ) {
    return null;
  }
  return { id, email, passwordHash, createdAt };
}

export function toAuthUser(user: UserRecord): AuthUser {
  return { id: user.id, email: user.email };
}
