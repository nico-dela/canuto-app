/** Shared auth for /api/scrape (admin session or cron Bearer). */

export function isScrapeBearerAuthorized(
  authHeader: string | null,
  secrets: Array<string | undefined>,
): boolean {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return false;
  return secrets.some((secret) => !!secret && secret === token);
}
