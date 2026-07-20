import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { localStore } from "@/lib/events/local-store";
import type { Profile } from "@/lib/types";

export const LOCAL_SESSION_COOKIE = "canuto_session";

export async function getCurrentProfile(): Promise<Profile | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, role")
      .eq("id", user.id)
      .maybeSingle();
    if (!data) {
      return {
        id: user.id,
        display_name: user.email?.split("@")[0] ?? null,
        role: "user",
        email: user.email,
      };
    }
    return { ...data, email: user.email };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(LOCAL_SESSION_COOKIE)?.value;
  return localStore.sessionUser(token);
}
