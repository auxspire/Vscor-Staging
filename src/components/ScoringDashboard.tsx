// src/components/ScoringDashboard.tsx
import React from "react";
import {
  Plus,
  Star,
  Users,
  UserPlus,
  ChevronRight,
  Clock,
  Activity,
} from "lucide-react";

export type RecentMatch = {
  id: string | number;
  teamA: string;
  teamB: string;
  tournamentName?: string | null;
  scoreA: number;
  scoreB: number;
  status?: string; // e.g. "Final", "Live"
};

type ScoringDashboardProps = {
  recentMatches?: RecentMatch[];
  onNewMatch: () => void;
  onAddTournament: () => void;
  onAddTeam: () => void;
  onAddPlayer: () => void;
};

const ScoringDashboard: React.FC<ScoringDashboardProps> = ({
  recentMatches = [],
  onNewMatch,
  onAddTournament,
  onAddTeam,
  onAddPlayer,
}) => {
  const hasRecent = recentMatches.length > 0;

  return (
    <div className="relative bg-white text-slate-900 pb-24 rounded-none">
      {/* Top app bar */}
      <div className="px-6 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-2xl bg-purple-600 text-white flex items-center justify-center text-xs font-semibold shadow-sm">
            VS
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
              VScor
            </span>
            <span className="text-sm font-medium text-slate-900">
              Match Control
            </span>
          </div>
        </div>

        <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-[11px] shadow-xs">
          <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center text-[11px] font-semibold text-purple-800">
            Me
          </div>
          <span className="text-slate-600">Profile</span>
        </button>
      </div>

      {/* Big page title */}
      <div className="px-6 pb-3">
        <h1 className="text-2xl font-semibold tracking-tight">Scoring</h1>
        <p className="text-xs text-purple-600 mt-1 flex items-center gap-1.5">
          <Activity className="w-3 h-3" />
          Live match tools & quick actions
        </p>
      </div>

      {/* Quick Actions */}
      <div className="px-6 pb-4">
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onNewMatch}
            className="rounded-3xl bg-purple-50 hover:bg-purple-100 active:bg-purple-200 transition-colors p-4 flex flex-col items-start justify-between gap-3 shadow-sm border border-purple-100"
          >
            <div className="h-9 w-9 rounded-2xl bg-purple-200 flex items-center justify-center">
              <Plus className="w-4 h-4 text-purple-800" />
            </div>
            <div>
              <p className="text-sm font-semibold text-purple-900">
                New Match
              </p>
              <p className="text-[11px] text-purple-700 mt-0.5">
                Kick off a fresh game
              </p>
            </div>
          </button>

          <button
            onClick={onAddTournament}
            className="rounded-3xl bg-purple-50 hover:bg-purple-100 active:bg-purple-200 transition-colors p-4 flex flex-col items-start justify-between gap-3 shadow-sm border border-purple-100"
          >
            <div className="h-9 w-9 rounded-2xl bg-purple-200 flex items-center justify-center">
              <Star className="w-4 h-4 text-purple-800" />
            </div>
            <div>
              <p className="text-sm font-semibold text-purple-900">
                Add Tournament
              </p>
              <p className="text-[11px] text-purple-700 mt-0.5">
                League / cup setup
              </p>
            </div>
          </button>

          <button
            onClick={onAddTeam}
            className="rounded-3xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 transition-colors p-4 flex flex-col items-start justify-between gap-3 border border-slate-100"
          >
            <div className="h-9 w-9 rounded-2xl bg-slate-200 flex items-center justify-center">
              <Users className="w-4 h-4 text-slate-800" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Add Team</p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Register a new squad
              </p>
            </div>
          </button>

          <button
            onClick={onAddPlayer}
            className="rounded-3xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 transition-colors p-4 flex flex-col items-start justify-between gap-3 border border-slate-100"
          >
            <div className="h-9 w-9 rounded-2xl bg-slate-200 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-slate-800" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Add Player
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Keep your roster ready
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Matches */}
      <div className="px-6 pt-1">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex flex-col">
            <p className="text-[13px] font-semibold text-slate-900">
              Recent Matches
            </p>
            <p className="text-[11px] text-slate-500">
              Finished or latest games you scored
            </p>
          </div>
          <button className="text-[11px] text-purple-600 font-semibold flex items-center gap-1">
            View All
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {!hasRecent && (
          <div className="border border-dashed border-slate-200 rounded-2xl p-4 text-[12px] text-slate-500 bg-slate-50/60">
            No matches recorded yet. Start a{" "}
            <button
              className="underline text-purple-600 font-medium"
              onClick={onNewMatch}
            >
              new match
            </button>{" "}
            and you’ll see completed games here.
          </div>
        )}

        {hasRecent && (
          <div className="space-y-3">
            {recentMatches.map((m) => {
              const isLive =
                (m.status ?? "").toLowerCase() === "live" ||
                (m.status ?? "").toLowerCase() === "live 90’";

              return (
                <div
                  key={m.id}
                  className={`flex items-stretch rounded-2xl overflow-hidden border shadow-xs transition-transform active:scale-[0.98] ${
                    isLive
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-purple-100 bg-purple-50"
                  }`}
                >
                  {/* Left: teams + tournament */}
                  <div className="flex-1 px-4 py-3">
                    <div className="flex items-start gap-2 mb-1.5">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                          isLive
                            ? "bg-emerald-200 text-emerald-900"
                            : "bg-purple-200 text-purple-900"
                        }`}
                      >
                        {m.teamA.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-[13px] font-semibold text-slate-900 leading-snug">
                          {m.teamA}{" "}
                          <span className="text-[11px] text-slate-400">vs</span>{" "}
                          {m.teamB}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {m.tournamentName || "Friendly / Tournament"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <Clock className="w-3 h-3" />
                      <span
                        className={
                          isLive ? "text-emerald-700 font-semibold" : ""
                        }
                      >
                        {m.status || "Final"}
                      </span>
                    </div>
                  </div>

                  {/* Right: score block */}
                  <div
                    className={`w-18 min-w-[68px] flex flex-col items-center justify-center px-3 ${
                      isLive
                        ? "bg-emerald-200/80 text-emerald-900"
                        : "bg-purple-200/80 text-purple-900"
                    }`}
                  >
                    <div className="text-lg font-semibold leading-none">
                      {m.scoreA} - {m.scoreB}
                    </div>
                    <div className="text-[10px] mt-1 opacity-80 uppercase tracking-[0.12em]">
                      {isLive ? "LIVE" : "FINAL"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom nav (visual for now) */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 border-t border-slate-200 px-8 py-3 flex justify-between text-[11px] backdrop-blur-sm">
        <button className="flex flex-col items-center gap-1 text-slate-500">
          <div className="w-7 h-7 rounded-full bg-slate-100" />
          <span>Live</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-purple-700 font-semibold">
          <div className="w-7 h-7 rounded-full bg-purple-600" />
          <span>Scoring</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-500">
          <div className="w-7 h-7 rounded-full bg-slate-100" />
          <span>Stats</span>
        </button>
      </div>
    </div>
  );
};

export default ScoringDashboard;
