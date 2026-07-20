import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { localStore } from "@/lib/events/local-store";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Tenés que iniciar sesión" }, { status: 401 });
  }

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data: created } = await supabase
      .from("events")
      .select("*")
      .eq("created_by", profile.id)
      .order("starts_at", { ascending: true });

    const { data: rsvps } = await supabase
      .from("rsvps")
      .select("event_id, status, events(*)")
      .eq("user_id", profile.id)
      .eq("status", "going");

    const { data: unlocks } = await supabase
      .from("event_unlocks")
      .select("event_id, events(*)")
      .eq("user_id", profile.id);

    return NextResponse.json({
      created: created ?? [],
      going: (rsvps ?? []).map((r) => r.events).filter(Boolean),
      unlocked: (unlocks ?? []).map((u) => u.events).filter(Boolean),
    });
  }

  return NextResponse.json(localStore.listMyEvents(profile.id));
}
