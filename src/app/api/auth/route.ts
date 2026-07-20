import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { LOCAL_SESSION_COOKIE } from "@/lib/auth";
import { localStore } from "@/lib/events/local-store";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { mode, email, password, displayName } = body as {
    mode: "login" | "register";
    email: string;
    password: string;
    displayName?: string;
  };

  if (!email || !password) {
    return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
  }

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (mode === "register") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName || email.split("@")[0] } },
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ user: data.user });
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ user: data.user });
  }

  const result =
    mode === "register"
      ? localStore.register(email, password, displayName || email.split("@")[0])
      : localStore.login(email, password);

  const cookieStore = await cookies();
  cookieStore.set(LOCAL_SESSION_COOKIE, result.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ profile: result.profile, mode: "local" });
}

export async function DELETE() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return NextResponse.json({ ok: true });
  }
  const cookieStore = await cookies();
  cookieStore.delete(LOCAL_SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const { getCurrentProfile } = await import("@/lib/auth");
  const profile = await getCurrentProfile();
  return NextResponse.json({
    profile,
    mode: isSupabaseConfigured() ? "supabase" : "local",
  });
}
