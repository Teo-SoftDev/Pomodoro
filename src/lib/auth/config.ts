export const DEFAULT_LOCK_MINUTES = 15;
export const DEFAULT_SESSION_DAYS = 7;

export function positiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export type Environment = Readonly<Record<string, string | undefined>>;

export function lockMinutes(environment: Environment = process.env): number {
  return positiveInteger(environment.AUTH_LOCK_MINUTES, DEFAULT_LOCK_MINUTES);
}

export function sessionDays(environment: Environment = process.env): number {
  return positiveInteger(environment.AUTH_SESSION_DAYS, DEFAULT_SESSION_DAYS);
}
