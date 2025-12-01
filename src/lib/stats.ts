// lib/stats.ts
import { supabase } from "./supabaseClient";

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

export async function recalculateTournamentAggregates(tournamentId: string) {
  // 1) Load finished matches for this tournament
  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select(
      `
        id,
        tournament_id,
        home_tournament_team_id,
        away_tournament_team_id,
        home_score,
        away_score,
        status
      `
    )
    .eq("tournament_id", tournamentId)
    .in("status", ["finished", "FULL_TIME"]); // adjust to your enum

  if (matchesError || !matches) {
    console.error(
      "[VScor] Cannot load matches for standings",
      matchesError
    );
    return;
  }

  const table = new Map<string, StandingsRow>();

  const ensureRow = (teamId: string): StandingsRow => {
    if (!table.has(teamId)) {
      table.set(teamId, {
        tournament_team_id: teamId,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goals_for: 0,
        goals_against: 0,
        goal_difference: 0,
        points: 0,
      });
    }
    return table.get(teamId)!;
  };

  for (const m of matches) {
    const homeId = String(m.home_tournament_team_id);
    const awayId = String(m.away_tournament_team_id);
    const homeScore = m.home_score ?? 0;
    const awayScore = m.away_score ?? 0;

    const home = ensureRow(homeId);
    const away = ensureRow(awayId);

    home.played += 1;
    away.played += 1;

    home.goals_for += homeScore;
    home.goals_against += awayScore;
    home.goal_difference = home.goals_for - home.goals_against;

    away.goals_for += awayScore;
    away.goals_against += homeScore;
    away.goal_difference = away.goals_for - away.goals_against;

    if (homeScore > awayScore) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (awayScore > homeScore) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  const rows = Array.from(table.values());

  // 2) Clear old standings
  const { error: deleteError } = await supabase
    .from("tournament_standings")
    .delete()
    .eq("tournament_id", tournamentId);

  if (deleteError) {
    console.error("[VScor] Failed to clear old standings", deleteError);
  }

  // 3) Insert fresh standings
  const rowsToInsert = rows.map((r) => ({
    tournament_id: tournamentId,
    tournament_team_id: r.tournament_team_id,
    played: r.played,
    won: r.won,
    drawn: r.drawn,
    lost: r.lost,
    goals_for: r.goals_for,
    goals_against: r.goals_against,
    goal_difference: r.goal_difference,
    points: r.points,
  }));

  const { error: insertError } = await supabase
    .from("tournament_standings")
    .insert(rowsToInsert);

  if (insertError) {
    console.error("[VScor] Failed to insert standings", insertError);
  }
}