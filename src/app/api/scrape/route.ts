import { NextResponse } from "next/server";
import { runScrapers } from "@/lib/scrapers/run";
import { getCurrentProfile } from "@/lib/auth";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.SCRAPE_SECRET;
  const profile = await getCurrentProfile();

  const authorized =
    (cronSecret && authHeader === `Bearer ${cronSecret}`) || profile?.role === "admin";

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
