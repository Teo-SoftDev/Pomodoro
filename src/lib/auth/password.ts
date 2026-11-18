import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { PasswordPolicyError } from "./errors";

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;
export const SYMBOL_PATTERN = /[^A-Za-z0-9]/;

const SALT_BYTES = 16;
const KEY_BYTES = 64;
const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const MAX_MEMORY = 64 * 1024 * 1024;

export const DUMMY_PASSWORD_HASH =
  "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$_nIC1-dEbnXw0l-x6DZ3DjEpKheJB8voyL0RfGY1j57HfJ25GpLxY05aVNmM-oBq1nk0BJnwfUZHLCD-Yc_77w";

export function validatePassword(password: string): string[] {
  const issues: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) {
    issues.push(
      `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
    );
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    issues.push(
      `La contraseña no puede superar ${PASSWORD_MAX_LENGTH} caracteres.`,
    );
  }
  if (!SYMBOL_PATTERN.test(password)) {
    issues.push("La contraseña debe incluir al menos un símbolo.");
  }
  return issues;
}

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      KEY_BYTES,
      {
        N: COST,
        r: BLOCK_SIZE,
        p: PARALLELIZATION,
        maxmem: MAX_MEMORY,
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(derivedKey);
      },
    );
  });
}

function decodeBase64Url(value: string, expectedBytes: number): Buffer | null {
  const decoded = Buffer.from(value, "base64url");
  if (decoded.length !== expectedBytes) {
    return null;
  }
  return decoded.toString("base64url") === value ? decoded : null;
}

function parseHash(encoded: string): { salt: Buffer; expected: Buffer } | null {
  const parts = encoded.split("$");
  if (parts.length !== 6) {
    return null;
  }
  const [algorithm, cost, block, parallel, saltPart, hashPart] = parts;
  if (
    algorithm !== "scrypt" ||
    cost !== String(COST) ||
    block !== String(BLOCK_SIZE) ||
    parallel !== String(PARALLELIZATION) ||
    !saltPart ||
    !hashPart
  ) {
    return null;
  }
  const salt = decodeBase64Url(saltPart, SALT_BYTES);
  const expected = decodeBase64Url(hashPart, KEY_BYTES);
  if (!salt || !expected) {
    return null;
  }
  return { salt, expected };
}

export async function hashPassword(password: string): Promise<string> {
  const issues = validatePassword(password);
  if (issues.length > 0) {
    throw new PasswordPolicyError(issues);
  }
  const salt = randomBytes(SALT_BYTES);
  const derivedKey = await deriveKey(password, salt);
  return [
    "scrypt",
    COST,
    BLOCK_SIZE,
    PARALLELIZATION,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  const parsed = parseHash(encoded);
  if (!parsed) {
    return false;
  }
  try {
    const actual = await deriveKey(password, parsed.salt);
    return timingSafeEqual(parsed.expected, actual);
  } catch {
    return false;
  }
}
