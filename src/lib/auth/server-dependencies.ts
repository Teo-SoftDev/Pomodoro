import { createAuthSession, createUser, findUserByEmail } from "./auth-store";
import type { AuthDependencies } from "./auth-service";
import { claimLegacyData } from "./legacy-migration";
import {
  clearAttempts,
  readAccountAttempts,
  readIpAttempts,
  registerFailedAttempts,
} from "./lockout-store";
import { hashPassword, verifyPassword } from "./password";

export const authDependencies: AuthDependencies = {
  hashPassword,
  verifyPassword,
  findUserByEmail,
  createUser,
  claimLegacyData,
  readAccountAttempts,
  readIpAttempts,
  registerFailedAttempts,
  clearAttempts,
  createAuthSession,
  now: () => new Date(),
};
