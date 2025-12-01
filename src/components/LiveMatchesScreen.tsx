import React, { useState, useEffect } from "react";
import { Search, Calendar, Clock, Radio, ChevronRight, MapPin, Trophy } from "lucide-react";
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

    const tournament = row.tournament_name ?? row.tournament ?? row.competition_name ?? "";
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

  const nonAdHocMatches = matches.filter((match) => {
    const tournamentLower = (match.tournament || "").toLowerCase();
    return !tournamentLower.includes("ad hoc") && !tournamentLower.includes("adhoc");
  });

  const filteredMatches = nonAdHocMatches
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

  const liveCount = nonAdHocMatches.filter((m) => m.status === "live").length;

  return (
    <div className="px-5 py-6 space-y-6">
      <section>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center">
            <Radio className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Live Centre</h2>
            <p className="text-sm text-slate-500">Real-time scores and updates</p>
          </div>
        </div>
      </section>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search teams, tournaments..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-base text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
        />
      </div>

      <div className="flex p-1 bg-slate-100 rounded-2xl">
        <SegmentedTab active={filter === "all"} onClick={() => setFilter("all")}>
          All
        </SegmentedTab>
        <SegmentedTab active={filter === "live"} onClick={() => setFilter("live")} badge={liveCount > 0 ? liveCount : undefined}>
          Live
        </SegmentedTab>
        <SegmentedTab active={filter === "finished"} onClick={() => setFilter("finished")}>
          Finished
        </SegmentedTab>
      </div>

      {error && (
        <div className="flex items-center gap-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-2xl px-5 py-4">
          <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && matches.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full" />
        </div>
      )}

      {!loading && filteredMatches.length === 0 && (
        <div className="bg-white border border-slate-200 border-dashed rounded-3xl p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-base font-medium text-slate-700 mb-2">No matches found</p>
          <p className="text-sm text-slate-500">Try adjusting your search or filters</p>
        </div>
      )}

      <div className="space-y-4">
        {filteredMatches.map((match) => (
          <LiveMatchCard key={match.id} match={match} onClick={() => onMatchClick(match)} />
        ))}
      </div>
    </div>
  );
};

type SegmentedTabProps = {
  active: boolean;
  onClick: () => void;
  badge?: number;
  children: React.ReactNode;
};

const SegmentedTab: React.FC<SegmentedTabProps> = ({ active, onClick, badge, children }) => (
  <button
    role="tab"
    aria-selected={active}
    onClick={onClick}
    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
      active
        ? "bg-white text-purple-600 shadow-sm"
        : "text-slate-500 hover:text-slate-700"
    }`}
  >
    {children}
    {badge !== undefined && badge > 0 && (
      <span className={`w-5 h-5 text-xs font-bold rounded-full flex items-center justify-center ${
        active ? "bg-red-500 text-white" : "bg-red-500 text-white"
      }`}>
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
      className="w-full bg-white rounded-3xl border border-slate-200 overflow-hidden transition-all active:scale-[0.98] hover:border-purple-200 hover:shadow-xl shadow-sm"
    >
      {isLive && (
        <div className="bg-gradient-to-r from-red-500 to-rose-500 px-5 py-2.5 flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
          <span className="text-sm font-bold text-white uppercase tracking-wide">Live Now</span>
          {match.time && <span className="text-sm text-white/80 ml-auto font-medium">{match.time}</span>}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-700 flex-shrink-0">
              {match.teamA.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{match.teamA}</p>
              <p className="text-xs text-slate-400">Home</p>
            </div>
          </div>

          <div className="px-3 py-1.5 bg-slate-50 rounded-lg text-center mx-2 flex-shrink-0">
            <p className="text-lg font-bold text-slate-900 whitespace-nowrap">
              {match.scoreA} - {match.scoreB}
            </p>
            {!isLive && (
              <p className="text-[10px] uppercase text-slate-500 font-medium">{match.status === "finished" ? "Full Time" : match.status}</p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
            <div className="min-w-0 text-right">
              <p className="text-sm font-bold text-slate-900 truncate">{match.teamB}</p>
              <p className="text-xs text-slate-400">Away</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-700 flex-shrink-0">
              {match.teamB.charAt(0)}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
          <div className="flex items-center gap-4 text-sm text-slate-500 flex-1 min-w-0">
            {match.tournament && (
              <span className="flex items-center gap-2 min-w-0">
                <Trophy className="w-4 h-4 flex-shrink-0 text-purple-500" />
                <span className="font-medium truncate">{match.tournament}</span>
              </span>
            )}
            {match.venue && (
              <span className="flex items-center gap-2 min-w-0">
                <MapPin className="w-4 h-4 flex-shrink-0 text-slate-400" />
                <span className="truncate">{match.venue}</span>
              </span>
            )}
            {!match.tournament && !match.venue && (
              <span className="text-slate-400">Tap to view details</span>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0 ml-3" />
        </div>
      </div>
    </button>
  );
};

export default LiveMatchesScreen;
