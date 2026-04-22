import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY!;

// Server-side only — uses secret key, never expose to client
export function getStorageClient() {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY env vars");
  }
  return createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);
}

export const BUCKET = "restaurant-media";

export function restaurantCoverPath(restaurantId: string, ext: string) {
  return `restaurants/${restaurantId}/cover.${ext}`;
}
