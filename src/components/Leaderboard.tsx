// src/components/Leaderboard.tsx
import React, { useState } from "react";
import {
  ArrowLeft,
  Search,
  Medal,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { Input } from "./ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import { Button } from "./ui/button";

export type LeaderboardPlayerRow = {
  id: string | number;
  name: string;
  team?: string | null;
  goals?: number | null;
  assists?: number | null;
  matches?: number | null;
  rating?: number | null;
};

export type LeaderboardTeamRow = {
  id: string | number;
  name: string;
  matches?: number | null;
  wins?: number | null;
  draws?: number | null;
  losses?: number | null;
  points?: number | null;
  gf?: number | null;
  ga?: number | null;
};

type LeaderboardProps = {
  players?: LeaderboardPlayerRow[];
  teams?: LeaderboardTeamRow[];
  onBack: () => void;
  onPlayerClick?: (player: LeaderboardPlayerRow) => void;
  onTeamClick?: (team: LeaderboardTeamRow) => void;
};

const Leaderboard: React.FC<LeaderboardProps> = ({
  players,
  teams,
  onBack,
  onPlayerClick = () => {},
  onTeamClick = () => {},
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"players" | "teams">(
    "players"
  );

  // Fallback demo data (if Supabase hasn't populated yet)
  const fallbackPlayers: LeaderboardPlayerRow[] = [
    {
      id: 1,
      name: "Marcus Rashford",
      team: "Manchester United",
      goals: 18,
      assists: 7,
      matches: 25,
      rating: 8.2,
    },
    {
      id: 2,
      name: "Erling Haaland",
      team: "Manchester City",
      goals: 17,
      assists: 3,
      matches: 23,
      rating: 8.5,
    },
    {
      id: 3,
      name: "Harry Kane",
      team: "Tottenham",
      goals: 16,
      assists: 5,
      matches: 24,
      rating: 8.1,
    },
  ];

  const fallbackTeams: LeaderboardTeamRow[] = [
    {
      id: 1,
      name: "Manchester City",
      matches: 25,
      wins: 20,
      draws: 3,
      losses: 2,
      points: 63,
      gf: 58,
      ga: 26,
    },
    {
      id: 2,
      name: "Arsenal",
      matches: 25,
      wins: 18,
      draws: 4,
      losses: 3,
      points: 58,
      gf: 52,
      ga: 24,
    },
    {
      id: 3,
      name: "Manchester United",
      matches: 25,
      wins: 16,
      draws: 6,
      losses: 3,
      points: 54,
      gf: 48,
      ga: 26,
    },
  ];

  const playerRows =
    players && players.length ? players : fallbackPlayers;
  const teamRows = teams && teams.length ? teams : fallbackTeams;

  const filteredPlayers = playerRows.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.team ?? "").toLowerCase().includes(q)
    );
  });

  const filteredTeams = teamRows.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return t.name.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-slate-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-sm font-semibold text-slate-900">
            Leaderboard
          </h1>
          <p className="text-[11px] text-slate-500">
            Top performers in this tournament
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 max-w-4xl mx-auto w-full p-4 space-y-4">
        {/* Search + Tabs */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search players or teams..."
              className="pl-9 text-xs"
            />
          </div>
        <Tabs
  value={activeTab}
  onValueChange={(v: string) =>
    setActiveTab(v as "players" | "teams")
  }
>
  <TabsList className="grid grid-cols-2 w-full md:w-auto">
    <TabsTrigger value="players">Players</TabsTrigger>
    <TabsTrigger value="teams">Teams</TabsTrigger>
  </TabsList>
</Tabs>
        </div>

        {/* Players Tab */}
        <TabsContent value="players" className="space-y-3">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Medal className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold text-slate-800">
                  Top Players
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Ranked by goals & assists
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredPlayers.map((player, idx) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => onPlayerClick(player)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-xs font-semibold text-amber-700">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {player.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {player.team}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-slate-600">
                    <div className="flex items-center gap-1">
                      <Target className="w-3 h-3 text-emerald-600" />
                      <span>
                        {player.goals ?? 0} G /{" "}
                        {player.assists ?? 0} A
                      </span>
                    </div>
                    {player.matches && (
                      <span>{player.matches} matches</span>
                    )}
                    {typeof player.rating === "number" && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                        {player.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </button>
              ))}
              {filteredPlayers.length === 0 && (
                <div className="px-4 py-6 text-xs text-slate-500">
                  No players match your search.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Teams Tab */}
        <TabsContent value="teams" className="space-y-3">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-semibold text-slate-800">
                  Top Teams
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Sorted by points & performance
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredTeams.map((team, idx) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => onTeamClick(team)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-semibold text-purple-700">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {team.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {team.points ?? 0} pts ·{" "}
                        {team.wins ?? 0}W {team.draws ?? 0}D{" "}
                        {team.losses ?? 0}L
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-slate-600">
                    {typeof team.matches === "number" && (
                      <span>{team.matches} matches</span>
                    )}
                    <span>
                      GF {team.gf ?? 0} / GA {team.ga ?? 0}
                    </span>
                  </div>
                </button>
              ))}
              {filteredTeams.length === 0 && (
                <div className="px-4 py-6 text-xs text-slate-500">
                  No teams match your search.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Footer / CTA (optional) */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="text-xs"
          >
            Back to Stats
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
