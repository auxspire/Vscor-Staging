// src/lib/profiles.ts
import { supabase } from "./supabaseClient";

/**
 * Shared helpers
 */
function toId(value: string | number | undefined | null): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === "number" ? String(value) : value;
}

/* =========================================================
 * PLAYER PROFILE
 * =======================================================*/

export type PlayerProfileTotals = {
  matches: number;
  goals: number;
  yellowCards: number;
  redCards: number;
};

export type PlayerMatchRow = {
  id: string;
  date: string | null;
  teamName: string;
  opponentName: string;
  scoreText: string;
  resultText: string;
  goals: number;
};

export type PlayerProfileDTO = {
  player: any; // row from players
  tournamentPlayer: any | null; // row from tournament_players (if found)
  totals: PlayerProfileTotals;
  matches: PlayerMatchRow[];
};

/**
 * Load a player's profile from Supabase.
 *
 * `playerKey` can be:
 * - players.id  OR
 * - tournament_players.id
 *
 * If possible we:
 *  1) Resolve the base `players` row
 *  2) Resolve one `tournament_players` row (jersey, position)
 *  3) Aggregate goals + matches from match_events + matches
 */
export async function loadPlayerProfile(
  playerKey: string | number,
  opts?: { tournamentId?: string | number }
): Promise<PlayerProfileDTO | null> {
  const key = toId(playerKey);
  if (!key) return null;

  let playerRow: any | null = null;
  let tournamentPlayerRow: any | null = null;

  // 1️⃣ Try to treat key as players.id
  const { data: playerById, error: playerErr } = await supabase
    .from("players")
    .select("*")
    .eq("id", key)
    .limit(1);

  if (!playerErr && playerById && playerById.length > 0) {
    playerRow = playerById[0];

    // Optional: find one tournament_players entry for this player
    const tpQuery = supabase
      .from("tournament_players")
      .select("*")
      .eq("player_id", playerRow.id)
      .limit(1);

    const { data: tpRows } = await tpQuery;
    tournamentPlayerRow =
      tpRows && tpRows.length > 0 ? tpRows[0] : null;
  } else {
    // 2️⃣ If not found, treat key as tournament_players.id
    const { data: tpRows, error: tpErr } = await supabase
      .from("tournament_players")
      .select("*, players(*)")
      .eq("id", key)
      .limit(1);

    if (tpErr || !tpRows || tpRows.length === 0) {
      console.warn(
        "[profiles] Could not resolve player for key",
        playerKey,
        playerErr,
        tpErr
      );
      return null;
    }

    const tp = tpRows[0] as any;
    tournamentPlayerRow = tp;
    playerRow = tp.players;
  }

  if (!playerRow) {
    return null;
  }

  // 3️⃣ Determine which id match_events uses for this player
  //    Offline events currently use tournament_players.id as player_id.
  const eventsPlayerId =
    tournamentPlayerRow?.id ?? playerRow.id;

  // 4️⃣ Load match_events for this player
  const { data: eventRows, error: eventsError } = await supabase
    .from("match_events")
    .select(
      `
      id,
      match_id,
      event_type,
      minute,
      team_name,
      player_name
    `
    )
    .eq("player_id", eventsPlayerId);

  if (eventsError) {
    console.error("[profiles] match_events error", eventsError);
  }

  const events = eventRows ?? [];

  // Aggregate goals per match
  const goalsByMatch = new Map<string, number>();
  for (const ev of events) {
    const mId = toId(ev.match_id);
    if (!mId) continue;
    if (ev.event_type === "goal") {
      goalsByMatch.set(mId, (goalsByMatch.get(mId) ?? 0) + 1);
    }
  }

  const goalsTotal = Array.from(goalsByMatch.values()).reduce(
    (sum, g) => sum + g,
    0
  );

  // 5️⃣ Load all matches involved
  const matchIds = Array.from(
    new Set(
      events
        .map((ev) => toId(ev.match_id))
        .filter((x): x is string => !!x)
    )
  );

  let matchesLookup = new Map<string, any>();
  if (matchIds.length > 0) {
    const { data: matchRows, error: matchErr } = await supabase
      .from("matches")
      .select("*")
      .in("id", matchIds);

    if (matchErr) {
      console.error("[profiles] matches error", matchErr);
    }

    (matchRows ?? []).forEach((m: any) => {
      matchesLookup.set(String(m.id), m);
    });
  }

  // 6️⃣ Build matches summary rows
  const matchSummaries: PlayerMatchRow[] = matchIds.map((id) => {
    const m = matchesLookup.get(id);
    if (!m) {
      return {
        id,
        date: null,
        teamName: "Unknown",
        opponentName: "Unknown",
        scoreText: "-",
        resultText: "",
        goals: goalsByMatch.get(id) ?? 0,
      };
    }

    // Attempt to infer which side this player was on
    const teamName = m.home_team_name ?? m.team_a ?? "Team A";
    const oppName = m.away_team_name ?? m.team_b ?? "Team B";

    let scoreText = "-";
    let resultText = "";

    if (
      typeof m.home_score === "number" &&
      typeof m.away_score === "number"
    ) {
      scoreText = `${m.home_score} - ${m.away_score}`;
    }

    // We don’t know for sure which side the player is on; keep neutral
    resultText = m.status ?? "";

    return {
      id,
      date: m.started_at ?? m.kickoff_at ?? null,
      teamName,
      opponentName: oppName,
      scoreText,
      resultText,
      goals: goalsByMatch.get(id) ?? 0,
    };
  });

  const totals: PlayerProfileTotals = {
    matches: matchSummaries.length,
    goals: goalsTotal,
    yellowCards: (events ?? []).filter(
      (e: any) => e.event_type === "yellow_card"
    ).length,
    redCards: (events ?? []).filter(
      (e: any) => e.event_type === "red_card"
    ).length,
  };

  return {
    player: playerRow,
    tournamentPlayer: tournamentPlayerRow,
    totals,
    matches: matchSummaries,
  };
}

