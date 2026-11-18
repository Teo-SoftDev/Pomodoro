import { createHash, randomBytes } from "node:crypto";
import { isRecord } from "../schema";
import { DEFAULT_SESSION_DAYS, sessionDays } from "./config";

export const SESSION_COOKIE = "pomodoro_session";

const TOKEN_BYTES = 32;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export interface AuthSessionRecord {
  tokenHash: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export function generateSessionToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createAuthSessionRecord(
  token: string,
  userId: string,
  now: Date,
  days: number = sessionDays(),
): AuthSessionRecord {
  const lifetime = days > 0 ? days : DEFAULT_SESSION_DAYS;
  return {
    tokenHash: hashSessionToken(token),
    userId,
    createdAt: now.toISOString(),
    expiresAt: new Date(
      now.getTime() + lifetime * MILLISECONDS_PER_DAY,
    ).toISOString(),
  };
}

export function isAuthSessionExpired(
  record: AuthSessionRecord,
  now: Date = new Date(),
): boolean {
  return Date.parse(record.expiresAt) <= now.getTime();
}

export function parseAuthSessionRecord(
  value: unknown,
  tokenHash: string,
): AuthSessionRecord | null {
  if (!isRecord(value)) {
    return null;
  }
  const { userId, createdAt, expiresAt } = value;
  if (
    typeof userId !== "string" ||
    typeof createdAt !== "string" ||
    typeof expiresAt !== "string"
  ) {
    return null;
  }
  return { tokenHash, userId, createdAt, expiresAt };
}
