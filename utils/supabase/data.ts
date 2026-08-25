import { createClient } from "@supabase/supabase-js";

export function tryCreateDataClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key);
}

export function createDataClient() {
  const client = tryCreateDataClient();
  if (!client) {
    throw new Error("Faltan variables de Supabase.");
  }
  return client;
}
