// src/App.tsx
import React, { useState, useEffect } from "react";
import ManageTeamsScreen from "./components/ManageTeamsScreen";
import ManagePlayersScreen from "./components/ManagePlayersScreen";

import ScoringDashboard, {
  type RecentMatch as DashboardRecentMatch,
} from "./components/ScoringDashboard";

import NewMatch, { type MatchDetails } from "./components/NewMatch";
import SelectSquad from "./components/SelectSquad";
import {
  loadRecentMatches,
  createMatchForAdHocGame,
  ensureMatchForFixture,
  loadSquadsForMatch,
  setMatchLive,
  getPlayersPerSideForMatch,
  finalizeMatchInDb,
} from "./lib/matches";

import LiveMatchesScreen from "./components/LiveMatchesScreen";
import ScoringTab from "./components/ScoringTab";
import StatsTab from "./components/StatsTab";

import TournamentListScreen, {
  type TournamentSummary as TournamentListSummary,
} from "./components/TournamentListScreen";
import TournamentProfileContainer from "./components/TournamentProfileContainer";

import LiveScoring from "./components/LiveScoring";
import MatchEventsScreen from "./components/MatchEventsScreen";

import { loadPlayerDatabase } from "./lib/players";
import type {
  TournamentStatsSummary,
  TournamentStandingRow,
} from "./lib/loadTournamentProfile";
import {
  loadStatsSummaryForTournament,
  loadStandingsForTournament,
} from "./lib/loadTournamentStats";

import {
  Signal,
  Wifi,
  Battery,
  User,
  CirclePlay,
  BarChart3,
  Plus,
  Trophy,
} from "lucide-react";

type TabType = "live" | "scoring" | "stats" | "tournaments";
type ViewType =
   | "main"
  | "newMatch"
  | "selectSquad"
  | "liveScoring"
  | "matchEvents"
  | "tournamentProfile"
  | "manageTeams"
  | "managePlayers";

type AppUser = {
  id: string;
  email: string | null;
  fullName?: string | null;
};

type AppProps = {
  currentUser: AppUser | null;
  onLogout: () => void;
};

type AnyMatch = any;

type FinalMatchDataFromScoring = {
  matchId: string | number;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  events: any[];
  finalTime: string;
  duration: number; // seconds from LiveScoring timer
  status: string; // e.g. "Final"
  endTime: Date;
};

const App: React.FC<AppProps> = ({ currentUser, onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabType>("scoring");
  const [currentView, setCurrentView] = useState<ViewType>("main");

  const [recentMatches, setRecentMatches] = useState<DashboardRecentMatch[]>(
    []
  );

  const [matchDraft, setMatchDraft] = useState<MatchDetails | null>(null);
  const [scoringMatchId, setScoringMatchId] = useState<string | null>(null);
  const [scoringInitialSquads, setScoringInitialSquads] = useState<any | null>(
    null
  );

  const [viewMatchForEvents, setViewMatchForEvents] =
    useState<AnyMatch | null>(null);

  const [selectedTournament, setSelectedTournament] =
    useState<TournamentListSummary | null>(null);
  const [statsSummary, setStatsSummary] =
    useState<TournamentStatsSummary | null>(null);
  const [tableStandings, setTableStandings] = useState<
    TournamentStandingRow[]
  >([]);

  const [playerDatabase, setPlayerDatabase] = useState<any[]>([]);

  // ------------------------------------------------------------------
  // Load recent matches
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      const rows = await loadRecentMatches(5);
      const mapped: DashboardRecentMatch[] = rows.map((r: any) => ({
        id: r.id,
        teamA: r.teamA,
        teamB: r.teamB,
        scoreA: r.scoreA,
        scoreB: r.scoreB,
        tournamentName: r.tournamentName ?? undefined,
        status: r.status ?? undefined,
      }));
      setRecentMatches(mapped);
    })();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    (async () => {
      try {
        const players = await loadPlayerDatabase();
        const shaped = players.map((p) => ({
          id: p.id,
          name: p.full_name,
          position: p.default_position ?? null,
          photoUrl: p.photo_url ?? null,
          metadata: p.metadata ?? {},
        }));
        setPlayerDatabase(shaped);
      } catch (err) {
        console.error("[App] Failed to load player database", err);
      }
    })();
  }, [currentUser]);

  // Load stats when stats tab is active + tournament selected
  useEffect(() => {
    if (activeTab !== "stats") return;

    if (!selectedTournament) {
      setStatsSummary(null);
      setTableStandings([]);
      return;
    }

    (async () => {
      try {
        const [summary, standings] = await Promise.all([
          loadStatsSummaryForTournament(selectedTournament.id),
          loadStandingsForTournament(selectedTournament.id),
        ]);
        setStatsSummary(summary);
        setTableStandings(standings);
      } catch (err) {
        console.error("[App] Failed to load stats for tournament", err);
      }
    })();
  }, [activeTab, selectedTournament?.id]);

  const refreshRecentMatches = async () => {
    const rows = await loadRecentMatches(5);
    const mapped: DashboardRecentMatch[] = rows.map((r: any) => ({
      id: r.id,
      teamA: r.teamA,
      teamB: r.teamB,
      scoreA: r.scoreA,
      scoreB: r.scoreB,
      tournamentName: r.tournamentName ?? undefined,
      status: r.status ?? undefined,
    }));
    setRecentMatches(mapped);
  };

  // ------------------------------------------------------------------
  // Adhoc New Match → SelectSquad → LiveScoring
  // ------------------------------------------------------------------
  const handleNewMatchClick = () => setCurrentView("newMatch");

  const handleSelectSquadFromNewMatch = async (details: MatchDetails) => {
    try {
      const { id } = await createMatchForAdHocGame({
        team1: details.team1,
        team2: details.team2,
        playersPerTeam: details.playersPerTeam,
      });

      setMatchDraft({ ...(details as any), id });
      setCurrentView("selectSquad");
    } catch (err) {
      console.error(err);
      alert("Failed to create match");
    }
  };


