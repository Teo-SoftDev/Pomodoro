import { isRecord } from "../schema";
import { lockMinutes } from "./config";

export const MAX_FAILED_ATTEMPTS = 3;

const MILLISECONDS_PER_MINUTE = 60 * 1000;

export interface AttemptState {
  failures: number;
  firstFailedAt: string;
  lockedUntil: string | null;
  expiresAt: string;
}

function windowEnd(firstFailedAt: string, minutes: number): string {
  return new Date(
    Date.parse(firstFailedAt) + minutes * MILLISECONDS_PER_MINUTE,
  ).toISOString();
}

export function isLocked(state: AttemptState, now: Date = new Date()): boolean {
  return (
    state.lockedUntil !== null && Date.parse(state.lockedUntil) > now.getTime()
  );
}

export function remainingLockSeconds(
  state: AttemptState,
  now: Date = new Date(),
): number {
  if (!isLocked(state, now) || state.lockedUntil === null) {
    return 0;
  }
  return Math.ceil((Date.parse(state.lockedUntil) - now.getTime()) / 1000);
}

export function nextAttemptState(
  current: AttemptState | null,
  now: Date,
  minutes: number = lockMinutes(),
): AttemptState {
  const active =
    current && Date.parse(current.expiresAt) > now.getTime() ? current : null;
  const failures = Math.min((active?.failures ?? 0) + 1, MAX_FAILED_ATTEMPTS);
  const firstFailedAt = active?.firstFailedAt ?? now.toISOString();
  const alreadyLocked = active !== null && isLocked(active, now);
  const lockedUntil = alreadyLocked
    ? active.lockedUntil
    : failures >= MAX_FAILED_ATTEMPTS
      ? new Date(
          now.getTime() + minutes * MILLISECONDS_PER_MINUTE,
        ).toISOString()
      : null;

  return {
    failures,
    firstFailedAt,
    lockedUntil,
    expiresAt: lockedUntil ?? windowEnd(firstFailedAt, minutes),
  };
}

export function parseAttemptState(value: unknown): AttemptState | null {
  if (!isRecord(value)) {
    return null;
  }
  const { failures, firstFailedAt, lockedUntil, expiresAt } = value;
  if (
    typeof failures !== "number" ||
    !Number.isInteger(failures) ||
    failures < 1 ||
    failures > MAX_FAILED_ATTEMPTS ||
    typeof firstFailedAt !== "string" ||
    typeof expiresAt !== "string" ||
    (lockedUntil !== null && typeof lockedUntil !== "string")
  ) {
    return null;
  }
  return { failures, firstFailedAt, lockedUntil, expiresAt };
}
