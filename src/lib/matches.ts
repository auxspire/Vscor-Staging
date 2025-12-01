import { supabase } from "./supabaseClient";
import { recalculateTournamentAggregates } from "./stats";
const ADHOC_TOURNAMENT_ID = "5ba8608d-ece2-430c-a242-040daaee8563";
// ---------------------------
// Match Status
// ---------------------------
export type MatchStatus =
  | "scheduled"
  | "live"
  | "finished"
  | "abandoned"
  | "postponed";

// ---------------------------
// Event Types
// ---------------------------
export type MatchEventType =
  | "goal"
  | "assist"
  | "yellow_card"
  | "red_card"
  | "foul"
  | "offside"
  | "corner"
  | "kickoff"
  | "substitution"
  | "shot_on_goal"
  | "off_target"
  | "other";
export type RawRecentMatch = {
  id: string;
  tournament_id: string;
  home_score: number;
  away_score: number;
  status: string;
  created_at: string;
  kickoff_time: string | null;
};


export type LoadedSquadsForMatch = {
  homeRoster: Array<{
    id: string;
    name: string;
    jerseyNumber?: number | null;
    position?: string | null;
    teamId?: string | null;
    teamName?: string | null;
  }>;
  awayRoster: Array<{
    id: string;
    name: string;
    jerseyNumber?: number | null;
    position?: string | null;
    teamId?: string | null;
    teamName?: string | null;
  }>;
};

// ---------------------------
// Match Event (DB + UI)
// ---------------------------
export interface MatchEvent {
  id: string | number;
  matchId: string | number;

  type: MatchEventType;
  minute: number;

  teamName: string | null;
  playerName?: string | null;
  assistName?: string | null;

  playerOutName?: string | null; // substitutions
  playerInName?: string | null;

  raw?: any; // raw DB row if needed
}

// ---------------------------
// Main Match Model
// ---------------------------
export interface Match {
  id: string | number;

  teamA: string;
  teamB: string;

  scoreA: number;
  scoreB: number;

  tournament: string;
  venue: string;

  status: MatchStatus;
  time: string; // "Live: 67’", "Final", or "17:00 Kickoff"

  spectators?: number | null;

  startedAt?: string | null;
  endedAt?: string | null;
  durationMinutes?: number | null;

  events?: MatchEvent[]; // optional — populate when loading events
}
export type NewMatchInput = {
  team1: string;
  team2: string;
  playersPerTeam?: number | string;
  // You can extend this later with venue, tournamentId, kickoffAt, etc.
};


// ---------------------------
// Click Payload Types (UI)
// ---------------------------
export interface TeamClickPayload {
  id: number;
  name: string;
  matches: number;
  wins: number;
  goals: number;
}

export interface TournamentClickPayload {
  id: number;
  name: string;
  teams: number;
  matches: number;
}

type ApplyResultInput = {
  tournamentId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
};

// DB row helpers
type MatchDbRow = {
  id: string;
  tournament_id: string | null;
  tournament_fixture_id: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string | null;
  started_at: string | null;
  ended_at: string | null;
};

type TournamentFixtureRow = {
  id: string;
  tournament_id: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  kickoff_at: string | null;
  status: string | null;
};

// ---------------------------
// Finalize Match in DB
// ---------------------------

/**
 * Persist final match result to Supabase.
 * - Updates scores
 * - Marks status as "finished"
 * - Sets ended_at (and optionally duration_seconds if present)
 */
export type FinalizeMatchInput = {
  matchId: string | number;
  homeScore: number;
  awayScore: number;
  durationSeconds?: number;
};



export type SquadPlayer = {
  id: string;
  name: string;
  jerseyNumber: number | null;
  position: string | null;
};

export type LoadedSquads = {
  homeRoster: SquadPlayer[];
  awayRoster: SquadPlayer[];
};
/**
 * Persist final match result to Supabase.
 * - Updates scores in matches
 * - Marks status as "finished"
 * - Sets ended_at (and optionally duration_seconds if present)
 * - If the match is linked to a tournament fixture + teams,
 *   it also updates:
 *   - tournament_fixtures (home/away score + status)
 *   - tournament_standings (W/D/L, GF/GA, points, last5)
 */
/**
 * Persist final match result to Supabase.
 * - Updates scores in matches
 * - Marks status as "finished"
 * - (Optionally) stores duration in metadata JSON
 * - If the match is linked to a tournament fixture:
 *   - updates tournament_fixtures (home/away score + status)
 *   - triggers recalculateTournamentAggregates(tournament_id)
 */
