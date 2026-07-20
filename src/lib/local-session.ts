import { createHmac, timingSafeEqual } from "crypto";
import type { Profile } from "@/lib/types";

/** Demo-only session: self-contained so it works on serverless (Vercel). */
function secret() {
  return (
    process.env.LOCAL_SESSION_SECRET ||
    process.env.SCRAPE_SECRET ||
    "canuto-local-demo-secret"
  );
}

export function signLocalSession(profile: Profile): string {
  const body = Buffer.from(
    JSON.stringify({
      id: profile.id,
      display_name: profile.display_name,
      role: profile.role,
      email: profile.email,
    }),
    "utf8",
  ).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyLocalSession(token?: string | null): Profile | null {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!sig) return null;

  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Profile;
    if (!parsed?.id || !parsed.role) return null;
    return parsed;
  } catch {
    return null;
  }
}
