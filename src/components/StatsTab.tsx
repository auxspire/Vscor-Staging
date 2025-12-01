// src/components/StatsTab.tsx
import React from "react";
import {
  User,
  Users,
  Trophy,
  BarChart3,
  Target,
  GitCompare,
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
  onPlayerComparison,
  onTeamComparison,
}) => {
  // ---------- Map Supabase data -> view models ----------

  const mappedTopPlayers: TopPlayerView[] =
    (topScorers ?? []).slice(0, 3).map((p) => ({
      id: p.playerId,
      name: p.playerName,
      team: p.teamName,
      goals: p.goals,
      assists: p.assists,
    }));

  const mappedTopTeams: TopTeamView[] =
    (standings ?? []).slice(0, 3).map((t) => ({
      id: t.teamId,
      name: t.teamName,
      matches: t.played,
      wins: t.won,
      draws: t.drawn,
      losses: t.lost,
      points: t.points,
      goals: t.goalsFor,
    }));

  const topPlayers = mappedTopPlayers;
  const topTeams = mappedTopTeams;

  const matchesPlayed = stats?.matchesPlayed ?? 0;
  const goalsScored = stats?.goalsScored ?? 0;
  const avgGoalsPerMatch =
    stats?.avgGoalsPerMatch ??
    (matchesPlayed ? goalsScored / matchesPlayed : 0);
  const yellowCards = stats?.yellowCards ?? 0;
  const redCards = stats?.redCards ?? 0;

  const quickStats = [
    {
      label: "Matches Played",
      value: matchesPlayed,
      icon: Trophy,
      accent: "text-purple-600",
      action: onTournamentClick,
    },
    {
      label: "Total Goals",
      value: goalsScored,
      icon: Target,
      accent: "text-green-600",
      action: onTournamentClick,
    },
    {
      label: "Avg Goals / Match",
      value: avgGoalsPerMatch.toFixed(2),
      icon: BarChart3,
      accent: "text-blue-600",
      action: onTournamentClick,
    },
    {
      label: "Cards (Y/R)",
      value: `${yellowCards}/${redCards}`,
      icon: GitCompare,
      accent: "text-amber-600",
      action: onTournamentClick,
    },
  ];

  const hasAnyStats =
    matchesPlayed > 0 ||
    goalsScored > 0 ||
    yellowCards > 0 ||
    redCards > 0 ||
    (topPlayers && topPlayers.length > 0) ||
    (topTeams && topTeams.length > 0);

  // ---------- Render ----------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium mb-1">Stats</h1>
          <p className="text-purple-600 text-sm">
            Tournament performance analytics
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={onPointsTable}
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 bg-purple-100 text-xs font-medium text-purple-700 hover:bg-purple-200"
          >
            <Trophy className="w-3 h-3" />
            View Points Table
          </button>
          <button
            onClick={onLeaderboard}
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 bg-slate-900 text-xs font-medium text-white hover:bg-black"
          >
            <BarChart3 className="w-3 h-3" />
            Full Leaderboard
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <div
            key={index}
            onClick={stat.action}
            className="bg-purple-50 rounded-2xl p-4 cursor-pointer hover:bg-purple-100 transition-colors"
          >
            <div className="flex flex-col items-start space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-white shadow-sm">
                  <stat.icon className={`w-4 h-4 ${stat.accent}`} />
                </div>
                <span className="text-xs text-slate-500">
                  {stat.label}
                </span>
              </div>
              <div className="text-lg font-semibold text-slate-900">
                {stat.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!hasAnyStats && (
        <div className="bg-white rounded-3xl p-4 border border-slate-100 text-sm text-slate-500">
          No stats yet. Once matches and events are recorded for this
          tournament, you’ll see goals, cards, and leaderboards here.
        </div>
      )}

      {/* Top Players & Teams */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Players */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-purple-600" />
              <h2 className="text-sm font-semibold text-slate-900">
                Top Players
              </h2>
            </div>
            {topPlayers.length > 0 && (
              <button
                onClick={onLeaderboard}
                className="text-[11px] text-purple-600 hover:underline"
              >
                View All
              </button>
            )}
          </div>

          {topPlayers.length === 0 ? (
            <p className="text-xs text-slate-500">
              No player stats yet. Record match events to see top scorers
              here.
            </p>
          ) : (
            <div className="space-y-3">
              {topPlayers.map((player, index) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => onPlayerClick(player)}
                  className="w-full flex items-center justify-between py-2 px-2 rounded-2xl hover:bg-purple-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-semibold text-purple-700">
                      {index + 1}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-slate-900">
                        {player.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {player.team}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-600">
                    <p>
                      Goals:{" "}
                      <span className="font-medium">
                        {player.goals}
                      </span>
                    </p>
                    <p>
                      Assists:{" "}
                      <span className="font-medium">
                        {player.assists}
                      </span>
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Top Teams */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-900">
                Top Teams
              </h2>
            </div>
            {topTeams.length > 0 && (
              <button
                onClick={onPointsTable}
                className="text-[11px] text-emerald-600 hover:underline"
              >
                View Table
              </button>
            )}
          </div>

          {topTeams.length === 0 ? (
            <p className="text-xs text-slate-500">
              No team standings yet. Mark fixtures as finished to update
              the table.
            </p>
          ) : (
            <div className="space-y-3">
              {topTeams.map((team, index) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => onTeamClick(team)}
                  className="w-full flex items-center justify-between py-2 px-2 rounded-2xl hover:bg-emerald-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-semibold text-emerald-700">
                      {index + 1}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-slate-900">
                        {team.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {team.matches} matches
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-600">
                    <p>
                      Pts:{" "}
                      <span className="font-semibold">
                        {team.points}
                      </span>
                    </p>
                    <p>
                      W-D-L: {team.wins}-{team.draws}-{team.losses}
                    </p>
                    <p>Goals: {team.goals}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Comparison CTA row – keep for future features */}
      <div className="flex flex-col md:flex-row gap-3">
        <button
          onClick={onPlayerComparison}
          className="flex-1 inline-flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700 hover:bg-slate-50"
        >
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-purple-600" />
            <span>Compare Players</span>
          </div>
          <span className="text-[10px] text-slate-400">
            Coming soon
          </span>
        </button>
        <button
          onClick={onTeamComparison}
          className="flex-1 inline-flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700 hover:bg-slate-50"
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Compare Teams</span>
          </div>
          <span className="text-[10px] text-slate-400">
            Coming soon
          </span>
        </button>
      </div>
    </div>
  );
};

export default StatsTab;
