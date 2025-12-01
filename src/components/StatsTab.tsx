import React from "react";
import {
  User,
  Users,
  Trophy,
  BarChart3,
  Target,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import type {
  TournamentStatsSummary,
  TournamentTopScorerRow,
  TournamentStandingRow,
} from "../lib/loadTournamentProfile";

type TopPlayerView = {
  id: string;
  name: string;
  team: string;
  goals: number;
  assists: number;
};

type TopTeamView = {
  id: string;
  name: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  goals: number;
};

type StatsTabProps = {
  stats?: TournamentStatsSummary | null;
  topScorers?: TournamentTopScorerRow[];
  standings?: TournamentStandingRow[];
  onPlayerClick: (player: TopPlayerView) => void;
  onTeamClick: (team: TopTeamView) => void;
  onTournamentClick: () => void;
  onLeaderboard: () => void;
  onPointsTable: () => void;
  onPlayerComparison: () => void;
  onTeamComparison: () => void;
};

const StatsTab: React.FC<StatsTabProps> = ({
  stats,
  topScorers,
  standings,
  onPlayerClick,
  onTeamClick,
  onTournamentClick,
  onLeaderboard,
  onPointsTable,
}) => {
  const mappedTopPlayers: TopPlayerView[] = (topScorers ?? []).slice(0, 5).map((p) => ({
    id: p.playerId,
    name: p.playerName,
    team: p.teamName,
    goals: p.goals,
    assists: p.assists,
  }));

  const mappedTopTeams: TopTeamView[] = (standings ?? []).slice(0, 5).map((t) => ({
    id: t.teamId,
    name: t.teamName,
    matches: t.played,
    wins: t.won,
    draws: t.drawn,
    losses: t.lost,
    points: t.points,
    goals: t.goalsFor,
  }));

  const matchesPlayed = stats?.matchesPlayed ?? 0;
  const goalsScored = stats?.goalsScored ?? 0;
  const avgGoalsPerMatch = stats?.avgGoalsPerMatch ?? (matchesPlayed ? goalsScored / matchesPlayed : 0);
  const yellowCards = stats?.yellowCards ?? 0;
  const redCards = stats?.redCards ?? 0;

  const hasAnyStats =
    matchesPlayed > 0 ||
    goalsScored > 0 ||
    mappedTopPlayers.length > 0 ||
    mappedTopTeams.length > 0;

  return (
    <div className="px-4 py-5 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-4 h-4 text-purple-500" />
          <span className="text-xs font-medium text-purple-600 uppercase tracking-wide">Statistics</span>
        </div>
        <p className="text-sm text-slate-500">Tournament performance analytics</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Trophy} label="Matches" value={matchesPlayed} color="purple" onClick={onTournamentClick} />
        <StatCard icon={Target} label="Goals" value={goalsScored} color="green" onClick={onTournamentClick} />
        <StatCard icon={TrendingUp} label="Avg/Match" value={avgGoalsPerMatch.toFixed(1)} color="blue" onClick={onTournamentClick} />
        <StatCard
          icon={BarChart3}
          label="Cards"
          value={`${yellowCards}Y / ${redCards}R`}
          color="amber"
          onClick={onTournamentClick}
        />
      </div>

      {!hasAnyStats && (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 text-slate-400" />
          <p className="text-sm font-medium text-slate-700 mb-1">No stats yet</p>
          <p className="text-xs text-slate-500">
            Record match events to see goals, cards, and leaderboards here
          </p>
        </div>
      )}

      {mappedTopPlayers.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-purple-600" />
              <h2 className="text-sm font-semibold text-slate-900">Top Scorers</h2>
            </div>
            <button onClick={onLeaderboard} className="flex items-center gap-1 text-xs text-purple-600 font-medium">
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {mappedTopPlayers.map((player, index) => (
              <button
                key={player.id}
                onClick={() => onPlayerClick(player)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm font-bold text-purple-700">
                  {index + 1}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-slate-900">{player.name}</p>
                  <p className="text-xs text-slate-500">{player.team}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{player.goals}</p>
                  <p className="text-xs text-slate-500">goals</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {mappedTopTeams.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-900">Team Standings</h2>
            </div>
            <button onClick={onPointsTable} className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              Full Table <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {mappedTopTeams.map((team, index) => (
              <button
                key={team.id}
                onClick={() => onTeamClick(team)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-700">
                  {index + 1}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-slate-900">{team.name}</p>
                  <p className="text-xs text-slate-500">
                    {team.wins}W · {team.draws}D · {team.losses}L
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{team.points}</p>
                  <p className="text-xs text-slate-500">pts</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onLeaderboard}
          className="flex items-center justify-center gap-2 bg-purple-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-purple-700 active:scale-[0.98] transition-all"
        >
          <BarChart3 className="w-4 h-4" />
          Leaderboard
        </button>
        <button
          onClick={onPointsTable}
          className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 rounded-xl py-3 text-sm font-medium hover:bg-slate-50 active:scale-[0.98] transition-all"
        >
          <Trophy className="w-4 h-4" />
          Points Table
        </button>
      </div>
    </div>
  );
};

type StatCardProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: "purple" | "green" | "blue" | "amber";
  onClick?: () => void;
};

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, color, onClick }) => {
  const colors = {
    purple: { bg: "bg-purple-50", icon: "bg-purple-100 text-purple-600", accent: "text-purple-600" },
    green: { bg: "bg-emerald-50", icon: "bg-emerald-100 text-emerald-600", accent: "text-emerald-600" },
    blue: { bg: "bg-blue-50", icon: "bg-blue-100 text-blue-600", accent: "text-blue-600" },
    amber: { bg: "bg-amber-50", icon: "bg-amber-100 text-amber-600", accent: "text-amber-600" },
  };

  const c = colors[color];

  return (
    <button
      onClick={onClick}
      className={`${c.bg} rounded-2xl p-4 text-left transition-all hover:shadow-md active:scale-[0.98]`}
    >
      <div className={`w-10 h-10 rounded-xl ${c.icon} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className={`text-xs font-medium ${c.accent}`}>{label}</p>
    </button>
  );
};

export default StatsTab;
