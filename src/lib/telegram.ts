import { createHmac, timingSafeEqual } from "node:crypto";

export type TelegramUser = { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string };

export function verifyTelegramInitData(initData: string, botToken: string): TelegramUser | null {
  if (!initData || !botToken) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  const authDate = Number(params.get("auth_date"));
  if (!hash || !Number.isFinite(authDate)) return null;

  const age = Date.now() / 1000 - authDate;
  if (age > 60 * 60 * 24 || age < -60 * 5) return null;

  // Bot-token HMAC validation excludes hash only. The signature field must
  // remain in this check string; it is excluded in the separate Ed25519 flow.
  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculated = createHmac("sha256", secretKey).update(dataCheckString).digest();
  let supplied: Buffer;
  try { supplied = Buffer.from(hash, "hex"); } catch { return null; }
  if (supplied.length !== calculated.length || !timingSafeEqual(supplied, calculated)) return null;

  try {
    const user = JSON.parse(params.get("user") || "null") as TelegramUser | null;
    return user && Number.isSafeInteger(user.id) ? user : null;
  } catch { return null; }
}

export function getBearerToken(request: Request): string | null {
  const value = request.headers.get("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7) : null;
}
