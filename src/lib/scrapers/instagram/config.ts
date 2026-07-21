/** Instagram scraper is opt-in and experimental (ToS / fragile endpoints). */

type EnvLike = Record<string, string | undefined>;

export function isInstagramScrapeEnabled(env: EnvLike = process.env): boolean {
  const raw = (env.INSTAGRAM_SCRAPE_ENABLED ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function getInstagramProfiles(env: EnvLike = process.env): string[] {
  const raw = (env.INSTAGRAM_PROFILES ?? "culturabrava,isos_cba").trim();
  return raw
    .split(",")
    .map((h) => h.trim().replace(/^@/, "").toLowerCase())
    .filter(Boolean);
}

export function getInstagramSessionId(env: EnvLike = process.env): string | null {
  const id = (env.INSTAGRAM_SESSIONID ?? "").trim();
  return id || null;
}

export function getInstagramMaxPosts(env: EnvLike = process.env): number {
  const n = Number(env.INSTAGRAM_MAX_POSTS ?? "6");
  if (!Number.isFinite(n) || n < 1) return 6;
  return Math.min(Math.floor(n), 24);
}
