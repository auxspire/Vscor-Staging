// src/components/MatchSelector.tsx
// @ts-nocheck

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Button } from "./ui/button";
import { RefreshCw, Plus } from "lucide-react";

type MatchSelectorProps = {
  onSelectMatch: (matchMeta: {
    id: string;
    team1: string;
    team2: string;
    playersPerTeam: number;
    raw: any;
  }) => void;
  onCreateNewMatch: () => void;
};

const DEFAULT_PLAYERS_PER_TEAM = 7; // tweak to 11 if you prefer

const statusLabelMap: Record<string, string> = {
  scheduled: "Scheduled",
  live: "Live",
  finished: "Finished",
  abandoned: "Abandoned",
  postponed: "Postponed",
};

const statusColorMap: Record<string, string> = {
  scheduled: "bg-slate-100 text-slate-700",
  live: "bg-green-100 text-green-700",
  finished: "bg-purple-100 text-purple-700",
  abandoned: "bg-red-100 text-red-700",
  postponed: "bg-amber-100 text-amber-700",
};

export const MatchSelector: React.FC<MatchSelectorProps> = ({
  onSelectMatch,
  onCreateNewMatch,
}) => {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadMatches() {
    setLoading(true);
    setError(null);

    const { data: rawMatches, error: matchesError } = await supabase
      .from("matches")
      .select("*")
      .order("created_at", { ascending: false });

    if (matchesError) {
      console.error("[MatchSelector] loadMatches error:", matchesError);
      setError(matchesError.message);
      setLoading(false);
      return;
    }

    const list = rawMatches ?? [];

    const ttIds = new Set<any>();
    for (const m of list) {
      if (m.home_tournament_team_id) ttIds.add(m.home_tournament_team_id);
      if (m.away_tournament_team_id) ttIds.add(m.away_tournament_team_id);
    }

    let teamsByTTId: Record<string, any> = {};

    if (ttIds.size > 0) {
      const { data: ttRows, error: ttError } = await supabase
        .from("tournament_teams")
        .select("id, teams(*)")
        .in("id", Array.from(ttIds));

      if (ttError) {
        console.warn(
          "[MatchSelector] tournament_teams fetch failed, falling back to generic names:",
          ttError
        );
      } else {
        for (const row of ttRows ?? []) {
          teamsByTTId[row.id] = row.teams;
        }
      }
    }

    const mapped = list.map((m: any) => {
      const homeTeam = teamsByTTId[m.home_tournament_team_id] || null;
      const awayTeam = teamsByTTId[m.away_tournament_team_id] || null;

      const team1 = homeTeam?.name || "Home";
      const team2 = awayTeam?.name || "Away";

      const playersPerTeam =
        typeof m.players_per_team === "number" && m.players_per_team > 0
          ? m.players_per_team
          : DEFAULT_PLAYERS_PER_TEAM;

      return {
        id: m.id,
        raw: m,
        team1,
        team2,
        playersPerTeam,
        status: m.status || "scheduled",
        kickoffAt: m.kickoff_at || null,
        venue: m.venue || "",
        scoreHome: m.home_score ?? 0,
        scoreAway: m.away_score ?? 0,
      };
    });

    setMatches(mapped);
    setLoading(false);
  }

  useEffect(() => {
    void loadMatches();
  }, []);

  return (
    <div className="p-6 space-y-4 pb-20">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-50">Matches</h2>
          <p className="text-xs text-slate-400">
            Select a match or create a new one to start scoring.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="outline"
            className="border-slate-600 bg-slate-800 text-slate-100"
            onClick={() => void loadMatches()}
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            className="bg-purple-600 hover:bg-purple-700 text-white"
            onClick={onCreateNewMatch}
            title="New Match"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loading && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-slate-200">
          Loading matches…
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 text-red-100 text-sm">
          <p className="font-medium mb-1">Could not load matches</p>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && matches.length === 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center space-y-3">
          <div className="text-3xl mb-1">⚽</div>
          <p className="text-base font-semibold text-slate-50">
            No matches yet
          </p>
          <p className="text-sm text-slate-300">
            Tap{" "}
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-600/20 text-purple-200 text-xs font-medium">
              <Plus className="w-3 h-3" /> New Match
            </span>{" "}
            to set up your first game.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {matches.map((m) => {
          const statusLabel = statusLabelMap[m.status] || m.status;
          const statusColor =
            statusColorMap[m.status] || "bg-slate-100 text-slate-700";

          const kickoffLabel = m.kickoffAt
            ? new Date(m.kickoffAt).toLocaleString()
            : "Kickoff time TBD";

          return (
            <button
              key={m.id}
              onClick={() =>
                onSelectMatch({
                  id: m.id,
                  team1: m.team1,
                  team2: m.team2,
                  playersPerTeam: m.playersPerTeam,
                  raw: m.raw,
                })
              }
              className="w-full text-left bg-slate-800 border border-slate-700 rounded-2xl p-4 hover:border-purple-400 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-50">
                    {m.team1}
                  </span>
                  <span className="text-xs text-slate-400">vs</span>
                  <span className="font-semibold text-slate-50">
                    {m.team2}
                  </span>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${statusColor}`}
                >
                  {statusLabel}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                <span>{kickoffLabel}</span>
                {m.venue && <span>@ {m.venue}</span>}
              </div>

              <div className="flex items-center justify-between mt-2">
                <div className="text-sm text-slate-300">
                  Squad size: {m.playersPerTeam} / team
                </div>
                <div className="text-sm text-slate-100 font-semibold">
                  {m.scoreHome} - {m.scoreAway}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MatchSelector;
