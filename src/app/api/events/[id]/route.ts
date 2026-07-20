import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { localStore } from "@/lib/events/local-store";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const profile = await getCurrentProfile();

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({ event: data });
  }

  const event = localStore.getEvent(id, profile?.id);
  if (!event) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const codes =
    profile && event.created_by === profile.id
      ? localStore.getCodesForEvent(id, profile.id)
      : undefined;

  return NextResponse.json({ event, codes });
}
