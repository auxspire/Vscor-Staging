import { supabase } from "./supabaseClient";

const STORAGE_KEY_PREFIX = "vscor-offline-events-";

export type QueuedEvent = {
  id: string; // local queue id
  matchId: string;
  payload: any; // MatchEvent shape from LiveScoring
  createdAt: string; // ISO string
  synced?: boolean; // marks whether it was sent to Supabase
};

export type OfflineSyncResult = {
  syncedCount: number;
  stillPending: number;
};

export type OfflineSyncState = {
  total: number;
  unsynced: number;
};

// ---------------------------
// Local storage helpers
// ---------------------------

function readLocalEvents(matchId: string): QueuedEvent[] {
  const key = STORAGE_KEY_PREFIX + matchId;
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e: any) => e && typeof e.id === "string" && typeof e.matchId === "string"
    );
  } catch (err) {
    console.error("[offlineEvents] Failed to read local events:", err);
    return [];
  }
}

function writeLocalEvents(matchId: string, events: QueuedEvent[]): void {
  const key = STORAGE_KEY_PREFIX + matchId;
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, JSON.stringify(events));
  } catch (err) {
    console.error("[offlineEvents] Failed to store local events:", err);
  }
}

// ---------------------------
// Public helpers
// ---------------------------

/**
 * Get all queued events (synced + unsynced) for a match.
 * LiveScoring maps `e.payload`, so we keep that shape.
 */
export function getLocalEventsForMatch(matchId: string): QueuedEvent[] {
  return readLocalEvents(matchId);
}

/**
 * Aggregate of offline state for UI badges.
 */
export function getOfflineSyncState(matchId: string): OfflineSyncState {
  const all = readLocalEvents(matchId);
  const unsynced = all.filter((e) => !e.synced).length;
  return {
    total: all.length,
    unsynced,
  };
}

/**
 * Append a new event to the local queue.
 * `payload` should be the MatchEvent object used by LiveScoring
 * (must include at least a `.type` string).
 */
export function queueLocalMatchEvent(matchId: string, payload: any): void {
  if (!matchId) return;

  const now = new Date().toISOString();
  const current = readLocalEvents(matchId);

  const queued: QueuedEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    matchId,
    payload,
    createdAt: now,
    synced: false,
  };

  const next = [...current, queued];
  writeLocalEvents(matchId, next);
}

/**
 * Try to push all UNSYNCED events for this match to Supabase.
 *
 * DB schema you shared:
 *   match_events (
 *     id uuid,
 *     match_id uuid,
 *     tournament_player_id uuid,
 *     team_role team_role,
 *     event_type match_event_type,
 *     minute integer,
 *     extra_time_minute integer,
 *     description text,
 *     created_at timestamptz
 *   )
 *
 * We map from the UI payload:
 * - event_type  <- payload.type
 * - minute      <- payload.minute OR parsed from payload.time ("MM:SS")
 * - team_role   <- payload.team (1 = home, 2 = away)
 * - description <- friendly text (type + player + team)
 */
export async function syncOfflineEventsForMatch(
  matchId: string
): Promise<OfflineSyncResult> {
  if (!matchId) {
    return { syncedCount: 0, stillPending: 0 };
  }

  const all = readLocalEvents(matchId);
  const unsynced = all.filter((e) => !e.synced);

  if (!unsynced.length) {
    return { syncedCount: 0, stillPending: all.length };
  }

  const rows = unsynced
    .map((queued) => {
      const p = queued.payload || {};
      if (!p || typeof p.type !== "string") {
        // skip invalid payloads
        return null;
      }

      // minute: try payload.minute, else parse from "time" (MM:SS)
      let minute: number | null = null;
      if (typeof p.minute === "number") {
        minute = p.minute;
      } else if (typeof p.time === "string") {
        const [m] = p.time.split(":");
        const mNum = parseInt(m, 10);
        minute = Number.isNaN(mNum) ? null : mNum;
      }

      const parts: string[] = [];
      parts.push(String(p.type).replace(/_/g, " ").toUpperCase());
      if (p.player?.name) parts.push(`- ${p.player.name}`);
      if (p.teamName) parts.push(`(${p.teamName})`);

      return {
        match_id: matchId,
        tournament_player_id: p.player?.tournamentPlayerId ?? null,
        team_role: p.team === 1 ? "home" : p.team === 2 ? "away" : null,
        event_type: p.type,
        minute,
        extra_time_minute: null,
        description: parts.join(" "),
      };
    })
    .filter((row) => row !== null) as any[];

  if (!rows.length) {
    console.warn(
      "[offlineEvents] No valid rows to sync for match",
      matchId
    );
    return { syncedCount: 0, stillPending: all.length };
  }

  try {
    const { error } = await supabase.from("match_events").insert(rows);

    if (error) {
      console.error("[offlineEvents] Failed to sync events:", error);
      // Do NOT mark as synced so they can be retried later
      return { syncedCount: 0, stillPending: all.length };
    }
  } catch (err) {
    console.error("[offlineEvents] Unexpected error while syncing:", err);
    return { syncedCount: 0, stillPending: all.length };
  }

  // Mark those events as synced locally
  const syncedIds = new Set(unsynced.map((e) => e.id));
  const updated = all.map((e) =>
    syncedIds.has(e.id) ? { ...e, synced: true } : e
  );

  writeLocalEvents(matchId, updated);

  const remainingUnsynced = updated.filter((e) => !e.synced).length;

  console.log("[offlineEvents] Successfully synced events for match", matchId);

  return {
    syncedCount: rows.length,
    stillPending: remainingUnsynced,
  };
}
