// src/lib/fixtures.ts

import { supabase } from "./supabaseClient";
import type { Fixture } from "../components/TournamentProfileScreen";
/**
 * Link an existing match row to an existing tournament fixture.
 *
 * Assumes you have a `tournament_fixtures` table with:
 *  - id
 *  - match_id (nullable, FK → matches.id)
 *
 * This does NOT create the match itself – it just writes match_id.
 */
export async function getFixturesForTournament(
  tournamentId: string
): Promise<Fixture[]> {
  const { data, error } = await supabase
    .from("tournament_fixtures") // ⬅️ if you use a view, put that name here
    .select(
      `
        id,
        match_id,
        matchday,
        kickoff_at,
        home_team_name,
        away_team_name,
        venue,
        status,
        home_score,
        away_score
      `
    )
    .eq("tournament_id", tournamentId)
    .order("kickoff_at", { ascending: true });

  if (error) {
    console.error("[getFixturesForTournament] error", error);
    throw error;
  }

  return (data ?? []).map((fx: any) => {
    let date: string | null = null;
    let time: string | null = null;

    if (fx.kickoff_at) {
      const d = new Date(fx.kickoff_at);
      if (!isNaN(d.getTime())) {
        date = d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        });
        time = d.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      }
    }

    const fixture: Fixture = {
      id: fx.id,
      matchId: fx.match_id ?? null,
      matchday: fx.matchday ?? null,
      date,
      time,
      teamA: fx.home_team_name,
      teamB: fx.away_team_name,
      venue: fx.venue ?? null,
      competition: null,
      status: fx.status ?? null,
      homeScore: fx.home_score ?? null,
      awayScore: fx.away_score ?? null,
    };

    return fixture;
  });
}
export async function linkMatchToFixture(options: {
  fixtureId: string | number;
  matchId: string | number;
}): Promise<void> {
  const { fixtureId, matchId } = options;

  if (!fixtureId || !matchId) {
    console.warn("[fixtures] linkMatchToFixture called without both IDs", {
      fixtureId,
      matchId,
    });
    return;
  }

  const { error } = await supabase
    .from("tournament_fixtures")
    .update({ match_id: matchId })
    .eq("id", fixtureId);

  if (error) {
    console.error("[fixtures] linkMatchToFixture error:", error);
    throw new Error(error.message);
  }

  console.log(
    "[fixtures] Linked match to fixture:",
    `fixture_id=${fixtureId}`,
    `match_id=${matchId}`
  );
}