export async function finalizeMatchInDb(
  input: FinalizeMatchInput
): Promise<void> {
  const { matchId, homeScore, awayScore, durationSeconds } = input;

  if (!matchId) {
    throw new Error("finalizeMatchInDb: matchId is required");
  }

  // 0) Fetch match row first (for tournament_id + existing metadata)
  const { data: matchRow, error: matchFetchError } = await supabase
    .from("matches")
    .select("id, tournament_id, metadata")
    .eq("id", matchId)
    .maybeSingle();

  if (matchFetchError) {
    console.error(
      "[matches] finalizeMatchInDb: failed to fetch match row",
      matchFetchError
    );
    throw matchFetchError;
  }

  if (!matchRow) {
    console.warn(
      "[matches] finalizeMatchInDb: match row not found for id",
      matchId
    );
    return;
  }

  const tournamentId: string | null = matchRow.tournament_id;

  // 1) Update the matches row itself
  const updatePayload: Record<string, any> = {
    home_score: homeScore,
    away_score: awayScore,
    status: "finished" as MatchStatus,
  };

  // If you want to keep duration, store it inside metadata JSON
  if (typeof durationSeconds === "number") {
    const existingMeta = (matchRow as any).metadata || {};
    updatePayload.metadata = {
      ...existingMeta,
      duration_seconds: durationSeconds,
    };
  }

  const { error: updateError } = await supabase
    .from("matches")
    .update(updatePayload)
    .eq("id", matchId);

  if (updateError) {
    console.error(
      "[matches] finalizeMatchInDb: failed to update match row",
      updateError
    );
    throw updateError;
  }

  // 2) If there is a linked tournament fixture, update it
  try {
    const { data: fx, error: fxError } = await supabase
      .from("tournament_fixtures")
      .select("id")
      .eq("match_id", matchId)
      .maybeSingle();

    if (fxError) {
      console.error(
        "[matches] finalizeMatchInDb: failed to find fixture for match",
        fxError
      );
    } else if (fx) {
      const { error: fixtureUpdateError } = await supabase
        .from("tournament_fixtures")
        .update({
          home_score: homeScore,
          away_score: awayScore,
          status: "completed", // keep in sync with your enum
        })
        .eq("id", fx.id);

      if (fixtureUpdateError) {
        console.error(
          "[matches] finalizeMatchInDb: failed to update fixture",
          fixtureUpdateError
        );
      }
    }
  } catch (e) {
    console.error(
      "[matches] finalizeMatchInDb: unexpected error while updating fixture",
      e
    );
  }

  // 3) Recalculate tournament aggregates (standings / stats)
  if (tournamentId) {
    try {
      await recalculateTournamentAggregates(tournamentId);
    } catch (e) {
      console.error(
        "[matches] finalizeMatchInDb: recalculateTournamentAggregates failed",
        e
      );
      // do not throw – core match update already succeeded
    }
  }
}


/**
 * Simple facade for updating a match result from the UI.
 * - Persists home/away scores and marks match finished
 * - Also keeps tournament fixtures + standings in sync
 */
export async function updateMatchResult(
  matchId: string,
  homeScore: number,
  awayScore: number,
  durationSeconds?: number
): Promise<void> {
  if (!matchId) {
    throw new Error("updateMatchResult: matchId is required");
  }

  return finalizeMatchInDb({
    matchId,
    homeScore,
    awayScore,
    durationSeconds,
  });
}

export async function setMatchLive(matchId: string) {
  const { error } = await supabase
    .from("matches")
    .update({ status: "live" })
    .eq("id", matchId);

  if (error) {
    console.error("[matches] setMatchLive error:", error);
  }
}
export async function setMatchFullTime(matchId: string) {
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, tournament_id")
    .eq("id", matchId)
    .single();

  if (matchError || !match) {
    throw new Error(
      `Could not load match ${matchId} to finish: ${
        matchError?.message ?? "not found"
      }`
    );
  }

  const { error: updateError } = await supabase
    .from("matches")
    .update({ status: "finished" }) // ✅ matches MatchStatus + your mapping
    .eq("id", matchId);

  if (updateError) {
    throw new Error(
      `Failed to set match finished: ${updateError.message}`
    );
  }

  await recalculateTournamentAggregates(match.tournament_id as string);
}







// ----------------------------------------------------------------------
// Helpers: derive players-per-side from match_format / tournament config
// ----------------------------------------------------------------------
function mapMatchFormatToPlayers(
  format: string | null | undefined
): number | null {
  if (!format) return null;

  switch (format) {
    case "five_a_side":
      return 5;
    case "seven_a_side":
      return 7;
    case "nine_a_side":
      return 9; // only used if you have this enum value
    case "eleven_a_side":
      return 11;
    default:
      return null;
  }
}
/**
 * Compute the effective "players per side" for a given match.
 * Priority:
 * 1) matches.custom_players_per_side
 * 2) players-per-side inferred from matches.format
 * 3) tournaments.custom_players_per_side
 * 4) tournaments.format_default
 * 5) tournaments.min_squad_size
 * 6) Fallback: 11
 */
export async function getPlayersPerSideForMatch(
  matchId: string
): Promise<number> {
  if (!matchId) return 11;

  try {
    // 1) Load match basics
    const { data: matchRow, error: matchError } = await supabase
      .from("matches")
      .select(
        `
        id,
        tournament_id,
        format,
        custom_players_per_side
      `
      )
      .eq("id", matchId)
      .single();

    if (matchError || !matchRow) {
      console.warn(
        "[matches] getPlayersPerSideForMatch: match load error",
        matchError
      );
      return 11;
    }

    const matchCustom = matchRow.custom_players_per_side as
      | number
      | null
      | undefined;
    const matchFormat = matchRow.format as string | null | undefined;
    const tournamentId = matchRow.tournament_id as string | null | undefined;

    // 1) Match-level custom override
    if (typeof matchCustom === "number" && matchCustom > 0) {
      return matchCustom;
    }

    // 2) From match.format
    const fromMatchFormat = mapMatchFormatToPlayers(matchFormat);
    if (fromMatchFormat) return fromMatchFormat;

    // 3) Fallback to tournament config if we have a tournament
    if (tournamentId) {
      const { data: tRow, error: tError } = await supabase
        .from("tournaments")
        .select(
          `
          format_default,
          custom_players_per_side,
          min_squad_size
        `
        )
        .eq("id", tournamentId)
        .single();

      if (!tError && tRow) {
        const tCustom = tRow.custom_players_per_side as
          | number
          | null
          | undefined;
        const tFormat = tRow.format_default as string | null | undefined;
        const tMin = tRow.min_squad_size as number | null | undefined;

        if (typeof tCustom === "number" && tCustom > 0) {
          return tCustom;
        }

        const fromTournamentFormat = mapMatchFormatToPlayers(tFormat);
        if (fromTournamentFormat) return fromTournamentFormat;

        if (typeof tMin === "number" && tMin > 0) {
          return tMin;
        }
      } else if (tError) {
        console.warn(
          "[matches] getPlayersPerSideForMatch: tournament load error",
          tError
        );
      }
    }

    // 4) Final fallback
    return 11;
  } catch (e) {
    console.error(
      "[matches] getPlayersPerSideForMatch: unexpected error",
      e
    );
    return 11;
  }
}

