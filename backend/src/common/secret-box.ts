import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/**
 * Mã hoá bí mật lưu trong DB (VD App Secret Mini App của từng store) bằng AES-256-GCM.
 * Khoá dẫn xuất từ một secret của server (FILE_SIGN_SECRET / JWT_SECRET) — lộ DB không lộ secret.
 * Định dạng: v1.<iv>.<tag>.<ciphertext> (base64url).
 */
const key = (serverSecret: string) => createHash("sha256").update(`${serverSecret}:secret-box`).digest();

export function sealSecret(plain: string, serverSecret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(serverSecret), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), enc.toString("base64url")].join(".");
}

export function openSecret(sealed: string | null | undefined, serverSecret: string): string | null {
  if (!sealed) return null;
  const [v, iv, tag, data] = sealed.split(".");
  if (v !== "v1" || !iv || !tag || !data) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(serverSecret), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
