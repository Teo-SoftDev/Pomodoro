import { createHash } from "node:crypto";
import { isRecord } from "../schema";
import { validatePassword } from "./password";

export interface Credentials {
  email: string;
  password: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function emailKey(email: string): string {
  return createHash("sha256")
    .update(normalizeEmail(email), "utf8")
    .digest("hex");
}

export function validateEmail(value: string): string | null {
  const email = normalizeEmail(value);
  if (email.length < 3 || email.length > 254) {
    return "Introduce un correo electrónico válido.";
  }
  if (!EMAIL_PATTERN.test(email)) {
    return "Introduce un correo electrónico válido.";
  }
  return null;
}

export function parseCredentials(value: unknown): Credentials | null {
  if (!isRecord(value)) {
    return null;
  }
  const { email, password } = value;
  if (typeof email !== "string" || typeof password !== "string") {
    return null;
  }
  const normalizedEmail = normalizeEmail(email);
  if (validateEmail(normalizedEmail) !== null) {
    return null;
  }
  if (password.length === 0 || password.length > 128) {
    return null;
  }
  return { email: normalizedEmail, password };
}

export function parseRegistration(value: unknown): Credentials | null {
  const credentials = parseCredentials(value);
  if (!credentials || validatePassword(credentials.password).length > 0) {
    return null;
  }
  return credentials;
}
