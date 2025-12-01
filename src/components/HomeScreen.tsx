import React from "react";
import {
  Plus,
  Trophy,
  Users,
  UserPlus,
  ChevronRight,
  Clock,
  Zap,
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
    <div className="px-4 py-5 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-purple-500" />
          <span className="text-xs font-medium text-purple-600 uppercase tracking-wide">Quick Actions</span>
        </div>
        <p className="text-sm text-slate-500">Start scoring in seconds</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <QuickActionCard
          icon={Plus}
          title="New Match"
          subtitle="Start scoring now"
          variant="primary"
          onClick={onNewMatch}
        />
        <QuickActionCard
          icon={Trophy}
          title="Add Tournament"
          subtitle="League or cup"
          variant="secondary"
          onClick={onAddTournament}
        />
        <QuickActionCard
          icon={Users}
          title="Add Team"
          subtitle="Register squad"
          onClick={onAddTeam}
        />
        <QuickActionCard
          icon={UserPlus}
          title="Add Player"
          subtitle="Build roster"
          onClick={onAddPlayer}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Recent Matches</h2>
            <p className="text-xs text-slate-500">Your latest scored games</p>
          </div>
          {recentMatches.length > 0 && (
            <button 
              onClick={onViewAllMatches}
              className="flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-700 active:text-purple-800"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {recentMatches.length === 0 ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
              <Plus className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-sm text-slate-600 mb-1">No matches yet</p>
            <p className="text-xs text-slate-400">
              Start a{" "}
              <button onClick={onNewMatch} className="text-purple-600 font-medium underline">
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
      </div>
    </div>
  );
};

type QuickActionCardProps = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  variant?: "primary" | "secondary" | "default";
  onClick: () => void;
};

const QuickActionCard: React.FC<QuickActionCardProps> = ({
  icon: Icon,
  title,
  subtitle,
  variant = "default",
  onClick,
}) => {
  const variants = {
    primary: {
      bg: "bg-gradient-to-br from-purple-500 to-indigo-600",
      iconBg: "bg-white/20",
      iconColor: "text-white",
      titleColor: "text-white",
      subtitleColor: "text-purple-100",
    },
    secondary: {
      bg: "bg-gradient-to-br from-emerald-500 to-teal-600",
      iconBg: "bg-white/20",
      iconColor: "text-white",
      titleColor: "text-white",
      subtitleColor: "text-emerald-100",
    },
    default: {
      bg: "bg-white border border-slate-200",
      iconBg: "bg-slate-100",
      iconColor: "text-slate-700",
      titleColor: "text-slate-900",
      subtitleColor: "text-slate-500",
    },
  };

  const v = variants[variant];

  return (
    <button
      onClick={onClick}
      className={`${v.bg} rounded-2xl p-4 text-left transition-all active:scale-[0.98] shadow-sm hover:shadow-md`}
    >
      <div className={`w-10 h-10 rounded-xl ${v.iconBg} flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${v.iconColor}`} />
      </div>
      <p className={`text-sm font-semibold ${v.titleColor}`}>{title}</p>
      <p className={`text-xs ${v.subtitleColor} mt-0.5`}>{subtitle}</p>
    </button>
  );
};

type MatchCardProps = {
  match: RecentMatch;
  onClick?: () => void;
};

const MatchCard: React.FC<MatchCardProps> = ({ match, onClick }) => {
  const isLive = match.status?.toLowerCase().includes("live");
  
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4 transition-all active:scale-[0.98] hover:border-purple-200 hover:shadow-sm"
    >
      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${
        isLive ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700"
      }`}>
        {match.teamA.charAt(0)}
      </div>
      
      <div className="flex-1 text-left">
        <p className="text-sm font-semibold text-slate-900">
          {match.teamA} vs {match.teamB}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-slate-500">
            {match.tournamentName || "Friendly"}
          </span>
          {isLive && (
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700 rounded-full animate-pulse">
              LIVE
            </span>
          )}
        </div>
      </div>
      
      <div className="text-right">
        <p className="text-lg font-bold text-slate-900">
          {match.scoreA} - {match.scoreB}
        </p>
        <div className="flex items-center gap-1 text-xs text-slate-400 justify-end">
          <Clock className="w-3 h-3" />
          <span>{match.status || "Final"}</span>
        </div>
      </div>
    </button>
  );
};

export default HomeScreen;
