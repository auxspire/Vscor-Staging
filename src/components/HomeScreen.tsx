import React from "react";
import {
  Plus,
  Trophy,
  Users,
  UserPlus,
  ChevronRight,
  Clock,
} from "lucide-react";

export type RecentMatch = {
  id: string | number;
  teamA: string;
  teamB: string;
  tournamentName?: string | null;
  scoreA: number;
  scoreB: number;
  status?: string;
};

type HomeScreenProps = {
  recentMatches?: RecentMatch[];
  onNewMatch: () => void;
  onAddTournament: () => void;
  onAddTeam: () => void;
  onAddPlayer: () => void;
  onMatchClick?: (match: RecentMatch) => void;
  onViewAllMatches?: () => void;
};

const HomeScreen: React.FC<HomeScreenProps> = ({
  recentMatches = [],
  onNewMatch,
  onAddTournament,
  onAddTeam,
  onAddPlayer,
  onMatchClick,
  onViewAllMatches,
}) => {
  return (
    <div className="px-5 py-6 space-y-8">
      <section>
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Quick Actions</h2>
          <p className="text-sm text-slate-500">Start scoring in seconds</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <QuickActionTile
            icon={Plus}
            title="New Match"
            onClick={onNewMatch}
          />
          <QuickActionTile
            icon={Trophy}
            title="Add Tournament"
            onClick={onAddTournament}
          />
          <QuickActionTile
            icon={Users}
            title="Add Team"
            onClick={onAddTeam}
          />
          <QuickActionTile
            icon={UserPlus}
            title="Add Player"
            onClick={onAddPlayer}
          />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Recent Matches</h2>
            <p className="text-sm text-slate-500">Your latest scored games</p>
          </div>
          {recentMatches.length > 0 && (
            <button 
              onClick={onViewAllMatches}
              className="flex items-center gap-1 text-sm font-semibold text-purple-600 hover:text-purple-700 active:text-purple-800 px-3 py-2 rounded-xl hover:bg-purple-50 transition-colors"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {recentMatches.length === 0 ? (
          <div className="bg-white border border-slate-200 border-dashed rounded-3xl p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-base font-medium text-slate-700 mb-2">No matches yet</p>
            <p className="text-sm text-slate-500">
              Start a{" "}
              <button onClick={onNewMatch} className="text-purple-600 font-semibold underline underline-offset-2">
                new match
              </button>{" "}
              to see results here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                onClick={() => onMatchClick?.(match)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

type QuickActionTileProps = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  variant?: "primary" | "secondary" | "default";
  onClick: () => void;
};

const QuickActionTile: React.FC<QuickActionTileProps> = ({
  icon: Icon,
  title,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className="bg-purple-100 rounded-2xl p-5 aspect-square flex flex-col items-center justify-center gap-3 transition-all active:scale-[0.97] hover:bg-purple-200 hover:shadow-md"
    >
      <div className="w-12 h-12 rounded-full bg-purple-200 flex items-center justify-center text-purple-700">
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-sm font-bold text-purple-900">{title}</span>
    </button>
  );
};

type MatchCardProps = {
  match: RecentMatch;
  onClick?: () => void;
};

const formatMatchStatus = (status: string | undefined): string => {
  if (!status) return "Final";
  const s = status.toLowerCase();
  if (s === "finished" || s === "ft") return "Final";
  if (s === "live") return "Live";
  if (s === "upcoming") return "Upcoming";
  if (s === "scheduled") return "Scheduled";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const MatchCard: React.FC<MatchCardProps> = ({ match, onClick }) => {
  const isLive = match.status?.toLowerCase().includes("live");
  
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3 transition-all active:scale-[0.98] hover:border-purple-200 hover:shadow-lg shadow-sm"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${
        isLive ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700"
      }`}>
        {match.teamA.charAt(0)}
      </div>
      
      <div className="flex-1 text-left min-w-0">
        <p className="text-sm font-bold text-slate-900 truncate">
          {match.teamA} vs {match.teamB}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-slate-500 truncate">
            {match.tournamentName || "Match"}
          </span>
          {isLive && (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 rounded-full animate-pulse flex-shrink-0">
              LIVE
            </span>
          )}
        </div>
      </div>
      
      <div className="flex flex-col items-end flex-shrink-0 min-w-[80px]">
        <p className="text-xl font-bold text-slate-900 whitespace-nowrap">
          {match.scoreA} - {match.scoreB}
        </p>
        <div className="h-4 flex items-center gap-1 text-xs text-slate-400 whitespace-nowrap">
          <Clock className="w-3 h-3 flex-shrink-0" />
          <span className="w-[52px] text-right">{formatMatchStatus(match.status)}</span>
        </div>
      </div>
    </button>
  );
};

export default HomeScreen;
