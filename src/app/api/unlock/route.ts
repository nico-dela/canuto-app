import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { localStore } from "@/lib/events/local-store";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Tenés que iniciar sesión" }, { status: 401 });
  }

  const { code } = (await request.json()) as { code?: string };
  if (!code?.trim()) {
    return NextResponse.json({ error: "Ingresá un código" }, { status: 400 });
  }

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("redeem_event_code", {
      p_code: code.trim(),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ eventId: data });
  }

  try {
    const eventId = localStore.redeemCode(code, profile.id);
    return NextResponse.json({ eventId });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 400 },
    );
  }
}