/**
 * Given a tournament_fixtures.id, ensure there is a linked row in `matches`.
 * - If a match already exists for that fixture, returns it.
 * - Otherwise:
 *   - ensures tournament_teams rows for home/away teams
 *   - creates a new `matches` row
 *   - links it back to the fixture.match_id
 */
// ----------------------------------------------------------------------
// ensureMatchForFixture – aligns with tournament_fixtures schema
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// ensureMatchForFixture – aligns with tournament_fixtures schema
// ----------------------------------------------------------------------



export async function ensureMatchForFixture(opts: { fixtureId: string }) {
  const { fixtureId } = opts;

  // 1) Load the fixture using the real columns from your schema
  const { data: fixture, error: fixtureError } = await supabase
    .from("tournament_fixtures")
    .select(
      `
        id,
        tournament_id,
        match_id,
        home_team_id,
        away_team_id,
        kickoff_at,
        venue
      `
    )
    .eq("id", fixtureId)
    .single();

  if (fixtureError || !fixture) {
    throw new Error(
      `Could not load fixture ${fixtureId}: ${
        fixtureError?.message ?? "not found"
      }`
    );
  }

  // 2) If a match is already linked, just return it
  if (fixture.match_id) {
    return {
      matchId: fixture.match_id as string,
      tournamentId: fixture.tournament_id as string,
    };
  }
  let matchFormat: string = "eleven_a_side";
  let matchCustomPlayersPerSide: number | null = null;
  const tournamentId = fixture.tournament_id as string | null;
  const homeTeamId = fixture.home_team_id as string | null;
  const awayTeamId = fixture.away_team_id as string | null;

  if (!tournamentId || !homeTeamId || !awayTeamId) {
    throw new Error(
      `Fixture ${fixtureId} is missing tournament_id or team ids`
    );
  }
  try {
    const { data: tRow, error: tError } = await supabase
      .from("tournaments")
      .select("format_default, custom_players_per_side")
      .eq("id", tournamentId)
      .single();

    if (tError) {
      console.warn(
        "[VScor] ensureMatchForFixture: failed to load tournament, using defaults",
        tError
      );
    } else if (tRow) {
      const tFormat = tRow.format_default as string | null | undefined;
      const tCustom = tRow.custom_players_per_side as
        | number
        | null
        | undefined;

      if (tFormat && typeof tFormat === "string") {
        matchFormat = tFormat;
      }

      if (typeof tCustom === "number" && tCustom > 0) {
        matchCustomPlayersPerSide = tCustom;
      }
    }
  } catch (e) {
    console.warn(
      "[VScor] ensureMatchForFixture: tournament lookup error, using defaults",
      e
    );
  }

  // 3) Get or create tournament_teams for these teams
  //    (reuses your existing helper used for Adhoc matches)
  const [homeTTId, awayTTId] = await Promise.all([
    getOrCreateTournamentTeamId(tournamentId, homeTeamId),
    getOrCreateTournamentTeamId(tournamentId, awayTeamId),
  ]);

  // 4) Create a new match row in matches
   const { data: matchRow, error: matchError } = await supabase
    .from("matches")
    .insert({
      tournament_id: tournamentId,
      home_tournament_team_id: homeTTId,
      away_tournament_team_id: awayTTId,
      // now aligned with tournament defaults
      format: matchFormat,
      custom_players_per_side: matchCustomPlayersPerSide,
      venue_name: fixture.venue ?? null,
      kickoff_time: fixture.kickoff_at ?? null,
      status: "scheduled",
      home_score: 0,
      away_score: 0,
      metadata: {},
    })
    .select("id, tournament_id")
    .single();

  if (matchError || !matchRow) {
    throw new Error(
      `Could not create match for fixture ${fixtureId}: ${
        matchError?.message ?? "unknown error"
      }`
    );
  }

  // 5) Link the match back to the fixture (best-effort)
  const { error: linkError } = await supabase
    .from("tournament_fixtures")
    .update({ match_id: matchRow.id })
    .eq("id", fixtureId);

  if (linkError) {
    console.warn(
      "[VScor] Match created but failed to link to fixture:",
      linkError
    );
  }

  return {
    matchId: matchRow.id as string,
    tournamentId: matchRow.tournament_id as string,
  };
}


// ----------------------------------------------------------------------
// Standings update for a single result (applyResultToStandings)
// ----------------------------------------------------------------------

