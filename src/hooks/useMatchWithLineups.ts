// src/hooks/useMatchWithLineups.ts
// @ts-nocheck  // you can remove later once you’re happy

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useMatchWithLineups(matchId: string | null) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [match, setMatch] = useState<any>(null);
  const [homeTeam, setHomeTeam] = useState<any>(null);
  const [awayTeam, setAwayTeam] = useState<any>(null);
  const [homePlayers, setHomePlayers] = useState<any[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<any[]>([]);

  useEffect(() => {
    if (!matchId) return;

    async function load() {
      setLoading(true);
      setError(null);

      // 1️⃣ Match
      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select("*")
        .eq("id", matchId)
        .single();

      if (matchError) {
        setError(matchError.message);
        setLoading(false);
        return;
      }

      setMatch(matchData);

      // 2️⃣ Tournament teams → real team names
      const { data: homeTT } = await supabase
        .from("tournament_teams")
        .select("*, teams(*)")
        .eq("id", matchData.home_tournament_team_id)
        .single();

      const { data: awayTT } = await supabase
        .from("tournament_teams")
        .select("*, teams(*)")
        .eq("id", matchData.away_tournament_team_id)
        .single();

      setHomeTeam(homeTT?.teams ?? null);
      setAwayTeam(awayTT?.teams ?? null);

      // 3️⃣ Lineups → tournament_players → players
      const { data: lineupData, error: lineupError } = await supabase
        .from("match_lineups")
        .select(
          `
          *,
          tournament_players (
            id,
            jersey_number,
            position,
            players (*)
          )
        `
        )
        .eq("match_id", matchId)
        .order("is_starter", { ascending: false })
        .order("tournament_player_id", { ascending: true });

      if (lineupError) {
        setError(lineupError.message);
        setLoading(false);
        return;
      }

      const home: any[] = [];
      const away: any[] = [];

      for (const row of lineupData ?? []) {
        const tp = (row as any).tournament_players;
        const p = tp?.players;
        if (!tp || !p) continue;

        const formatted = {
          id: tp.id, // tournament_players.id (we use this as "player id" in UI)
          playerId: p.id, // players.id (raw player table id)
          name: p.full_name,
          jersey: tp.jersey_number,
          position: tp.position,
          isStarter: row.is_starter,
        };

        if (row.team_role === "home") home.push(formatted);
        else if (row.team_role === "away") away.push(formatted);
      }

      setHomePlayers(home);
      setAwayPlayers(away);
      setLoading(false);
    }

    load();
  }, [matchId]);

  return {
    loading,
    error,
    match,
    homeTeam,
    awayTeam,
    homePlayers,
    awayPlayers,
  };
}
