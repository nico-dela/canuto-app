import { NextResponse } from "next/server";
import { runScrapers } from "@/lib/scrapers/run";
import { isScrapeBearerAuthorized } from "@/lib/scrapers/auth";
import { getCurrentProfile } from "@/lib/auth";

/** Scrapers can exceed default serverless limits; raise on Pro if needed. */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const profile = await getCurrentProfile();

  const authorized =
    isScrapeBearerAuthorized(authHeader, [
      process.env.SCRAPE_SECRET,
      process.env.CRON_SECRET,
    ]) || profile?.role === "admin";

  if (!authorized) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const result = await runScrapers();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error de scraping" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
