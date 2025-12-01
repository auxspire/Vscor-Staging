// src/components/HomeScreen.tsx
import React from "react";
import ScoringDashboard, {
  type RecentMatch,
} from "./ScoringDashboard";

type HomeScreenProps = {
  recentMatches?: RecentMatch[];
  onNewMatch: () => void;
  onAddTournament: () => void;
  onAddTeam: () => void;
  onAddPlayer: () => void;
};

const HomeScreen: React.FC<HomeScreenProps> = ({
  recentMatches,
  onNewMatch,
  onAddTournament,
  onAddTeam,
  onAddPlayer,
}) => {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Top title area */}
        <div className="mb-6">
          <div className="text-sm text-gray-500">VScor</div>
          <div className="text-xs text-gray-500">Match Control</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Scoring
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Live match tools &amp; quick actions
          </p>
        </div>

        {/* The existing tiles + recent matches */}
        <ScoringDashboard
          recentMatches={recentMatches}
          onNewMatch={onNewMatch}
          onAddTournament={onAddTournament}
          onAddTeam={onAddTeam}
          onAddPlayer={onAddPlayer}
        />
      </div>
    </main>
  );
};

export default HomeScreen;
