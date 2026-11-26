import { createHmac, timingSafeEqual } from "node:crypto";

export type TelegramUser = { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string };

export function verifyTelegramInitData(initData: string, botToken: string): TelegramUser | null {
  if (!initData || !botToken) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  const authDate = Number(params.get("auth_date"));
  if (!hash || !Number.isFinite(authDate)) return null;
  if (Math.abs(Date.now() / 1000 - authDate) > 60 * 60 * 24) return null;
  params.delete("hash");
  params.delete("signature");
  const dataCheckString = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculated = createHmac("sha256", secret).update(dataCheckString).digest();
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