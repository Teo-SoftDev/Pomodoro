import { UserAlreadyExistsError } from "./errors";
import { DUMMY_PASSWORD_HASH } from "./password";
import type { FailedAttemptResult } from "./lockout-store";
import { isLocked, remainingLockSeconds, type AttemptState } from "./lockout";
import {
  createAuthSessionRecord,
  generateSessionToken,
  type AuthSessionRecord,
} from "./session-token";
import { toAuthUser, type AuthUser, type UserRecord } from "./user";
import { emailKey, type Credentials } from "./validation";

export interface AuthDependencies {
  hashPassword: (password: string) => Promise<string>;
  verifyPassword: (password: string, hash: string) => Promise<boolean>;
  findUserByEmail: (email: string) => Promise<UserRecord | null>;
  createUser: (record: UserRecord) => Promise<void>;
  claimLegacyData: (userId: string) => Promise<void>;
  readAccountAttempts: (email: string) => Promise<AttemptState | null>;
  readIpAttempts: (ip: string) => Promise<AttemptState | null>;
  registerFailedAttempts: (
    email: string,
    ip: string,
    now: Date,
  ) => Promise<FailedAttemptResult>;
  clearAttempts: (email: string, ip: string) => Promise<void>;
  createAuthSession: (record: AuthSessionRecord) => Promise<void>;
  now: () => Date;
}

export type RegisterResult =
  | { ok: true; user: AuthUser; token: string }
  | { ok: false; error: "invalid" | "exists" };

export type LoginResult =
  | { ok: true; user: AuthUser; token: string }
  | { ok: false; error: "invalid" | "locked"; retryAfterSeconds: number };

function isStateLocked(state: AttemptState | null, now: Date): boolean {
  return state !== null && isLocked(state, now);
}

function maxRemainingSeconds(
  states: readonly (AttemptState | null)[],
  now: Date,
): number {
  let maximum = 0;
  for (const state of states) {
    if (state) {
      maximum = Math.max(maximum, remainingLockSeconds(state, now));
    }
  }
  return maximum;
}

async function issueSession(
  userId: string,
  now: Date,
  dependencies: AuthDependencies,
): Promise<string> {
  const token = generateSessionToken();
  await dependencies.createAuthSession(
    createAuthSessionRecord(token, userId, now),
  );
  return token;
}

async function claimLegacySafely(
  userId: string,
  dependencies: AuthDependencies,
): Promise<void> {
  try {
    await dependencies.claimLegacyData(userId);
  } catch {
    return;
  }
}

export async function registerUser(
  credentials: Credentials,
  dependencies: AuthDependencies,
): Promise<RegisterResult> {
  const now = dependencies.now();
  const record: UserRecord = {
    id: emailKey(credentials.email),
    email: credentials.email,
    passwordHash: await dependencies.hashPassword(credentials.password),
    createdAt: now.toISOString(),
  };

  try {
    await dependencies.createUser(record);
  } catch (error) {
    if (error instanceof UserAlreadyExistsError) {
      return { ok: false, error: "exists" };
    }
    throw error;
  }

  await claimLegacySafely(record.id, dependencies);
  const token = await issueSession(record.id, now, dependencies);
  return { ok: true, user: toAuthUser(record), token };
}

export async function authenticate(
  credentials: Credentials,
  ip: string,
  dependencies: AuthDependencies,
): Promise<LoginResult> {
  const now = dependencies.now();
  const account = await dependencies.readAccountAttempts(credentials.email);
  const ipAttempt = await dependencies.readIpAttempts(ip);
  if (isStateLocked(account, now) || isStateLocked(ipAttempt, now)) {
    return {
      ok: false,
      error: "locked",
      retryAfterSeconds: Math.max(
        maxRemainingSeconds([account, ipAttempt], now),
        1,
      ),
    };
  }

  const user = await dependencies.findUserByEmail(credentials.email);
  const hash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
  const validPassword = await dependencies.verifyPassword(
    credentials.password,
    hash,
  );
  if (!user || !validPassword) {
    const attempts = await dependencies.registerFailedAttempts(
      credentials.email,
      ip,
      now,
    );
    const retryAfterSeconds = maxRemainingSeconds(
      [attempts.account, attempts.ip],
      now,
    );
    return {
      ok: false,
      error: retryAfterSeconds > 0 ? "locked" : "invalid",
      retryAfterSeconds,
    };
  }

  await dependencies.clearAttempts(credentials.email, ip);
  const token = await issueSession(user.id, now, dependencies);
  return { ok: true, user: toAuthUser(user), token };
}
