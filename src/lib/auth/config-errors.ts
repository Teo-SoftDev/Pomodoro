import { MISSING_IP_SECRET_ERROR } from "./ip";

export function isAuthConfigurationError(error: unknown): boolean {
  return error instanceof Error && error.message === MISSING_IP_SECRET_ERROR;
}