async function applyResultToStandings(input: ApplyResultInput): Promise<void> {
  const { tournamentId, homeTeamId, awayTeamId, homeScore, awayScore } = input;

  // 1) Get points config from tournament_info (optional)
  let pointsForWin = 3;
  let pointsForDraw = 1;
  let pointsForLoss = 0;

  const { data: infoRow, error: infoError } = await supabase
    .from("tournament_info")
    .select("points_for_win, points_for_draw, points_for_loss")
    .eq("tournament_id", tournamentId)
    .maybeSingle();

  if (infoError) {
    console.warn(
      "[matches] applyResultToStandings: tournament_info error:",
      infoError
    );
  } else if (infoRow) {
    pointsForWin = infoRow.points_for_win ?? pointsForWin;
    pointsForDraw = infoRow.points_for_draw ?? pointsForDraw;
    pointsForLoss = infoRow.points_for_loss ?? pointsForLoss;
  }

  // 2) Load existing standings rows for these two teams
  const { data: existingRows, error: standingsError } = await supabase
    .from("tournament_standings")
    .select(
      `
        id,
        team_id,
        played,
        won,
        drawn,
        lost,
        goals_for,
        goals_against,
        goal_diff,
        points,
        last5,
        group_name
      `
    )
    .eq("tournament_id", tournamentId)
    .in("team_id", [homeTeamId, awayTeamId]);

  if (standingsError) {
    console.error(
      "[matches] applyResultToStandings: load error:",
      standingsError
    );
    throw new Error(standingsError.message);
  }

  const byTeamId = new Map<string, any>();
  (existingRows ?? []).forEach((row: any) => {
    byTeamId.set(row.team_id, row);
  });

  // Helper to compute result char + points
  const getResultChar = (gf: number, ga: number): "W" | "D" | "L" => {
    if (gf > ga) return "W";
    if (gf < ga) return "L";
    return "D";
  };

  const homeResult = getResultChar(homeScore, awayScore);
  const awayResult = getResultChar(awayScore, homeScore);

  const resultToPoints = (result: "W" | "D" | "L") => {
    switch (result) {
      case "W":
        return pointsForWin;
      case "D":
        return pointsForDraw;
      case "L":
      default:
        return pointsForLoss;
    }
  };

  // Helper to build new last5 string (prepend latest, keep max 5)
  const nextLast5 = (prev: string | null | undefined, res: "W" | "D" | "L") => {
    const base = (prev ?? "").toString().slice(0, 4); // keep at most 4 of old, we'll add new at front
    return (res + base).slice(0, 5);
  };

  const updates: any[] = [];
  const inserts: any[] = [];

  // 3) Prepare home row (update or insert)
  const homeExisting = byTeamId.get(homeTeamId);
  const homeBase = homeExisting || {
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goals_for: 0,
    goals_against: 0,
    goal_diff: 0,
    points: 0,
    last5: null,
    group_name: null,
  };

  const homeResChar = homeResult;
  const homePointsDelta = resultToPoints(homeResChar);

  const homePlayed = (homeBase.played ?? 0) + 1;
  const homeWon = (homeBase.won ?? 0) + (homeResChar === "W" ? 1 : 0);
  const homeDrawn = (homeBase.drawn ?? 0) + (homeResChar === "D" ? 1 : 0);
  const homeLost = (homeBase.lost ?? 0) + (homeResChar === "L" ? 1 : 0);
  const homeGF = (homeBase.goals_for ?? 0) + homeScore;
  const homeGA = (homeBase.goals_against ?? 0) + awayScore;
  const homeGD = homeGF - homeGA;
  const homePoints = (homeBase.points ?? 0) + homePointsDelta;
  const homeLast5 = nextLast5(homeBase.last5, homeResChar);

  if (homeExisting) {
    updates.push({
      id: homeExisting.id,
      played: homePlayed,
      won: homeWon,
      drawn: homeDrawn,
      lost: homeLost,
      goals_for: homeGF,
      goals_against: homeGA,
      goal_diff: homeGD,
      points: homePoints,
      last5: homeLast5,
    });
  } else {
    inserts.push({
      tournament_id: tournamentId,
      team_id: homeTeamId,
      group_name: null,
      position: null, // you can later recalc proper positions
      played: homePlayed,
      won: homeWon,
      drawn: homeDrawn,
      lost: homeLost,
      goals_for: homeGF,
      goals_against: homeGA,
      goal_diff: homeGD,
      points: homePoints,
      last5: homeLast5,
    });
  }

  // 4) Prepare away row (update or insert)
  const awayExisting = byTeamId.get(awayTeamId);
  const awayBase = awayExisting || {
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goals_for: 0,
    goals_against: 0,
    points: 0,
    goal_diff: 0,
    last5: null,
    group_name: null,
  };

  const awayResChar = awayResult;
  const awayPointsDelta = resultToPoints(awayResChar);

  const awayPlayed = (awayBase.played ?? 0) + 1;
  const awayWon = (awayBase.won ?? 0) + (awayResChar === "W" ? 1 : 0);
  const awayDrawn = (awayBase.drawn ?? 0) + (awayResChar === "D" ? 1 : 0);
  const awayLost = (awayBase.lost ?? 0) + (awayResChar === "L" ? 1 : 0);
  const awayGF = (awayBase.goals_for ?? 0) + awayScore;
  const awayGA = (awayBase.goals_against ?? 0) + homeScore;
  const awayGD = awayGF - awayGA;
  const awayPoints = (awayBase.points ?? 0) + awayPointsDelta;
  const awayLast5 = nextLast5(awayBase.last5, awayResChar);

  if (awayExisting) {
    updates.push({
      id: awayExisting.id,
      played: awayPlayed,
      won: awayWon,
      drawn: awayDrawn,
      lost: awayLost,
      goals_for: awayGF,
      goals_against: awayGA,
      goal_diff: awayGD,
      points: awayPoints,
      last5: awayLast5,
    });
  } else {
    inserts.push({
      tournament_id: tournamentId,
      team_id: awayTeamId,
      group_name: null,
      position: null,
      played: awayPlayed,
      won: awayWon,
      drawn: awayDrawn,
      lost: awayLost,
      goals_for: awayGF,
      goals_against: awayGA,
      goal_diff: awayGD,
      points: awayPoints,
      last5: awayLast5,
    });
  }

  // 5) Persist updates
  if (updates.length > 0) {
    const { error: updateError } = await supabase
      .from("tournament_standings")
      .upsert(updates, { onConflict: "id" });

    if (updateError) {
      console.error(
        "[matches] applyResultToStandings: update error:",
        updateError
      );
      throw new Error(updateError.message);
    }
  }

  if (inserts.length > 0) {
    const { error: insertError } = await supabase
      .from("tournament_standings")
      .insert(inserts);

    if (insertError) {
      console.error(
        "[matches] applyResultToStandings: insert error:",
        insertError
      );
      throw new Error(insertError.message);
    }
  }
}
type AdhocMatchArgs = {
  team1: string;
  team2: string;
  playersPerTeam: number | string;
};

