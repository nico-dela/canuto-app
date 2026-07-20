import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { localStore } from "@/lib/events/local-store";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Tenés que iniciar sesión" }, { status: 401 });
  }

  const { status = "going" } = (await request.json()) as { status?: "going" | "maybe" | "cancelled" };

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("rsvps")
      .upsert({ user_id: profile.id, event_id: id, status })
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ rsvp: data });
  }

  const event = localStore.getEvent(id, profile.id);
  if (!event) return NextResponse.json({ error: "Evento no disponible" }, { status: 404 });
  const rsvp = localStore.setRsvp(profile.id, id, status);
  return NextResponse.json({ rsvp });
}
