import React, { useState, useEffect } from "react";
import MobileShell from "./components/layout/MobileShell";
import HomeScreen, { type RecentMatch } from "./components/HomeScreen";
import LiveMatchesScreen from "./components/LiveMatchesScreen";
import StatsTab from "./components/StatsTab";
import NewMatch, { type MatchDetails } from "./components/NewMatch";
import SelectSquad from "./components/SelectSquad";
import LiveScoring from "./components/LiveScoring";
import MatchEventsScreen from "./components/MatchEventsScreen";
import TournamentListScreen, { type TournamentSummary } from "./components/TournamentListScreen";
import TournamentProfileContainer from "./components/TournamentProfileContainer";
import ManageTeamsScreen from "./components/ManageTeamsScreen";
import ManagePlayersScreen from "./components/ManagePlayersScreen";

import {
  loadRecentMatches,
  createMatchForAdHocGame,
  ensureMatchForFixture,
  loadSquadsForMatch,
  setMatchLive,
  getPlayersPerSideForMatch,
  finalizeMatchInDb,
} from "./lib/matches";
import { loadPlayerDatabase } from "./lib/players";
import type { TournamentStatsSummary, TournamentStandingRow } from "./lib/loadTournamentProfile";
import { loadStatsSummaryForTournament, loadStandingsForTournament } from "./lib/loadTournamentStats";

type TabType = "live" | "scoring" | "stats" | "tournaments";

type ScreenType =
  | "main"
  | "newMatch"
  | "selectSquad"
  | "liveScoring"
  | "matchEvents"
  | "tournamentList"
  | "tournamentProfile"
  | "manageTeams"
  | "managePlayers"
  | "allMatches";

type AppUser = {
  id: string;
  email: string | null;
  fullName?: string | null;
};

type AppProps = {
  currentUser: AppUser | null;
  onLogout: () => void;
};

type FinalMatchData = {
  matchId: string | number;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  events: any[];
  finalTime: string;
  duration: number;
  status: string;
  endTime: Date;
};