async function getOrCreateTeamIdByName(name: string): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Team name cannot be empty");
  }

  // 1) Try to find existing team by exact name
  const { data, error } = await supabase
    .from("teams")
    .select("id")
    .eq("name", trimmed)
    .limit(1);

  if (error) {
    console.error(
      "[matches] getOrCreateTeamIdByName: fetch error",
      JSON.stringify(error, null, 2)
    );
  }

  if (data && data.length > 0 && data[0]?.id) {
    return data[0].id as string;
  }

  // 2) Create new team
  const { data: created, error: insertErr } = await supabase
    .from("teams")
    .insert([{ name: trimmed }])
    .select("id")
    .single();

  if (insertErr || !created?.id) {
    console.error(
      "[matches] getOrCreateTeamIdByName: insert error",
      JSON.stringify(insertErr, null, 2)
    );
    throw insertErr ?? new Error("Failed to create team");
  }

  return created.id as string;
}

/**
 * Ensure there is a `tournament_teams` row linking this team to this tournament.
 * Returns the tournament_teams.id.
 */
async function getOrCreateTournamentTeamId(
  tournamentId: string,
  teamId: string
): Promise<string> {
  // 1) Try existing tournament_team
  const { data, error } = await supabase
    .from("tournament_teams")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("team_id", teamId)
    .limit(1);

  if (error) {
    console.error(
      "[matches] getOrCreateTournamentTeamId: fetch error",
      JSON.stringify(error, null, 2)
    );
  }

  if (data && data.length > 0 && data[0]?.id) {
    return data[0].id as string;
  }

  // 2) Create tournament_team link
  const { data: created, error: insertErr } = await supabase
    .from("tournament_teams")
    .insert([{ tournament_id: tournamentId, team_id: teamId }])
    .select("id")
    .single();

  if (insertErr || !created?.id) {
    console.error(
      "[matches] getOrCreateTournamentTeamId: insert error",
      JSON.stringify(insertErr, null, 2)
    );
    throw insertErr ?? new Error("Failed to create tournament_team link");
  }

  return created.id as string;
}

/**
 * Create a match under the ADHOC_TOURNAMENT_ID for a quick game.
 * - Ensures teams exist in `teams`
 * - Ensures `tournament_teams` entries for the adhoc tournament
 * - Creates a row in `matches` with appropriate format/custom_players_per_side
 */
export async function createMatchForAdHocGame(
  args: AdhocMatchArgs
): Promise<{ id: string }> {
  const { team1, team2, playersPerTeam } = args;

  try {
    if (!ADHOC_TOURNAMENT_ID) {
      throw new Error(
        "ADHOC_TOURNAMENT_ID is not set. Please set it at the top of matches.ts."
      );
    }

    // Normalise players-per-side
    const playersNum = Number(playersPerTeam) || 11;

    // Derive a match_format value based on players per team.
    // Adjust this mapping if your match_format enum differs.
    let format: "five_a_side" | "seven_a_side" | "eleven_a_side" | "custom";
    let customPlayersPerSide: number | null = null;

    if (playersNum <= 5) {
      format = "five_a_side";
    } else if (playersNum <= 7) {
      format = "seven_a_side";
    } else if (playersNum === 11) {
      format = "eleven_a_side";
    } else {
      // Anything unusual (e.g. 9) we treat as custom
      format = "custom";
      customPlayersPerSide = playersNum;
    }

    // 1) Resolve or create teams in the global teams table
    const [team1Id, team2Id] = await Promise.all([
      getOrCreateTeamIdByName(team1),
      getOrCreateTeamIdByName(team2),
    ]);

    // 2) Ensure tournament_teams rows for the adhoc tournament
    const [homeTTId, awayTTId] = await Promise.all([
      getOrCreateTournamentTeamId(ADHOC_TOURNAMENT_ID, team1Id),
      getOrCreateTournamentTeamId(ADHOC_TOURNAMENT_ID, team2Id),
    ]);

    // 3) Create the match row
    const { data: match, error: insertErr } = await supabase
      .from("matches")
      .insert({
        tournament_id: ADHOC_TOURNAMENT_ID,
        home_tournament_team_id: homeTTId,
        away_tournament_team_id: awayTTId,
        format,
        custom_players_per_side: customPlayersPerSide,
        venue_name: null,
        kickoff_time: new Date().toISOString(),
        status: "scheduled",
        home_score: 0,
        away_score: 0,
        metadata: {
          source: "adhoc",
          created_via: "createMatchForAdHocGame",
        },
      })
      .select("id")
      .single();

    if (insertErr || !match?.id) {
      console.error(
        "[matches] createMatchForAdHocGame error:",
        JSON.stringify(insertErr, null, 2)
      );
      throw insertErr ?? new Error("Failed to create match");
    }

    return { id: match.id as string };
  } catch (error: any) {
    console.error(
      "[matches] createMatchForAdHocGame unexpected error:",
      error
    );
    throw error;
  }
}

