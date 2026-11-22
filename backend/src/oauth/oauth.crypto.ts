import { createHash, randomBytes, timingSafeEqual } from "crypto";

/** Tiền tố giúp nhận diện loại chuỗi khi lỡ lộ trong log (giống GitHub/Stripe). */
export const PREFIX = {
  clientId: "rmc_",
  clientSecret: "rms_",
  accessToken: "rma_",
  refreshToken: "rmr_",
} as const;

export function randomToken(prefix: string, bytes = 32): string {
  return prefix + randomBytes(bytes).toString("base64url");
}

/** DB chỉ lưu SHA-256 — lộ DB cũng không dùng được token/secret. */
export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
