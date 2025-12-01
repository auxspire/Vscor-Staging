// src/lib/loadTournamentStats.ts
import { supabase } from "./supabaseClient";
import type {
  TournamentStatsSummary,
  TournamentStandingRow,
} from "./loadTournamentProfile";

// Internal type for tournament_standings rows (as written by stats.ts)
type StandingsRow = {
  tournament_team_id: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
};

/**
 * Compute basic stats for a tournament:
 * - matchesPlayed
 * - goalsScored
 * - avgGoalsPerMatch
 * - yellowCards / redCards
 *
 * Uses `matches` + `match_events` tables.
 */
export async function loadStatsSummaryForTournament(
  tournamentId: string
): Promise<TournamentStatsSummary | null> {
  if (!tournamentId) return null;

  // 1) Finished matches in this tournament
  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("id, home_score, away_score, status")
    .eq("tournament_id", tournamentId);

  if (matchesError || !matches) {
    console.error("[loadStatsSummaryForTournament] matches error", matchesError);
    return null;
  }

  const finished = matches.filter((m: any) => m.status === "finished");
  const matchesPlayed = finished.length;
  const goalsScored = finished.reduce(
    (sum: number, m: any) => sum + (m.home_score ?? 0) + (m.away_score ?? 0),
    0
  );
  const avgGoalsPerMatch =
    matchesPlayed > 0 ? goalsScored / matchesPlayed : 0;

  // 2) Card counts from match_events (for *all* matches of this tournament)
  const allMatchIds = matches.map((m: any) => m.id);
if (allMatchIds.length === 0) {
  return {
    matchesPlayed,
    goalsScored,
    avgGoalsPerMatch,
    yellowCards: 0,
    redCards: 0,
    cleanSheets: 0,
  };
}
  const { data: yellowEvents, error: yellowError } = await supabase
    .from("match_events")
    .select("id, match_id")
    .in("match_id", allMatchIds)
    .eq("event_type", "yellow_card");

  if (yellowError) {
    console.error(
      "[loadStatsSummaryForTournament] yellow cards error",
      yellowError
    );
  }

  const { data: redEvents, error: redError } = await supabase
    .from("match_events")
    .select("id, match_id")
    .in("match_id", allMatchIds)
    .eq("event_type", "red_card");

  if (redError) {
    console.error(
      "[loadStatsSummaryForTournament] red cards error",
      redError
    );
  }

  const yellowCards = yellowEvents ? yellowEvents.length : 0;
  const redCards = redEvents ? redEvents.length : 0;
const cleanSheets = finished.reduce((sum: number, m: any) => {
  const homeConceded = m.away_score ?? 0;
  const awayConceded = m.home_score ?? 0;
  if (homeConceded === 0 && m.home_score != null) sum += 1;
  if (awayConceded === 0 && m.away_score != null) sum += 1;
  return sum;
}, 0);
const summary: TournamentStatsSummary = {
  matchesPlayed,
  goalsScored,
  avgGoalsPerMatch,
  yellowCards,
  redCards,
  cleanSheets,
};

  return summary;
}

/**
 * Load league table for a tournament using:
 * - tournament_standings (written by stats.ts)
 * - tournament_teams
 * - teams
 *
 * Returns TournamentStandingRow[] that StatsTab expects.
 */
export async function loadStandingsForTournament(
  tournamentId: string
): Promise<TournamentStandingRow[]> {
  if (!tournamentId) return [];

  // 1) Tournament teams (bridge tournament -> team)
  const { data: tournamentTeams, error: ttError } = await supabase
    .from("tournament_teams")
    .select("id, team_id")
    .eq("tournament_id", tournamentId);

  if (ttError || !tournamentTeams || tournamentTeams.length === 0) {
    if (ttError) {
      console.error("[loadStandingsForTournament] tournament_teams error", ttError);
    }
    return [];
  }

  const tournamentTeamIds = tournamentTeams.map((tt: any) => tt.id as string);
  const teamIds = tournamentTeams.map((tt: any) => tt.team_id as string);

  // 2) Standings rows for those tournament_team_ids
  const { data: standingsRows, error: standingsError } = await supabase
    .from("tournament_standings")
    .select(
      "tournament_team_id, played, won, drawn, lost, goals_for, goals_against, goal_difference, points"
    )
    .in("tournament_team_id", tournamentTeamIds);

  if (standingsError || !standingsRows) {
    if (standingsError) {
      console.error(
        "[loadStandingsForTournament] standings error",
        standingsError
      );
    }
    return [];
  }

  // 3) Team names
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, name")
    .in("id", teamIds);

  if (teamsError || !teams) {
    if (teamsError) {
      console.error("[loadStandingsForTournament] teams error", teamsError);
    }
    return [];
  }

  const teamById = new Map<string, { id: string; name: string }>();
  for (const t of teams) {
    teamById.set(t.id as string, { id: t.id as string, name: t.name as string });
  }

  const ttById = new Map<string, string>(); // tournament_team_id -> team_id
  for (const tt of tournamentTeams) {
    ttById.set(tt.id as string, tt.team_id as string);
  }

  const rows = (standingsRows as StandingsRow[])
    .map((s) => {
      const teamId = ttById.get(s.tournament_team_id);
      const team = teamId ? teamById.get(teamId) : undefined;

      return {
        teamId: team?.id ?? s.tournament_team_id,
        teamName: team?.name ?? "Unknown Team",
        played: s.played,
        won: s.won,
        drawn: s.drawn,
        lost: s.lost,
        goalsFor: s.goals_for,
        goalsAgainst: s.goals_against,
        goalDifference: s.goal_difference,
        points: s.points,
      };
    })
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) {
        return b.goalDifference - a.goalDifference;
      }
      return (b.goalsFor ?? 0) - (a.goalsFor ?? 0);
    });

  const finalRows: TournamentStandingRow[] = rows.map((row, index) => ({
    ...row,
    position: index + 1,
    goalDiff: row.goalDifference,
  }));

  return finalRows;

}