// ---------------------------
// Standings full recalculation helpers
// ---------------------------

type ResultLetter = "W" | "D" | "L";
type TeamRole = "home" | "away";
type StandingAccumulator = {
  teamId: string;
  tournamentId: string;

  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  results: ResultLetter[]; // in chronological order
};

async function getPointsConfig(tournamentId: string): Promise<{
  win: number;
  draw: number;
  loss: number;
}> {
  const { data, error } = await supabase
    .from("tournament_info")
    .select(
      `
      points_for_win,
      points_for_draw,
      points_for_loss
    `
    )
    .eq("tournament_id", tournamentId)
    .maybeSingle();

  if (error) {
    console.warn(
      "[matches] getPointsConfig error, falling back to 3-1-0:",
      error
    );
  }

  return {
    win: data?.points_for_win ?? 3,
    draw: data?.points_for_draw ?? 1,
    loss: data?.points_for_loss ?? 0,
  };
}

/**
 * Recalculate standings for a whole tournament based on tournament_fixtures.
 * - Reads all finished fixtures for the tournament
 * - Aggregates per-team stats
 * - Wipes existing rows in tournament_standings for that tournament
 * - Inserts fresh, sorted rows with position + last5
 */
export async function recalculateStandingsForTournament(
  tournamentId: string
): Promise<void> {
  if (!tournamentId) return;

  const points = await getPointsConfig(tournamentId);

  // 1. Load all fixtures for this tournament
  const { data: fixtures, error: fixturesError } = await supabase
    .from("tournament_fixtures")
    .select(
      `
      id,
      tournament_id,
      status,
      home_team_id,
      away_team_id,
      home_score,
      away_score
    `
    )
    .eq("tournament_id", tournamentId);

  if (fixturesError) {
    console.error(
      "[matches] recalculateStandingsForTournament fixtures error:",
      fixturesError
    );
    throw new Error(fixturesError.message);
  }

  const finishedFixtures =
    fixtures?.filter(
      (f: any) =>
        f.status === "finished" &&
        typeof f.home_score === "number" &&
        typeof f.away_score === "number"
    ) ?? [];

  const acc = new Map<string, StandingAccumulator>();

  const getOrCreate = (teamId: string): StandingAccumulator => {
    let entry = acc.get(teamId);
    if (!entry) {
      entry = {
        teamId,
        tournamentId,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        results: [],
      };
      acc.set(teamId, entry);
    }
    return entry;
  };

  // 2. Aggregate stats
  for (const f of finishedFixtures) {
    const homeId = f.home_team_id as string | null;
    const awayId = f.away_team_id as string | null;
    const hs = f.home_score as number;
    const as = f.away_score as number;

    if (!homeId || !awayId) continue;

    const home = getOrCreate(homeId);
    const away = getOrCreate(awayId);

    home.played += 1;
    away.played += 1;

    home.goalsFor += hs;
    home.goalsAgainst += as;

    away.goalsFor += as;
    away.goalsAgainst += hs;

    let homeResult: ResultLetter;
    let awayResult: ResultLetter;

    if (hs > as) {
      home.won += 1;
      away.lost += 1;
      homeResult = "W";
      awayResult = "L";
    } else if (hs < as) {
      away.won += 1;
      home.lost += 1;
      homeResult = "L";
      awayResult = "W";
    } else {
      home.drawn += 1;
      away.drawn += 1;
      homeResult = "D";
      awayResult = "D";
    }

    home.results.push(homeResult);
    away.results.push(awayResult);
  }

  const rows = Array.from(acc.values()).map((row) => {
    const gd = row.goalsFor - row.goalsAgainst;
    const pointsTotal =
      row.won * points.win +
      row.drawn * points.draw +
      row.lost * points.loss;

    const last5 = row.results.slice(-5).join("");

    return {
      teamId: row.teamId,
      tournamentId: row.tournamentId,
      played: row.played,
      won: row.won,
      drawn: row.drawn,
      lost: row.lost,
      goalsFor: row.goalsFor,
      goalsAgainst: row.goalsAgainst,
      goalDiff: gd,
      points: pointsTotal,
      last5,
    };
  });

  // 3. Sort for positions: points desc, GD desc, GF desc
  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goalDiff;
    const gdB = b.goalDiff;
    if (gdB !== gdA) return gdB - gdA;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    // stable-ish: arbitrary but deterministic
    return a.teamId.localeCompare(b.teamId);
  });

  // 4. Wipe existing standings for this tournament
  const { error: delError } = await supabase
    .from("tournament_standings")
    .delete()
    .eq("tournament_id", tournamentId);

  if (delError) {
    console.error(
      "[matches] recalculateStandingsForTournament delete error:",
      delError
    );
    throw new Error(delError.message);
  }

  if (rows.length === 0) {
    // No finished fixtures → empty table is fine.
    return;
  }

  // 5. Insert fresh rows
  const insertPayload = rows.map((row, index) => ({
    tournament_id: row.tournamentId,
    team_id: row.teamId,
    group_name: null,
    position: index + 1,
    played: row.played,
    won: row.won,
    drawn: row.drawn,
    lost: row.lost,
    goals_for: row.goalsFor,
    goals_against: row.goalsAgainst,
    goal_diff: row.goalDiff,
    points: row.points,
    last5: row.last5,
  }));

  const { error: insertError } = await supabase
    .from("tournament_standings")
    .insert(insertPayload);

  if (insertError) {
    console.error(
      "[matches] recalculateStandingsForTournament insert error:",
      insertError
    );
    throw new Error(insertError.message);
  }
}
export type SaveLineupsForMatchInput = {
  matchId: string | number;
  teamRole: TeamRole;
  players: Array<{
    id: string | number;
    name: string;
    jerseyNumber?: string | number;
    position?: string | null;
    // we ignore other fields from VscorPlayer for now
  }>;
};
export async function saveLineupsForMatch(
  input: SaveLineupsForMatchInput
): Promise<void> {
  const { matchId, teamRole, players } = input;

  if (!matchId) {
    console.warn("[matches] saveLineupsForMatch called without matchId");
    return;
  }

  const matchIdStr = String(matchId);
  const teamRoleStr: string = teamRole === "home" ? "home" : "away";

  // 1) Delete any existing rows for this match + team role
  const { error: delError } = await supabase
    .from("match_lineups")
    .delete()
    .eq("match_id", matchIdStr)
    .eq("team_role", teamRoleStr);

  if (delError) {
    console.error("[matches] saveLineupsForMatch delete error:", delError);
    throw new Error(delError.message);
  }

  if (!players || players.length === 0) {
    // No players to insert is valid – just means "clear this lineup"
    return;
  }

  // 2) Insert fresh rows
  const rowsToInsert = players.map((p, index) => ({
    match_id: matchIdStr,
    team_role: teamRoleStr, // "home" or "away"
    player_id: typeof p.id === "string" || typeof p.id === "number" ? p.id : null,
    player_name: p.name,
    jersey_number:
      p.jerseyNumber !== undefined && p.jerseyNumber !== null
        ? Number(p.jerseyNumber)
        : null,
    position: p.position ?? null,
   // is_starting: true,
    sort_order: index + 1, // optional if you have this column
  }));

  const { error: insertError } = await supabase
    .from("match_lineups")
    .insert(rowsToInsert);

  if (insertError) {
    console.error("[matches] saveLineupsForMatch insert error:", insertError);
    throw new Error(insertError.message);
  }
}
/**
 * Convenience helper: given a fixture id, look up its tournament_id
 * and then recalculate standings for that tournament.
 */
