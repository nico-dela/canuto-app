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
    if (profile.role !== "admin") {
      return NextResponse.json({ error: "Solo admin" }, { status: 403 });
    }
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("visibility", "public")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ events: data ?? [] });
  }

  if (profile.role !== "admin") {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }
  return NextResponse.json({ events: localStore.listPending() });
}

export async function PATCH(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }

  const { id, status } = (await request.json()) as {
    id: string;
    status: "approved" | "rejected";
  };

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("events")
      .update({ status })
      .eq("id", id)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ event: data });
  }

  const event = localStore.setStatus(id, status);
  if (!event) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ event });
}
