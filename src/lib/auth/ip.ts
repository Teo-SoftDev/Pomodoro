import { createHmac } from "node:crypto";

export const MISSING_IP_SECRET_ERROR =
  "AUTH_IP_HASH_SECRET no está configurado.";

export function readIpSecret(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const secret = environment.AUTH_IP_HASH_SECRET;
  if (!secret || secret.trim() === "") {
    throw new Error(MISSING_IP_SECRET_ERROR);
  }
  return secret;
}

export function ipKey(ip: string, secret: string): string {
  return createHmac("sha256", secret).update(ip, "utf8").digest("hex");
}

export function clientIpFromHeaders(
  forwardedFor: string | null,
  realIp: string | null,
): string {
  const firstForwarded = forwardedFor?.split(",").at(0)?.trim();
  return firstForwarded || realIp?.trim() || "unknown";
}