export async function recalculateStandingsForFixture(
  fixtureId: string
): Promise<void> {
  if (!fixtureId) return;

  const { data, error } = await supabase
    .from("tournament_fixtures")
    .select("tournament_id")
    .eq("id", fixtureId)
    .maybeSingle();

  if (error) {
    console.error(
      "[matches] recalculateStandingsForFixture lookup error:",
      error
    );
    throw new Error(error.message);
  }

  const tournamentId = data?.tournament_id as string | undefined;
  if (!tournamentId) {
    console.warn(
      "[matches] recalculateStandingsForFixture: no tournament_id for fixture",
      fixtureId
    );
    return;
  }

  await recalculateStandingsForTournament(tournamentId);
}

// ----------------------------------------------------------------------
// Recent matches loader for Dashboard
// ----------------------------------------------------------------------

export type RecentMatchSummary = {
  id: string;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  tournamentName: string | null;
  status: string | null;
};

/**
 * Given a match id:
 *  - Reads home_tournament_team_id / away_tournament_team_id from matches
 *  - Loads tournament_players for those two tournament_team ids
 *  - Loads players table rows
 *  - Returns nicely shaped rosters to feed into SelectSquad
 */
export async function loadSquadsForMatch(
  matchId: string
): Promise<LoadedSquadsForMatch | null> {
  if (!matchId) return null;

  // 1) Load match → get tournament_team ids
  const { data: matchRow, error: matchError } = await supabase
    .from("matches")
    .select(
      `
      id,
      tournament_id,
      home_tournament_team_id,
      away_tournament_team_id
    `
    )
    .eq("id", matchId)
    .maybeSingle();

  if (matchError || !matchRow) {
    console.error("[matches] loadSquadsForMatch: match error", matchError);
    return null;
  }

  const homeTTId = matchRow.home_tournament_team_id as string | null;
  const awayTTId = matchRow.away_tournament_team_id as string | null;

  if (!homeTTId || !awayTTId) {
    console.warn(
      "[matches] loadSquadsForMatch: match has no home/away tournament_team ids"
    );
    return null;
  }

  // 2) Load tournament_players for both teams
  const { data: tpRows, error: tpError } = await supabase
    .from("tournament_players")
    .select(
      `
      id,
      tournament_team_id,
      player_id,
      jersey_number,
      position
    `
    )
    .in("tournament_team_id", [homeTTId, awayTTId]);

  if (tpError) {
    console.error(
      "[matches] loadSquadsForMatch: tournament_players error",
      tpError
    );
    return null;
  }

  const tournamentPlayers = tpRows ?? [];
  if (tournamentPlayers.length === 0) {
    console.warn(
      "[matches] loadSquadsForMatch: no tournament_players for match",
      matchId
    );
    return null;
  }

  // 3) Collect player_ids and load players table
  const playerIds = Array.from(
    new Set(
      tournamentPlayers
        .map((r: any) => r.player_id as string | undefined)
        .filter(Boolean)
    )
  );

  const { data: playerRows, error: playerError } = await supabase
    .from("players")
    .select(
      `
      id,
      full_name,
      default_position,
      metadata
    `
    )
    .in("id", playerIds);

  if (playerError) {
    console.error(
      "[matches] loadSquadsForMatch: players error",
      playerError
    );
    return null;
  }

  const playersById = new Map<string, any>();
  (playerRows ?? []).forEach((p: any) => {
    if (p.id) playersById.set(p.id as string, p);
  });

  // 4) Split players by home/away tournament_team_id
  const homeRoster: LoadedSquadsForMatch["homeRoster"] = [];
  const awayRoster: LoadedSquadsForMatch["awayRoster"] = [];

  for (const row of tournamentPlayers) {
    const pId = row.player_id as string | undefined;
    if (!pId) continue;
    const base = playersById.get(pId);
    if (!base) continue;

    const shaped = {
      id: pId,
      name: (base.full_name as string) ?? "Unnamed player",
      jerseyNumber:
        row.jersey_number !== null && row.jersey_number !== undefined
          ? Number(row.jersey_number)
          : null,
      position:
        (row.position as string | null) ??
        (base.default_position as string | null) ??
        null,
      teamId: row.tournament_team_id as string | null,
      teamName: null as string | null,
    };

    if (row.tournament_team_id === homeTTId) {
      homeRoster.push(shaped);
    } else if (row.tournament_team_id === awayTTId) {
      awayRoster.push(shaped);
    }
  }

  return {
    homeRoster,
    awayRoster,
  };
}
/**
 * Load recent matches for the Scoring dashboard.
 * - Pulls from `matches`
 * - Hydrates team + tournament names
 * - Returns data shaped for ScoringDashboard
 */
