// src/components/LiveMatchesScreen.tsx
import React, { useState, useEffect } from "react";
import { Search, Filter, Calendar, MapPin } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { supabase } from "../lib/supabaseClient";
import type {
  TeamClickPayload,
  TournamentClickPayload,
} from "../lib/matches";
import { VSSection, VSMatchCard } from "./ui/vscor-ui";

// ---- Types ----

type LiveMatch = {
  id: string | number;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  tournament: string;
  time: string | null;
  status: "live" | "finished" | "upcoming" | "other";
  venue: string;
  spectators: number | null;
  recentEvents: {
    minute: number;
    type: string;
    player: string | null;
    team: string | null;
  }[];
};

type LiveMatchesScreenProps = {
  onBack?: () => void;
  onMatchClick: (match: LiveMatch) => void;
  onPlayerClick?: (player: any) => void;
  onTeamClick?: (team: TeamClickPayload) => void;
  onTournamentClick?: (tournament: TournamentClickPayload) => void;
};

const LiveMatchesScreen: React.FC<LiveMatchesScreenProps> = ({
  onMatchClick,
  onTeamClick,
  onTournamentClick,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Helpers to map DB rows → UI shape ----

  const mapMatchRow = (row: any): LiveMatch => {
    const teamA =
      row.home_team_name ??
      row.teamA ??
      row.team_a_name ??
      row.team_a ??
      row.home_team ??
      row.team1 ??
      "Team A";

    const teamB =
      row.away_team_name ??
      row.teamB ??
      row.team_b_name ??
      row.team_b ??
      row.away_team ??
      row.team2 ??
      "Team B";

    const scoreA = row.scoreA ?? row.score_a ?? row.home_score ?? 0;
    const scoreB = row.scoreB ?? row.score_b ?? row.away_score ?? 0;

    const rawStatus: string = (row.status || "").toLowerCase();
    let status: LiveMatch["status"] = "other";

    if (rawStatus === "live" || row.is_live) status = "live";
    else if (
      rawStatus === "finished" ||
      rawStatus === "ft" ||
      row.is_finished
    )
      status = "finished";
    else if (rawStatus === "upcoming" || rawStatus === "scheduled")
      status = "upcoming";

    const tournament =
      row.tournament_name ??
      row.tournament ??
      row.competition_name ??
      "Tournament";

    const venue = row.venue ?? row.stadium ?? "Venue";

    return {
      id: row.id,
      teamA,
      teamB,
      scoreA,
      scoreB,
      status,
      tournament,
      venue,
      spectators: row.spectators ?? row.attendance ?? null,
      time: row.minute_label ?? row.time_label ?? null,
      recentEvents: [],
    };
  };

  const mapEventRow = (row: any) => {
    let minute = 0;
    if (typeof row.minute === "number") {
      minute = row.minute;
    } else if (typeof row.minute === "string") {
      const parsed = parseInt(row.minute, 10);
      minute = Number.isNaN(parsed) ? 0 : parsed;
    } else if (typeof row.minute_mark === "number") {
      minute = row.minute_mark;
    } else if (typeof row.time === "string") {
      const m = parseInt(row.time.split(":")[0], 10);
      minute = Number.isNaN(m) ? 0 : m;
    }

    const type: string = row.event_type || row.type || "event";
    const player: string | null = row.player_name ?? row.player ?? null;
    const team: string | null =
      row.team_name ?? row.team ?? row.team_side_name ?? null;

    return {
      minute,
      type,
      player,
      team,
    };
  };

  // ---- Load matches + recent events from Supabase ----

  const loadMatches = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: matchRows, error: matchError } = await supabase
        .from("v_matches_with_team_names")
        .select("*")
        .order("created_at", { ascending: false });

      if (matchError) {
        console.error("[LiveMatchesScreen] matches error", matchError);
        setError(matchError.message || "Could not load matches");
        setMatches([]);
        return;
      }

      const mappedMatches: LiveMatch[] = (matchRows ?? []).map(mapMatchRow);

      const matchIds = (matchRows ?? []).map((r: any) => r.id);
      if (matchIds.length > 0) {
        const { data: eventRows, error: eventsError } = await supabase
          .from("match_events")
          .select("*")
          .in("match_id", matchIds)
          .order("minute", { ascending: false });

        if (eventsError) {
          console.warn(
            "[LiveMatchesScreen] match_events error (non-fatal)",
            eventsError
          );
        } else if (eventRows) {
          const eventsByMatchId: Record<
            string | number,
            ReturnType<typeof mapEventRow>[]
          > = {};
          for (const row of eventRows) {
            const ev = mapEventRow(row);
            const key: string | number = row.match_id;
            if (!eventsByMatchId[key]) eventsByMatchId[key] = [];
            eventsByMatchId[key].push(ev);
          }

          for (let i = 0; i < mappedMatches.length; i++) {
            const m = mappedMatches[i];
            const evs = eventsByMatchId[m.id] || [];
            mappedMatches[i] = {
              ...m,
              recentEvents: evs.slice(0, 2),
            };
          }
        }
      }

      setMatches(mappedMatches);
    } catch (e: any) {
      console.error("[LiveMatchesScreen] unexpected error", e);
      setError(e?.message || "Could not load matches");
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);
const visibleMatches = matches.filter((match) => match.status === "live");
const filteredMatches = visibleMatches.filter((match) =>
  match.teamA.toLowerCase().includes(searchQuery.toLowerCase()) ||
  match.teamB.toLowerCase().includes(searchQuery.toLowerCase()) ||
  match.tournament.toLowerCase().includes(searchQuery.toLowerCase())
);
  const handleTeamNameClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    teamName: string
  ) => {
    e.stopPropagation();
    onTeamClick?.({
      id: teamName === "Manchester United" ? 1 : 2,
      name: teamName,
      matches: 28,
      wins: 18,
      goals: 58,
    });
  };

  const handleTournamentNameClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    tournamentName: string
  ) => {
    e.stopPropagation();
    onTournamentClick?.({
      id: 1,
      name: tournamentName,
      teams: 20,
      matches: 380,
    });
  };

  const getStatusTone = (m: LiveMatch) =>
    m.status === "live"
      ? "live"
      : m.status === "upcoming"
      ? "upcoming"
      : "finished";

  const renderMetaLine = (match: LiveMatch) => {
    const bits: string[] = [];
    if (match.venue) bits.push(match.venue);
    if (match.spectators !== null)
      bits.push(`${match.spectators.toLocaleString()} spectators`);
    return bits.join(" • ") || null;
  };

  const renderRecentEvents = (match: LiveMatch) => {
    if (!match.recentEvents.length) return null;
    return (
      <div className="mt-3 pt-3 border-t border-slate-800">
        <p className="text-[11px] text-slate-400 mb-1">Recent events</p>
        <div className="flex gap-2 flex-wrap">
          {match.recentEvents.map((event, index) => (
            <div
              key={index}
              className="text-[11px] bg-slate-900/80 border border-slate-700 rounded-lg px-2 py-1 text-slate-100"
            >
              <span className="font-semibold">{event.minute}&apos;</span>{" "}
              {event.type}
              {event.player ? ` · ${event.player}` : ""}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="pb-2">
      {/* Header */}
      <div className="mb-4 px-1">
        <h1 className="text-xl font-semibold text-slate-50 mb-1">
          Live Matches
        </h1>
        <p className="text-sm text-purple-300">
          Stay updated with real-time scores and key events.
        </p>
      </div>

      {/* Search & Filter */}
      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search teams, tournaments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-full text-sm text-slate-100 placeholder:text-slate-500"
          />
        </div>
        <Button
          variant="outline"
          className="rounded-full px-4 py-1.5 border-slate-700 text-slate-100 bg-transparent hover:bg-slate-900"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filter matches
        </Button>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-900/40 border border-red-700 rounded-lg px-3 py-2 mb-3">
          {error}
        </div>
      )}

      {loading && matches.length === 0 && (
        <div className="text-center text-sm text-slate-400 py-6">
          Loading matches…
        </div>
      )}

      <VSSection
        title="All matches"
        subtitle={
          filteredMatches.length
            ? "Tap a card to open full match events"
            : "No matches found for your search"
        }
      >
        <div className="space-y-3">
          {filteredMatches.map((match) => (
            <div
              key={match.id}
              onClick={() => onMatchClick(match)}
              className="cursor-pointer"
            >
              <VSMatchCard
                teamA={match.teamA}
                teamB={match.teamB}
                scoreA={match.scoreA}
                scoreB={match.scoreB}
                tournamentName={match.tournament}
                statusTone={getStatusTone(match) as any}
                statusLabel={match.time || undefined}
                metaLine={renderMetaLine(match)}
                onClick={() => onMatchClick(match)}
                rightSlot={
                  match.status === "live" ? (
                    <Badge className="bg-red-500 text-white animate-pulse text-[10px]">
                      {match.time || "Live"}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-slate-900/80 border-slate-700 text-slate-200 text-[10px]"
                    >
                      {match.time || "Final"}
                    </Badge>
                  )
                }
              />
              {/* Tournament + Team CTAs below card */}
              <div className="flex items-center justify-between mt-1.5 px-1 text-[11px] text-slate-400">
                <button
                  onClick={(e) =>
                    handleTournamentNameClick(e, match.tournament)
                  }
                  className="hover:text-purple-300 hover:underline flex items-center gap-1"
                >
                  <Calendar className="w-3 h-3" />
                  <span>{match.tournament}</span>
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={(e) => handleTeamNameClick(e, match.teamA)}
                    className="hover:text-purple-300 hover:underline"
                  >
                    {match.teamA}
                  </button>
                  <span className="text-slate-600">vs</span>
                  <button
                    onClick={(e) => handleTeamNameClick(e, match.teamB)}
                    className="hover:text-purple-300 hover:underline"
                  >
                    {match.teamB}
                  </button>
                </div>
              </div>
              {renderRecentEvents(match)}
            </div>
          ))}
        </div>
      </VSSection>

      {!loading && filteredMatches.length === 0 && (
        <div className="text-center py-10">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-500" />
          <h3 className="text-sm font-medium text-slate-200 mb-1">
            No matches found
          </h3>
          <p className="text-xs text-slate-500">
            Try adjusting your search or check back later.
          </p>
        </div>
      )}
    </div>
  );
};

export default LiveMatchesScreen;
