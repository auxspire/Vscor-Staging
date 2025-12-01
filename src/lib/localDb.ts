// src/lib/localDb.ts

// ---- Types ----
export type LocalPlayerRecord = {
  id: string;
  name: string;
  position?: string;
  jerseyNumber?: string;
  teamId?: string | null;
  teamName?: string | null;
  phoneNumber?: string | null;
};

export type LocalTeamRecord = {
  id: string;
  name: string;
  coach?: string;
  homeVenue?: string;
  description?: string;
  // You can mirror your TeamRecord here if needed
};

const PLAYERS_KEY = "vscor-players";
const TEAMS_KEY = "vscor-teams";

// ---- Generic helpers ----
function safeParse<T>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

// ---- Players ----
export function loadLocalPlayers(): LocalPlayerRecord[] {
  const raw = localStorage.getItem(PLAYERS_KEY);
  return safeParse<LocalPlayerRecord>(raw);
}

export function saveLocalPlayers(players: LocalPlayerRecord[]): void {
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
}

export function addLocalPlayer(player: Omit<LocalPlayerRecord, "id">): LocalPlayerRecord {
  const existing = loadLocalPlayers();
  const newPlayer: LocalPlayerRecord = {
    id: `player-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ...player,
  };
  const next = [...existing, newPlayer];
  saveLocalPlayers(next);
  return newPlayer;
}

export function updateLocalPlayer(
  playerId: string,
  patch: Partial<LocalPlayerRecord>
): void {
  const existing = loadLocalPlayers();
  const next = existing.map((p) =>
    p.id === playerId ? { ...p, ...patch } : p
  );
  saveLocalPlayers(next);
}

// ---- Teams ----
export function loadLocalTeams(): LocalTeamRecord[] {
  const raw = localStorage.getItem(TEAMS_KEY);
  return safeParse<LocalTeamRecord>(raw);
}

export function saveLocalTeams(teams: LocalTeamRecord[]): void {
  localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
}

export function addLocalTeam(
  team: Omit<LocalTeamRecord, "id">
): LocalTeamRecord {
  const existing = loadLocalTeams();
  const newTeam: LocalTeamRecord = {
    id: `team-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ...team,
  };
  const next = [...existing, newTeam];
  saveLocalTeams(next);
  return newTeam;
}