/* =========================================================
 * TEAM PROFILE
 * =======================================================*/

export type TeamSquadPlayer = {
  id: string;
  name: string;
  jerseyNumber: string | number | null;
  position: string | null;
};

export type TeamStanding = {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
};

export type TeamMatchRow = {
  id: string;
  date: string | null;
  opponentName: string;
  isHome: boolean;
  scoreText: string;
  resultText: "W" | "D" | "L" | "";
};

export type TeamProfileDTO = {
  team: any;
  tournamentTeam: any | null;
  standings: TeamStanding | null;
  squad: TeamSquadPlayer[];
  matches: TeamMatchRow[];
};

export async function loadTeamProfile(
  teamId: string | number,
  opts?: { tournamentId?: string | number }
): Promise<TeamProfileDTO | null> {
  const id = toId(teamId);
  if (!id) return null;

  // 1️⃣ Base team
  const { data: teamRows, error: teamErr } = await supabase
    .from("teams")
    .select("*")
    .eq("id", id)
    .limit(1);

  if (teamErr || !teamRows || teamRows.length === 0) {
    console.error("[profiles] team not found", teamErr);
    return null;
  }

  const team = teamRows[0];

  // 2️⃣ Tournament team row (if tournamentId provided)
  let tournamentTeam: any | null = null;

  if (opts?.tournamentId) {
    const { data: ttRows } = await supabase
      .from("tournament_teams")
      .select("*")
      .eq("team_id", id)
      .eq("tournament_id", toId(opts.tournamentId))
      .limit(1);

    if (ttRows && ttRows.length > 0) {
      tournamentTeam = ttRows[0];
    }
  } else {
    // If no tournamentId given, just pick one
    const { data: ttRows } = await supabase
      .from("tournament_teams")
      .select("*")
      .eq("team_id", id)
      .limit(1);

    if (ttRows && ttRows.length > 0) {
      tournamentTeam = ttRows[0];
    }
  }

  // 3️⃣ Squad from tournament_players → players
  let squad: TeamSquadPlayer[] = [];
  if (tournamentTeam?.id) {
    const { data: tpRows, error: tpErr } = await supabase
      .from("tournament_players")
      .select(
        `
        id,
        jersey_number,
        position,
        players (*)
      `
      )
      .eq("tournament_team_id", tournamentTeam.id);

    if (tpErr) {
      console.error("[profiles] tournament_players error", tpErr);
    }

    squad =
      (tpRows ?? []).map((tp: any) => ({
        id: String(tp.players?.id ?? tp.id),
        name: tp.players?.full_name ?? tp.players?.name ?? "Unnamed",
        jerseyNumber: tp.jersey_number ?? null,
        position: tp.position ?? null,
      })) ?? [];
  }

  // 4️⃣ Standings row
  let standings: TeamStanding | null = null;

  if (tournamentTeam?.id) {
    const { data: stRows, error: stErr } = await supabase
      .from("tournament_standings")
      .select("*")
      .eq("tournament_team_id", tournamentTeam.id)
      .limit(1);

    if (stErr) {
      console.error("[profiles] standings error", stErr);
    }

    const st = stRows && stRows.length > 0 ? stRows[0] : null;
    if (st) {
      standings = {
        played: st.played ?? st.games_played ?? 0,
        won: st.won ?? st.wins ?? 0,
        drawn: st.drawn ?? st.draws ?? 0,
        lost: st.lost ?? st.losses ?? 0,
        goalsFor: st.goals_for ?? 0,
        goalsAgainst: st.goals_against ?? 0,
        goalDiff: st.goal_diff ?? st.goal_difference ?? 0,
        points: st.points ?? 0,
      };
    }
  }

  // 5️⃣ Matches where this tournament team played (if we know it)
  let matches: TeamMatchRow[] = [];
  if (tournamentTeam?.id) {
    const ttId = tournamentTeam.id;

    const { data: matchRows, error: matchErr } = await supabase
      .from("matches")
      .select("*")
      .or(
        `home_team_id.eq.${ttId},away_team_id.eq.${ttId}`
      )
      .order("started_at", { ascending: false });

    if (matchErr) {
      console.error("[profiles] team matches error", matchErr);
    }

    matches =
      (matchRows ?? []).map((m: any) => {
        const isHome = m.home_team_id === ttId;
        const homeName = m.home_team_name ?? "Home";
        const awayName = m.away_team_name ?? "Away";

        const ourName = isHome ? homeName : awayName;
        const oppName = isHome ? awayName : homeName;

        let scoreText = "-";
        let resultText: "W" | "D" | "L" | "" = "";

        if (
          typeof m.home_score === "number" &&
          typeof m.away_score === "number"
        ) {
          scoreText = `${m.home_score} - ${m.away_score}`;
          const ourScore = isHome ? m.home_score : m.away_score;
          const theirScore = isHome ? m.away_score : m.home_score;

          if (ourScore > theirScore) resultText = "W";
          else if (ourScore < theirScore) resultText = "L";
          else resultText = "D";
        }

        return {
          id: String(m.id),
          date: m.started_at ?? m.kickoff_at ?? null,
          opponentName: oppName,
          isHome,
          scoreText,
          resultText,
        };
      }) ?? [];
  }

  return {
    team,
    tournamentTeam,
    standings,
    squad,
    matches,
  };
}
