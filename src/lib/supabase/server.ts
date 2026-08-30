import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  supabaseAnonKey,
  supabaseServiceKey,
  supabaseUrl,
} from "@/lib/supabase/env";

export function createServerSupabase(): SupabaseClient | null {
  const url = supabaseUrl();
  const key = supabaseServiceKey() || supabaseAnonKey();
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
