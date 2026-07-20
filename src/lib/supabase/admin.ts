import { createClient } from "@supabase/supabase-js";
import { hasServiceRole, isSupabaseConfigured } from "./config";

export function createServiceClient() {
  if (!isSupabaseConfigured() || !hasServiceRole()) {
    throw new Error("Supabase service role is not configured");
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
