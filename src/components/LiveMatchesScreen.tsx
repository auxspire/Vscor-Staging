import React, { useState, useEffect } from "react";
import { Search, Filter, Calendar, Clock, Radio, ChevronRight } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import type { TeamClickPayload, TournamentClickPayload } from "../lib/matches";

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
  const [filter, setFilter] = useState<"all" | "live" | "finished">("all");

  const mapMatchRow = (row: any): LiveMatch => {
    const teamA = row.home_team_name ?? row.teamA ?? row.team_a_name ?? row.home_team ?? row.team1 ?? "Team A";
    const teamB = row.away_team_name ?? row.teamB ?? row.team_b_name ?? row.away_team ?? row.team2 ?? "Team B";
    const scoreA = row.scoreA ?? row.score_a ?? row.home_score ?? 0;
    const scoreB = row.scoreB ?? row.score_b ?? row.away_score ?? 0;

    const rawStatus: string = (row.status || "").toLowerCase();
    let status: LiveMatch["status"] = "other";

    if (rawStatus === "live" || row.is_live) status = "live";
    else if (rawStatus === "finished" || rawStatus === "ft" || row.is_finished) status = "finished";
    else if (rawStatus === "upcoming" || rawStatus === "scheduled") status = "upcoming";

    const tournament = row.tournament_name ?? row.tournament ?? row.competition_name ?? "Friendly";
    const venue = row.venue ?? row.stadium ?? "";

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

  const filteredMatches = matches
    .filter((match) => {
      if (filter === "live") return match.status === "live";
      if (filter === "finished") return match.status === "finished";
      return true;
    })
    .filter(
      (match) =>
        match.teamA.toLowerCase().includes(searchQuery.toLowerCase()) ||
        match.teamB.toLowerCase().includes(searchQuery.toLowerCase()) ||
        match.tournament.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const liveCount = matches.filter((m) => m.status === "live").length;

  return (
    <div className="px-4 py-5 space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Radio className="w-4 h-4 text-red-500" />
          <span className="text-xs font-medium text-red-600 uppercase tracking-wide">Live Centre</span>
        </div>
        <p className="text-sm text-slate-500">Real-time scores and match updates</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search teams, tournaments..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <div className="flex gap-2">
        <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
          All Matches
        </FilterButton>
        <FilterButton active={filter === "live"} onClick={() => setFilter("live")} badge={liveCount > 0 ? liveCount : undefined}>
          Live
        </FilterButton>
        <FilterButton active={filter === "finished"} onClick={() => setFilter("finished")}>
          Finished
        </FilterButton>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          {error}
        </div>
      )}

      {loading && matches.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full" />
        </div>
      )}

      {!loading && filteredMatches.length === 0 && (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-400" />
          <p className="text-sm font-medium text-slate-700 mb-1">No matches found</p>
          <p className="text-xs text-slate-500">Try adjusting your search or filters</p>
        </div>
      )}

      <div className="space-y-3">
        {filteredMatches.map((match) => (
          <LiveMatchCard key={match.id} match={match} onClick={() => onMatchClick(match)} />
        ))}
      </div>
    </div>
  );
};

type FilterButtonProps = {
  active: boolean;
  onClick: () => void;
  badge?: number;
  children: React.ReactNode;
};

const FilterButton: React.FC<FilterButtonProps> = ({ active, onClick, badge, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
      active
        ? "bg-purple-600 text-white shadow-sm"
        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
    }`}
  >
    {children}
    {badge !== undefined && (
      <span className={`px-1.5 py-0.5 text-xs rounded-full ${active ? "bg-white/20 text-white" : "bg-red-500 text-white"}`}>
        {badge}
      </span>
    )}
  </button>
);

type LiveMatchCardProps = {
  match: LiveMatch;
  onClick: () => void;
};

const LiveMatchCard: React.FC<LiveMatchCardProps> = ({ match, onClick }) => {
  const isLive = match.status === "live";

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all active:scale-[0.98] hover:border-purple-200 hover:shadow-md"
    >
      {isLive && (
        <div className="bg-gradient-to-r from-red-500 to-rose-500 px-4 py-1.5 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-xs font-semibold text-white uppercase tracking-wide">Live Now</span>
          {match.time && <span className="text-xs text-white/80 ml-auto">{match.time}</span>}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-700">
                {match.teamA.charAt(0)}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-900">{match.teamA}</p>
                <p className="text-xs text-slate-500">Home</p>
              </div>
            </div>
          </div>

          <div className="px-4 py-2 bg-slate-50 rounded-xl text-center min-w-[80px]">
            <p className="text-xl font-bold text-slate-900">
              {match.scoreA} - {match.scoreB}
            </p>
            {!isLive && (
              <p className="text-[10px] uppercase text-slate-500 font-medium">{match.status === "finished" ? "Final" : match.status}</p>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 justify-end">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">{match.teamB}</p>
                <p className="text-xs text-slate-500">Away</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-700">
                {match.teamB.charAt(0)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            {match.tournament && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {match.tournament}
              </span>
            )}
            {match.venue && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {match.venue}
              </span>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>
      </div>
    </button>
  );
};

export default LiveMatchesScreen;