export async function loadRecentMatches(
  limit: number = 5
): Promise<RecentMatchSummary[]> {
  try {
    const { data: matchRows, error: matchError } = await supabase
      .from("matches")
      .select(
        `
        id,
        home_tournament_team_id,
        away_tournament_team_id,
        home_score,
        away_score,
        status,
        tournament_id,
        kickoff_time,
        created_at
      `
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (matchError) {
      console.error(
        "[matches] loadRecentMatches error:",
        JSON.stringify(matchError, null, 2)
      );
      return [];
    }

    const rows = matchRows ?? [];
    if (!rows.length) return [];

    // Collect IDs
    const tournamentTeamIds = new Set<string>();
    const tournamentIds = new Set<string>();

    rows.forEach((r: any) => {
      if (r.home_tournament_team_id)
        tournamentTeamIds.add(r.home_tournament_team_id as string);
      if (r.away_tournament_team_id)
        tournamentTeamIds.add(r.away_tournament_team_id as string);
      if (r.tournament_id) tournamentIds.add(r.tournament_id as string);
    });

    const ttToTeamId = new Map<string, string>();
    const teamNames = new Map<string, string>();
    const tournamentNames = new Map<string, string>();

    // 1) tournament_teams: tt.id -> team_id
    let teamIds = new Set<string>();

    if (tournamentTeamIds.size > 0) {
      const { data: ttRows, error: ttError } = await supabase
        .from("tournament_teams")
        .select("id, team_id")
        .in("id", Array.from(tournamentTeamIds));

      if (ttError) {
        console.error(
          "[matches] loadRecentMatches: tournament_teams error:",
          JSON.stringify(ttError, null, 2)
        );
      } else {
        (ttRows ?? []).forEach((t: any) => {
          if (!t.id || !t.team_id) return;
          ttToTeamId.set(t.id as string, t.team_id as string);
          teamIds.add(t.team_id as string);
        });
      }
    }

    // 2) teams: team_id -> name
    if (teamIds.size > 0) {
      const { data: teamRows, error: teamError } = await supabase
        .from("teams")
        .select("id, name")
        .in("id", Array.from(teamIds));

      if (teamError) {
        console.error(
          "[matches] loadRecentMatches: teams error:",
          JSON.stringify(teamError, null, 2)
        );
      } else {
        (teamRows ?? []).forEach((t: any) => {
          if (!t.id) return;
          const label = t.name || `Team ${String(t.id).slice(0, 4)}`;
          teamNames.set(t.id as string, label);
        });
      }
    }

    // 3) tournaments: id -> name
    if (tournamentIds.size > 0) {
      const { data: tournamentRows, error: tournamentError } = await supabase
        .from("tournaments")
        .select("id, name")
        .in("id", Array.from(tournamentIds));

      if (tournamentError) {
        console.error(
          "[matches] loadRecentMatches: tournaments error:",
          JSON.stringify(tournamentError, null, 2)
        );
      } else {
        (tournamentRows ?? []).forEach((t: any) => {
          if (!t.id) return;
          const label = t.name || `Tournament ${String(t.id).slice(0, 4)}`;
          tournamentNames.set(t.id as string, label);
        });
      }
    }

    const mapTeamNameFromTT = (ttId: string | null): string => {
      if (!ttId) return "Unknown Team";
      const teamId = ttToTeamId.get(ttId);
      if (!teamId) return `Team ${String(ttId).slice(0, 4)}`;
      const teamName = teamNames.get(teamId);
      return teamName ?? `Team ${String(teamId).slice(0, 4)}`;
    };

    const mapTournamentName = (id: string | null): string | null => {
      if (!id) return null;
      const found = tournamentNames.get(id);
      return found ?? `Tournament ${String(id).slice(0, 4)}`;
    };

    return rows.map((r: any) => {
      const rawStatus = (r.status as string | null) ?? null;
      let statusLabel: string | null = null;

      if (rawStatus === "finished") statusLabel = "Final";
      else if (rawStatus === "live") statusLabel = "Live";
      else if (rawStatus === "scheduled") statusLabel = "Scheduled";
      else statusLabel = rawStatus;

      return {
        id: r.id,
        teamA: mapTeamNameFromTT(r.home_tournament_team_id),
        teamB: mapTeamNameFromTT(r.away_tournament_team_id),
        scoreA: typeof r.home_score === "number" ? r.home_score : 0,
        scoreB: typeof r.away_score === "number" ? r.away_score : 0,
        tournamentName: mapTournamentName(r.tournament_id),
        status: statusLabel,
      } as RecentMatchSummary;
    });
  } catch (e) {
    console.error("[matches] loadRecentMatches: unexpected error:", e);
    return [];
  }
}