const App: React.FC<AppProps> = ({ currentUser, onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabType>("scoring");
  const [currentScreen, setCurrentScreen] = useState<ScreenType>("main");
  const [screenHistory, setScreenHistory] = useState<ScreenType[]>([]);

  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);
  const [matchDraft, setMatchDraft] = useState<MatchDetails | null>(null);
  const [scoringMatchId, setScoringMatchId] = useState<string | null>(null);
  const [scoringInitialSquads, setScoringInitialSquads] = useState<any>(null);
  const [viewMatchForEvents, setViewMatchForEvents] = useState<any>(null);
  const [selectedTournament, setSelectedTournament] = useState<TournamentSummary | null>(null);
  const [statsSummary, setStatsSummary] = useState<TournamentStatsSummary | null>(null);
  const [tableStandings, setTableStandings] = useState<TournamentStandingRow[]>([]);
  const [playerDatabase, setPlayerDatabase] = useState<any[]>([]);

  const navigateTo = (screen: ScreenType) => {
    if (screen !== currentScreen) {
      setScreenHistory((prev) => [...prev, currentScreen]);
      setCurrentScreen(screen);
    }
  };

  const goBack = () => {
    if (screenHistory.length > 0) {
      const prev = screenHistory[screenHistory.length - 1];
      setScreenHistory((h) => h.slice(0, -1));
      setCurrentScreen(prev);
    } else {
      setCurrentScreen("main");
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setCurrentScreen("main");
    setScreenHistory([]);
  };

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      const rows = await loadRecentMatches(10);
      const mapped: RecentMatch[] = rows.map((r: any) => ({
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

  useEffect(() => {
    if (activeTab !== "stats" || !selectedTournament) {
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
        console.error("[App] Failed to load stats", err);
      }
    })();
  }, [activeTab, selectedTournament?.id]);

  const refreshRecentMatches = async () => {
    const rows = await loadRecentMatches(10);
    const mapped: RecentMatch[] = rows.map((r: any) => ({
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

  const handleNewMatchClick = () => navigateTo("newMatch");

  const handleSelectSquadFromNewMatch = async (details: MatchDetails) => {
    try {
      const { id } = await createMatchForAdHocGame({
        team1: details.team1,
        team2: details.team2,
        playersPerTeam: details.playersPerTeam,
      });
      setMatchDraft({ ...(details as any), id });
      navigateTo("selectSquad");
    } catch (err) {
      console.error(err);
      alert("Failed to create match");
    }
  };

  const handleStartMatchFromSquad = async (matchWithSquads: any) => {
    const rawId = matchWithSquads?.id;
    const safeMatchId = rawId ? String(rawId) : null;

    if (!safeMatchId) {
      alert("Match not found");
      handleTabChange("scoring");
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
      team1FullRoster: (matchWithSquads.team1FullRoster ?? matchWithSquads.team1Squad ?? []).map(toPlayer),
      team2FullRoster: (matchWithSquads.team2FullRoster ?? matchWithSquads.team2Squad ?? []).map(toPlayer),
    });

    try {
      await setMatchLive(safeMatchId);
    } catch (e) {
      console.error("[App] Failed to set match live", e);
    }

    setScreenHistory([]);
    setCurrentScreen("liveScoring");
  };

  const handleEndMatch = async (finalMatchData?: FinalMatchData) => {
    const matchId = finalMatchData?.matchId ? String(finalMatchData.matchId) : scoringMatchId;

    if (!matchId) {
      console.warn("[App] handleEndMatch called without matchId");
      handleTabChange("scoring");
      return;
    }

    const homeScore = finalMatchData?.scoreA ?? 0;
    const awayScore = finalMatchData?.scoreB ?? 0;
    const durationSeconds = typeof finalMatchData?.duration === "number" ? finalMatchData.duration : undefined;

    try {
      await finalizeMatchInDb({ matchId, homeScore, awayScore, durationSeconds });
      await refreshRecentMatches();
    } catch (e) {
      console.error("[App] Failed to end match", e);
      alert("Failed to end match. Please try again.");
    } finally {
      setScoringMatchId(null);
      setScoringInitialSquads(null);
      handleTabChange("scoring");
    }
  };

  const handleAddTournament = () => navigateTo("tournamentList");
  const handleAddTeam = () => navigateTo("manageTeams");
  const handleAddPlayer = () => navigateTo("managePlayers");

  const handleTournamentSelect = (t: TournamentSummary) => {
    setSelectedTournament(t);
    setMatchDraft(null);
    navigateTo("tournamentProfile");
  };

  const handleMatchClick = (match: any) => {
    setViewMatchForEvents(match);
    navigateTo("matchEvents");
  };

  const getHeaderTitle = () => {
    switch (currentScreen) {
      case "newMatch": return "New Match";
      case "selectSquad": return "Select Squad";
      case "liveScoring": return "Live Scoring";
      case "matchEvents": return "Match Events";
      case "tournamentList": return "Tournaments";
      case "tournamentProfile": return selectedTournament?.name || "Tournament";
      case "manageTeams": return "Teams";
      case "managePlayers": return "Players";
      case "allMatches": return "All Matches";
      default: return undefined;
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case "main":
        if (activeTab === "live") {
          return (
            <LiveMatchesScreen
              onMatchClick={handleMatchClick}
              onTeamClick={(team) => console.log("[VScor] team click", team)}
              onTournamentClick={(t) => console.log("[VScor] tournament click", t)}
            />
          );
        }
        if (activeTab === "stats") {
          return (
            <StatsTab
              stats={statsSummary ?? undefined}
              standings={tableStandings}
              onPlayerClick={(player) => console.log("StatsTab player", player)}
              onTeamClick={(team) => console.log("StatsTab team", team)}
              onTournamentClick={() => navigateTo("tournamentList")}
              onLeaderboard={() => console.log("leaderboard")}
              onPointsTable={() => console.log("points")}
              onPlayerComparison={() => console.log("player compare")}
              onTeamComparison={() => console.log("team compare")}
            />
          );
        }
        if (activeTab === "tournaments") {
          return (
            <TournamentListScreen
              tournaments={[]}
              onBack={() => handleTabChange("scoring")}
              onTournamentClick={handleTournamentSelect}
            />
          );
        }
        return (
          <HomeScreen
            recentMatches={recentMatches}
            onNewMatch={handleNewMatchClick}
            onAddTournament={handleAddTournament}
            onAddTeam={handleAddTeam}
            onAddPlayer={handleAddPlayer}
            onMatchClick={handleMatchClick}
            onViewAllMatches={() => navigateTo("allMatches")}
          />
        );

      case "newMatch":
        return (
          <NewMatch
            onBack={goBack}
            onSelectSquad={handleSelectSquadFromNewMatch}
            registeredTeams={[]}
            onAddTeam={() => alert("Coming soon")}
            playerDatabase={playerDatabase}
          />
        );

      case "selectSquad":
        if (!matchDraft) {
          return (
            <div className="p-6 text-center">
              <p className="text-slate-600">No match selected.</p>
              <button onClick={goBack} className="mt-3 text-purple-600 underline">
                Go Back
              </button>
            </div>
          );
        }
        return (
          <SelectSquad
            match={{
              ...matchDraft,
              playersPerTeam: parseInt(String(matchDraft.playersPerTeam), 10) || 11,
            }}
            onBack={goBack}
            onStartMatch={handleStartMatchFromSquad}
            registeredTeams={[]}
            playerDatabase={playerDatabase}
          />
        );

      case "liveScoring":
        if (!scoringMatchId) {
          return (
            <div className="p-6 text-center">
              <p className="text-slate-600">No match selected.</p>
              <button onClick={() => handleTabChange("scoring")} className="mt-3 text-purple-600 underline">
                Go Home
              </button>
            </div>
          );
        }
        return (
          <LiveScoring
            matchId={scoringMatchId}
            initialSquads={scoringInitialSquads ?? undefined}
            onBack={() => handleTabChange("scoring")}
            onEndMatch={handleEndMatch}
          />
        );

      case "matchEvents":
        if (!viewMatchForEvents) {
          return (
            <div className="p-6 text-center">
              <p className="text-slate-600">No match selected.</p>
              <button onClick={goBack} className="mt-3 text-purple-600 underline">
                Go Back
              </button>
            </div>
          );
        }
        return (
          <MatchEventsScreen
            match={viewMatchForEvents}
            onBack={goBack}
            onPlayerClick={(p) => console.log("event player", p)}
            onTeamClick={(t) => console.log("event team", t)}
          />
        );

      case "tournamentList":
        return (
          <TournamentListScreen
            tournaments={[]}
            onBack={goBack}
            onTournamentClick={handleTournamentSelect}
          />
        );

      case "tournamentProfile":
        if (!selectedTournament) {
          return (
            <div className="p-6 text-center">
              <p className="text-slate-600">No tournament selected.</p>
              <button onClick={goBack} className="mt-3 text-purple-600 underline">
                Go Back
              </button>
            </div>
          );
        }
        return (
          <TournamentProfileContainer
            tournamentId={selectedTournament.id}
            onBack={goBack}
            onMatchClick={async (fixture) => {
              try {
                const { matchId } = await ensureMatchForFixture({ fixtureId: fixture.id });
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

                const team1FullRoster = loaded?.homeRoster ? loaded.homeRoster.map(mapToVscor) : [];
                const team2FullRoster = loaded?.awayRoster ? loaded.awayRoster.map(mapToVscor) : [];
                const effectivePlayersPerTeam = typeof playersPerSide === "number" && playersPerSide > 0 ? playersPerSide : 11;

                setMatchDraft({
                  team1: fixture.teamA || "",
                  team2: fixture.teamB || "",
                  matchFormat: "single",
                  duration: "90",
                  venue: fixture.venue || "",
                  playersPerTeam: String(effectivePlayersPerTeam),
                  startTime: fixture.kickoffAt ? new Date(fixture.kickoffAt) : new Date(),
                  scoreA: 0,
                  scoreB: 0,
                  events: [],
                  team1FullRoster,
                  team2FullRoster,
                  id: matchId,
                } as MatchDetails);

                navigateTo("selectSquad");
              } catch (err) {
                console.error("[VScor] Failed to open fixture", err);
                alert("Could not open this fixture. Please try again.");
              }
            }}
          />
        );

      case "manageTeams":
        return <ManageTeamsScreen onBack={goBack} />;

      case "managePlayers":
        return <ManagePlayersScreen onBack={goBack} />;

      case "allMatches":
        return (
          <div className="p-4">
            <p className="text-slate-600 mb-4">All matches view coming soon</p>
            <button onClick={goBack} className="text-purple-600 underline">
              Go Back
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const showBackButton = currentScreen !== "main";
  const hideBottomNav = currentScreen === "liveScoring";

  return (
    <MobileShell
      activeTab={activeTab}
      onTabChange={handleTabChange}
      showBackButton={showBackButton}
      onBack={goBack}
      headerTitle={getHeaderTitle()}
      hideBottomNav={hideBottomNav}
    >
      {renderScreen()}
    </MobileShell>
  );
};

export default App;