const handleAddTournamentClick = () => {
  setActiveTab("tournaments");
  setCurrentView("main");
};

// For now we re-use a single “Manage Players” screen if you have one,
// but this is where you can later plug in ManageTeamsScreen / ManagePlayersScreen.
const handleAddTeamClick = () => {
  alert("Teams management screen coming soon.");
};

const handleAddPlayerClick = () => {
  alert("Players management screen coming soon.");
};
  const handleStartMatchFromSquad = async (matchWithSquads: any) => {
    const rawId = matchWithSquads?.id;
    const safeMatchId = rawId ? String(rawId) : null;

    if (!safeMatchId) {
      alert("Match not found");
      setActiveTab("scoring");
      setCurrentView("main");
      return;
    }

    const toPlayer = (p: any) => ({
      id: String(p.id ?? p.name),
      name: p.name,
      number: p.jerseyNumber ?? p.number ?? "",
      position: p.position ?? null,
    });

    setScoringMatchId(safeMatchId);

    setScoringInitialSquads({
      team1Name: matchWithSquads.team1,
      team2Name: matchWithSquads.team2,
      team1Squad: (matchWithSquads.team1Squad ?? []).map(toPlayer),
      team2Squad: (matchWithSquads.team2Squad ?? []).map(toPlayer),
      team1FullRoster:
        (matchWithSquads.team1FullRoster ??
          matchWithSquads.team1Squad ??
          []).map(toPlayer),
      team2FullRoster:
        (matchWithSquads.team2FullRoster ??
          matchWithSquads.team2Squad ??
          []).map(toPlayer),
    });

    try {
      await setMatchLive(safeMatchId);
    } catch (e) {
      console.error("[App] Failed to set match live", e);
    }

    setCurrentView("liveScoring");
  };

  const handleEndMatch = async (finalMatchData?: FinalMatchDataFromScoring) => {
    const matchIdFromDialog = finalMatchData?.matchId;
    const matchId = matchIdFromDialog
      ? String(matchIdFromDialog)
      : scoringMatchId;

    if (!matchId) {
      console.warn("[App] handleEndMatch called without a matchId");
      setActiveTab("scoring");
      setCurrentView("main");
      return;
    }

    const homeScore = finalMatchData?.scoreA ?? 0;
    const awayScore = finalMatchData?.scoreB ?? 0;
    const durationSeconds =
      typeof finalMatchData?.duration === "number"
        ? finalMatchData.duration
        : undefined;

    try {
      await finalizeMatchInDb({
        matchId,
        homeScore,
        awayScore,
        durationSeconds,
      });

      await refreshRecentMatches();
    } catch (e) {
      console.error("[App] Failed to end match via finalizeMatchInDb", e);
      alert("Failed to end match. Please try again.");
    } finally {
      setScoringMatchId(null);
      setScoringInitialSquads(null);
      setActiveTab("scoring");
      setCurrentView("main");
    }
  };

  const handleEditResult = async (
    matchId: string | number,
    homeScore: number,
    awayScore: number
  ) => {
    const safeMatchId = String(matchId);

    try {
      await finalizeMatchInDb({
        matchId: safeMatchId,
        homeScore,
        awayScore,
      });

      await refreshRecentMatches();
    } catch (e) {
      console.error("[App] Failed to edit match result", e);
      alert("Could not update match result. Please try again.");
    }
  };

  // ------------------------------------------------------------------
  // MAIN TAB CONTENT
  // ------------------------------------------------------------------
  const renderMainTab = () => {
    switch (activeTab) {
      case "live":
        return (
          <LiveMatchesScreen
            onMatchClick={(match: AnyMatch) => {
              setViewMatchForEvents(match);
              setCurrentView("matchEvents");
            }}
            onTeamClick={(team: any) =>
              console.log("[VScor] team click", team)
            }
            onTournamentClick={(t: any) =>
              console.log("[VScor] tournament click", t)
            }
          />
        );
case "scoring":
  return (
<ScoringTab
ongoingMatches={[]} // wire later if you track live ones
  completedMatches={recentMatches}
  onNewMatch={handleNewMatchClick}
  onAddTeam={() => {
    // For now route Teams → Stats tab (teams & table live here)
    setActiveTab("stats");
    setCurrentView("main");
  }}
  onAddPlayer={() => {
    // Same: Players → Stats tab / leaderboard
    setActiveTab("stats");
    setCurrentView("main");
  }}
  onAddTournament={() => {
    setActiveTab("tournaments");
    setCurrentView("main");
  }}
  onMatchClick={(match: AnyMatch) => {
    setViewMatchForEvents(match);
    setCurrentView("matchEvents");
  }}
  onEditResult={handleEditResult}

/>
  );
      case "stats":
        return (
          <StatsTab
            stats={statsSummary ?? undefined}
            standings={tableStandings}
            onPlayerClick={(player: any) =>
              console.log("StatsTab player", player)
            }
            onTeamClick={(team: any) => console.log("StatsTab team", team)}
            onTournamentClick={() => {
              setActiveTab("tournaments");
              setCurrentView("main");
            }}
            onLeaderboard={() => console.log("leaderboard")}
            onPointsTable={() => console.log("points")}
            onPlayerComparison={() => console.log("player compare")}
            onTeamComparison={() => console.log("team compare")}
          />
        );

      case "tournaments":
        return (
          <TournamentListScreen
            tournaments={[]}
            onBack={() => {
              setActiveTab("live");
              setCurrentView("main");
            }}
            onTournamentClick={(t) => {
              setSelectedTournament(t);
              setMatchDraft(null);
              setCurrentView("tournamentProfile");
            }}
          />
        );

      default:
        return null;
    }
  };

  // ------------------------------------------------------------------
  // VIEW ROUTER
  // ------------------------------------------------------------------
  const renderCurrentView = () => {
    if (currentView === "main") return renderMainTab();

    if (currentView === "newMatch") {
      return (
        <NewMatch
          onBack={() => {
            setCurrentView("main");
            setActiveTab("scoring");
          }}
          onSelectSquad={handleSelectSquadFromNewMatch}
          registeredTeams={[]}
          onAddTeam={() => alert("Coming soon")}
          playerDatabase={playerDatabase}
        />
      );
    }

    if (currentView === "selectSquad" && matchDraft) {
      return (
        <SelectSquad
          match={{
            ...matchDraft,
            playersPerTeam:
              parseInt(String(matchDraft.playersPerTeam), 10) || 11,
          }}
          onBack={() => setCurrentView("newMatch")}
          onStartMatch={handleStartMatchFromSquad}
          registeredTeams={[]}
          playerDatabase={playerDatabase}
        />
      );
    }

    if (currentView === "liveScoring") {
      if (!scoringMatchId) {
        return (
          <div className="p-6 text-slate-100">
            <p>No match selected.</p>
            <button
              className="mt-3 text-sm text-purple-300 underline"
              onClick={() => {
                setCurrentView("main");
                setActiveTab("scoring");
              }}
            >
              Back
            </button>
          </div>
        );
      }

      return (
        <LiveScoring
          matchId={scoringMatchId}
          initialSquads={scoringInitialSquads ?? undefined}
          onBack={() => {
            setCurrentView("main");
            setActiveTab("scoring");
          }}
          onEndMatch={handleEndMatch}
        />
      );
    }

    if (currentView === "matchEvents") {
      if (!viewMatchForEvents) {
        return (
          <div className="p-6 text-slate-100">
            <p>No match selected.</p>
            <button
              className="mt-3 text-sm text-purple-300 underline"
              onClick={() => {
                setCurrentView("main");
                setActiveTab("live");
              }}
            >
              Back
            </button>
          </div>
        );
      }

      return (
        <MatchEventsScreen
          match={viewMatchForEvents}
          onBack={() => {
            setCurrentView("main");
            setActiveTab("live");
          }}
          onPlayerClick={(p: any) => console.log("event player", p)}
          onTeamClick={(t: any) => console.log("event team", t)}
        />
      );
    }
if (currentView === "manageTeams") {
  return (
    <ManageTeamsScreen
      onBack={() => {
        setCurrentView("main");
        setActiveTab("scoring");
      }}
    />
  );
}

if (currentView === "managePlayers") {
  return (
    <ManagePlayersScreen
      onBack={() => {
        setCurrentView("main");
        setActiveTab("scoring");
      }}
    />
  );
}

    if (currentView === "tournamentProfile") {
      if (!selectedTournament) {
        return (
          <div className="p-6 text-slate-100">
            <p>No tournament selected.</p>
            <button
              className="mt-3 text-sm text-purple-300 underline"
              onClick={() => {
                setCurrentView("main");
                setActiveTab("tournaments");
              }}
            >
              Back
            </button>
          </div>
        );
      }

      return (
        <TournamentProfileContainer
          tournamentId={selectedTournament.id}
          onBack={() => {
            setCurrentView("main");
            setActiveTab("tournaments");
          }}
          onMatchClick={async (fixture) => {
            try {
              const { matchId } = await ensureMatchForFixture({
                fixtureId: fixture.id,
              });

              const [loaded, playersPerSide] = await Promise.all([
                loadSquadsForMatch(matchId),
                getPlayersPerSideForMatch(matchId),
              ]);

              const mapToVscor = (p: any) => ({
                id: p.id,
                name: p.name,
                jerseyNumber: p.jerseyNumber ?? undefined,
                position: p.position ?? undefined,
                teamId: p.teamId ?? undefined,
                teamName: p.teamName ?? undefined,
                synced: true,
              });

              const team1FullRoster = loaded?.homeRoster
                ? loaded.homeRoster.map(mapToVscor)
                : [];
              const team2FullRoster = loaded?.awayRoster
                ? loaded.awayRoster.map(mapToVscor)
                : [];

              const effectivePlayersPerTeam =
                typeof playersPerSide === "number" && playersPerSide > 0
                  ? playersPerSide
                  : 11;

              setMatchDraft({
                team1: fixture.teamA || "",
                team2: fixture.teamB || "",
                matchFormat: "single",
                duration: "90",
                venue: fixture.venue || "",
                playersPerTeam: String(effectivePlayersPerTeam),
                startTime: fixture.kickoffAt
                  ? new Date(fixture.kickoffAt)
                  : new Date(),
                scoreA: 0,
                scoreB: 0,
                events: [],
                team1FullRoster,
                team2FullRoster,
                // @ts-ignore linking
                tournamentId: selectedTournament.id,
                // @ts-ignore
                fixtureId: fixture.id,
                id: matchId,
              } as MatchDetails);

              setCurrentView("selectSquad");
            } catch (err) {
              console.error(
                "[VScor] Failed to open fixture as match",
                err
              );
              alert("Could not open this fixture. Please try again.");
            }
          }}
        />
      );
    }

    return null;
  };

  // ------------------------------------------------------------------
  // SHELL (mobile frame + header + nav)
  // ------------------------------------------------------------------
  const StatusBar = () => (
    <div className="flex justify-between items-center px-4 py-2 bg-white">
      <div className="text-xs font-semibold text-slate-900">9:30</div>
      <div className="w-16 h-6 bg-slate-900 rounded-full flex items-center justify-center">
        <div className="w-1.5 h-1.5 bg-white rounded-full mx-0.5" />
        <div className="w-1.5 h-1.5 bg-white rounded-full mx-0.5" />
        <div className="w-1.5 h-1.5 bg-white rounded-full mx-0.5" />
      </div>
      <div className="flex items-center gap-1 text-slate-900">
        <Signal className="w-4 h-4" />
        <Wifi className="w-4 h-4" />
        <Battery className="w-4 h-4" />
      </div>
    </div>
  );

  const Header = () => (
    <div className="flex justify-between items-center px-4 py-3 bg-white border-b border-slate-100">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-md">
          <CirclePlay className="w-4 h-4 text-white" />
        </div>
        <div className="ml-1">
          <div className="text-[10px] text-slate-400 uppercase tracking-[0.2em]">
            VScor
          </div>
          <div className="text-sm font-semibold text-slate-900">
            Match Centre
          </div>
        </div>
      </div>

      <button
        onClick={onLogout}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-[11px] shadow-xs"
      >
        <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-[11px] font-semibold text-purple-800">
          {currentUser?.fullName?.charAt(0).toUpperCase() ??
            currentUser?.email?.charAt(0).toUpperCase() ??
            "U"}
        </div>
        <span className="text-slate-700">Logout</span>
      </button>
    </div>
  );

  const BottomNavigation = () => (
    <div className="bg-white/95 border-t border-slate-200 px-6 py-3 backdrop-blur-sm">
      <div className="flex justify-around items-center text-[11px]">
        {/* Live */}
        <button
          onClick={() => {
            setActiveTab("live");
            setCurrentView("main");
          }}
          className={`flex flex-col items-center gap-1 ${
            activeTab === "live" ? "text-purple-600" : "text-slate-400"
          }`}
        >
          <CirclePlay className="w-5 h-5" />
          <span>Live</span>
          {activeTab === "live" && (
            <div className="mt-1 w-7 h-1 rounded-full bg-purple-600" />
          )}
        </button>

        {/* Scoring */}
         <button
        onClick={() => {
          setActiveTab("scoring");
          setCurrentView("main");
        }}
        className={`flex flex-col items-center ${
          activeTab === "scoring" ? "text-purple-700" : "text-gray-400"
        }`}
      >
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
            activeTab === "scoring"
              ? "bg-purple-600 shadow-md"
              : "bg-purple-500/90"
          }`}
        >
          <Plus className="w-6 h-6 text-white" />
        </div>
        <span className="mt-1 text-[11px] font-medium">Scoring</span>
        {activeTab === "scoring" && (
          <div className="mt-1 w-8 h-1 rounded-full bg-purple-600" />
        )}
      </button>

        {/* Stats */}
        <button
          onClick={() => {
            setActiveTab("stats");
            setCurrentView("main");
          }}
          className={`flex flex-col items-center gap-1 ${
            activeTab === "stats" ? "text-purple-600" : "text-slate-400"
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span>Stats</span>
          {activeTab === "stats" && (
            <div className="mt-1 w-7 h-1 rounded-full bg-purple-600" />
          )}
        </button>

        {/* Tournaments */}
        <button
          onClick={() => {
            setActiveTab("tournaments");
            setCurrentView("main");
          }}
          className={`flex flex-col items-center gap-1 ${
            activeTab === "tournaments" ? "text-purple-600" : "text-slate-400"
          }`}
        >
          <Trophy className="w-5 h-5" />
          <span>Cups</span>
          {activeTab === "tournaments" && (
            <div className="mt-1 w-9 h-1 rounded-full bg-purple-600" />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050816] via-[#020617] to-black flex justify-center">
      <div className="w-full max-w-md flex flex-col bg-slate-950/95 border-x border-slate-800 min-h-screen shadow-[0_0_80px_rgba(0,0,0,0.8)]">
        <StatusBar />
        <Header />
        <div className="flex-1 overflow-y-auto pb-24 px-3 pt-3">
          {renderCurrentView()}
        </div>
        <BottomNavigation />
      </div>
    </div>
  );
};

export default App;
