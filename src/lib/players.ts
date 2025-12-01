// src/lib/players.ts
import { supabase } from "./supabaseClient";

export type PlayerDbRecord = {
  id: string;
  full_name: string;
  default_position?: string | null;
  photo_url?: string | null;
  metadata?: Record<string, any> | null;
};

/**
 * Load all players for the current org.
 * For now, we load all players; you can later filter by organization_id
 * once you wire current org into the app shell.
 */
export async function loadPlayerDatabase(): Promise<PlayerDbRecord[]> {
  const { data, error } = await supabase
    .from("players")
    .select("id, full_name, default_position, photo_url, metadata")
    .order("full_name", { ascending: true });

  if (error) {
    console.error("[loadPlayerDatabase] error loading players", error);
    return [];
  }

  return (data ?? []) as PlayerDbRecord[];
}
