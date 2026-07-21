import { isInstagramScrapeEnabled } from "./config";
import { downloadImage, fetchInstagramPosts } from "./fetch-posts";
import { recognizeFlyerText } from "./ocr";
import { parseAgendaFlyerText } from "./parse-agenda";
import type { ScrapedEvent } from "../normalize";

type EnvLike = Record<string, string | undefined>;

/**
 * Opt-in Instagram agenda scraper: recent posts → OCR → pending ScrapedEvents.
 * Throws when disabled or when no posts can be obtained (soft-fail in runScrapers).
 */
export async function scrapeInstagram(
  env: EnvLike = process.env,
): Promise<ScrapedEvent[]> {
  if (!isInstagramScrapeEnabled(env)) {
    throw new Error("Instagram scrape deshabilitado (INSTAGRAM_SCRAPE_ENABLED)");
  }

  const posts = await fetchInstagramPosts(env);
  const events: ScrapedEvent[] = [];

  for (const post of posts) {
    try {
      const image = await downloadImage(post.imageUrl);
      const ocrText = await recognizeFlyerText(image);
      if (!ocrText && !post.caption) continue;
      const parsed = parseAgendaFlyerText(ocrText, {
        handle: post.handle,
        postUrl: post.postUrl,
        coverUrl: post.imageUrl,
        caption: post.caption,
      });
      events.push(...parsed);
    } catch {
      // Skip single-post failures; continue other posts.
    }
  }

  return events;
}

export { isInstagramScrapeEnabled } from "./config";
