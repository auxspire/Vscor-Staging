import React, { useState } from "react";
import { ArrowLeft, Trophy, Calendar, MapPin, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

// ----------------------
// Types
// ----------------------

export type TournamentSummary = {
  id: number | string;
  name: string;
  // Optional extras – can be wired from Supabase later
  season?: string | null;
  country?: string | null;
  founded?: number | null;
  teams?: number | null;
  matchesTotal?: number | null;
  matchesPlayed?: number | null;
  matchesRemaining?: number | null;
  currentMatchday?: number | null;
  totalMatchdays?: number | null;
};

export type TeamStanding = {
  position: number;
  team: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: string[]; // e.g. ["W","D","L"]
  qualification?: string; // e.g. "Champions League"
};

export type Fixture = {
  id: string | number;
  matchId?: string | null; // 🔗 linked matches.id if present
  matchday: number | null;
  date: string | null;
  time: string | null;
  teamA: string;
  teamB: string;
  venue: string | null;
  competition: string | null;
  status?: string | null; // e.g. "scheduled" | "live" | "finished"
  homeScore?: number | null;
  awayScore?: number | null;
};

export type TopScorer = {
  position: number;
  player: string;
  team: string;
  goals: number;
  assists?: number;
  matches?: number;
  minutesPerGoal?: number;
};

export type TournamentStats = {
  goals?: {
    total?: number;
    average?: number;
    highest?: string;
    lowest?: string;
  };
  discipline?: {
    yellowCards?: number;
    redCards?: number;
    averagePerMatch?: number;
  };
  attendance?: {
    total?: number;
    average?: number;
    highest?: string;
    lowest?: string;
  };
};

export type TournamentFormatInfo = {
  type?: string; // e.g. "Round Robin"
  promotion?: number | null;
  relegation?: number | null;
  europeanSpots?: number | null;
  championsLeague?: number | null;
  europaLeague?: number | null;
  conferenceLeague?: number | null;
};

export type TournamentPrizesInfo = {
  winner?: string;
  runnerUp?: string;
  third?: string;
  tvRights?: string;
};

export type TournamentInfo = {
  basic?: {
    fullName?: string;
    season?: string | null;
    country?: string | null;
    founded?: number | null;
    teams?: number | null;
    matchesTotal?: number | null;
    matchesPlayed?: number | null;
    matchesRemaining?: number | null;
    currentMatchday?: number | null;
    totalMatchdays?: number | null;
  };
  format?: TournamentFormatInfo;
  prizes?: TournamentPrizesInfo;
};

type TeamClickPayload = {
  id: number;
  name: string;
  matches: number;
  wins: number;
  goals: number;
};

type PlayerClickPayload = {
  id: number;
  name: string;
  team: string;
  goals: number;
  assists?: number;
};

type TournamentProfileScreenProps = {
  // Minimal info from the list
  tournament?: TournamentSummary | null;

  // Rich profile data (all optional, no mock defaults)
  info?: TournamentInfo;
  table?: TeamStanding[];
  fixtures?: Fixture[];
  topScorers?: TopScorer[];
  stats?: TournamentStats;

  onBack: () => void;
  onTeamClick?: (payload: TeamClickPayload) => void;
  onPlayerClick?: (payload: PlayerClickPayload) => void;
  onMatchClick?: (fixture: Fixture) => void;
};

// ----------------------
// Helpers
// ----------------------

const getQualificationColor = (qualification?: string): string => {
  switch (qualification) {
    case "Champions League":
      return "bg-blue-100 text-blue-800";
    case "Europa League":
      return "bg-orange-100 text-orange-800";
    case "Conference League":
      return "bg-green-100 text-green-800";
    case "Relegation":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getFormColor = (result: string): string => {
  switch (result) {
    case "W":
      return "bg-green-500 text-white";
    case "D":
      return "bg-yellow-500 text-white";
    case "L":
      return "bg-red-500 text-white";
    default:
      return "bg-gray-500 text-white";
  }
};

const normalizeFixtureStatus = (raw?: string | null): "scheduled" | "live" | "finished" | "other" => {
  if (!raw) return "other";
  const val = raw.toLowerCase();
  if (val === "scheduled" || val === "upcoming") return "scheduled";
  if (val === "live" || val === "in_progress") return "live";
  if (val === "finished" || val === "completed" || val === "ft") return "finished";
  return "other";
};

// ----------------------
// Component
// ----------------------

const TournamentProfileScreen: React.FC<TournamentProfileScreenProps> = ({
  tournament,
  info,
  table,
  fixtures,
  topScorers,
  stats,
  onBack,
  onTeamClick = () => {},
  onPlayerClick = () => {},
  onMatchClick = () => {},
}) => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "table" | "fixtures" | "stats"
  >("overview");

  // Basic merged info
  const basic = info?.basic || {};
  const fullName = basic.fullName || tournament?.name || "Tournament";
  const season = basic.season || tournament?.season || "";
  const country = basic.country || tournament?.country || "";
  const founded = basic.founded ?? tournament?.founded ?? undefined;
  const teams = basic.teams ?? tournament?.teams ?? undefined;

  const matchesTotal =
    basic.matchesTotal ?? tournament?.matchesTotal ?? null;
  const matchesPlayed =
    basic.matchesPlayed ?? tournament?.matchesPlayed ?? null;
  const currentMatchday =
    basic.currentMatchday ?? tournament?.currentMatchday ?? null;
  const totalMatchdays =
    basic.totalMatchdays ?? tournament?.totalMatchdays ?? null;

  const hasProgressNumbers =
    matchesTotal !== null &&
    matchesTotal !== undefined &&
    matchesPlayed !== null &&
    matchesPlayed !== undefined &&
    matchesTotal > 0;

  const seasonProgressPct = hasProgressNumbers
    ? Math.min(
        100,
        Math.max(0, (Number(matchesPlayed) / Number(matchesTotal)) * 100)
      )
    : null;

  const formatInfo = info?.format;
  const prizesInfo = info?.prizes;

  const leagueTable = table || [];
  const fixturesList = fixtures || [];
  const topScorersList = topScorers || [];
  const tournamentStats = stats || {};

  const handleTeamNameClick = (teamName: string) => {
    if (!leagueTable.length) return;
    const teamData = leagueTable.find((t) => t.team === teamName);
    if (!teamData) return;

    onTeamClick({
      id: teamData.position,
      name: teamName,
      matches: teamData.matches,
      wins: teamData.wins,
      goals: teamData.goalsFor,
    });
  };

  const handlePlayerNameClick = (playerName: string, teamName: string) => {
    if (!topScorersList.length) return;
    const playerData = topScorersList.find(
      (scorer) => scorer.player === playerName
    );
    if (!playerData) return;

    onPlayerClick({
      id: playerData.position,
      name: playerName,
      team: teamName,
      goals: playerData.goals,
      assists: playerData.assists,
    });
  };

  return (
    <div className="px-4 py-5 space-y-5 pb-24 bg-white text-slate-900">
      {/* Tournament Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-6">
          {/* Tournament Logo */}
          <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center">
            <Trophy className="w-10 h-10 text-white" />
          </div>

          {/* Tournament Basic Info */}
          <div className="flex-1">
            <h2 className="text-2xl font-medium mb-1">{fullName}</h2>

            {season && (
              <div className="text-purple-400 font-medium mb-2">
                Season {season}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
              {country && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{country}</span>
                </div>
              )}
              {typeof founded === "number" && <span>Founded {founded}</span>}
              {typeof teams === "number" && <span>{teams} teams</span>}
            </div>
          </div>

          {/* Tournament Progress (only if we have numbers) */}
          {hasProgressNumbers && (
            <div className="text-right">
              {currentMatchday !== null &&
                currentMatchday !== undefined &&
                totalMatchdays !== null &&
                totalMatchdays !== undefined && (
                  <>
                    <div className="text-3xl font-medium">
                      MD {currentMatchday}
                    </div>
                    <div className="text-sm text-slate-400 mb-2">
                      of {totalMatchdays}
                    </div>
                  </>
                )}
              <div className="text-sm text-slate-400">
                {matchesPlayed}/{matchesTotal} matches
              </div>
            </div>
          )}
        </div>

        {/* Tournament Progress Bar */}
        {hasProgressNumbers && seasonProgressPct !== null && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="flex justify-between text-sm text-slate-300 mb-2">
              <span>Season Progress</span>
              <span>{Math.round(seasonProgressPct)}%</span>
            </div>
            <div className="w-full bg-purple-200/30 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${seasonProgressPct}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val: string) =>
          setActiveTab(val as "overview" | "table" | "fixtures" | "stats")
        }
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
          <TabsTrigger value="fixtures">Fixtures</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4">
          {/* Tournament Format / Prize Money */}
          {formatInfo || prizesInfo ? (
            <>
              {formatInfo && (
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle>Tournament Format</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {formatInfo.type && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Format</span>
                          <span className="font-medium">
                            {formatInfo.type}
                          </span>
                        </div>
                      )}
                      {typeof teams === "number" && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Teams</span>
                          <span className="font-medium">{teams}</span>
                        </div>
                      )}
                      {typeof formatInfo.championsLeague === "number" && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">
                            Champions League
                          </span>
                          <span className="font-medium">
                            {formatInfo.championsLeague} spots
                          </span>
                        </div>
                      )}
                      {typeof formatInfo.europaLeague === "number" && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">
                            Europa League
                          </span>
                          <span className="font-medium">
                            {formatInfo.europaLeague} spots
                          </span>
                        </div>
                      )}
                      {typeof formatInfo.conferenceLeague === "number" && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">
                            Conference League
                          </span>
                          <span className="font-medium">
                            {formatInfo.conferenceLeague} spot
                          </span>
                        </div>
                      )}
                      {typeof formatInfo.relegation === "number" && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Relegation</span>
                          <span className="font-medium">
                            {formatInfo.relegation} teams
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {prizesInfo && (
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle>Prize Money</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {prizesInfo.winner && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Winner</span>
                          <span className="font-medium text-yellow-400">
                            {prizesInfo.winner}
                          </span>
                        </div>
                      )}
                      {prizesInfo.runnerUp && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Runner-up</span>
                          <span className="font-medium">
                            {prizesInfo.runnerUp}
                          </span>
                        </div>
                      )}
                      {prizesInfo.third && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Third Place</span>
                          <span className="font-medium">
                            {prizesInfo.third}
                          </span>
                        </div>
                      )}
                      {prizesInfo.tvRights && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">TV Rights</span>
                          <span className="font-medium">
                            {prizesInfo.tvRights}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle>Tournament Details</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-300">
                  Format and prize details are not configured yet. Once you add
                  them in your backend, they will appear here automatically.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Top 5 Teams (if table provided) */}
          {leagueTable.length > 0 ? (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle>Current Top 5</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leagueTable.slice(0, 5).map((team) => (
                    <div
                      key={team.position}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-purple-600">
                            {team.position}
                          </span>
                        </div>
                        <button
                          onClick={() => handleTeamNameClick(team.team)}
                          className="font-medium hover:text-purple-400 hover:underline"
                        >
                          {team.team}
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {team.points} pts
                        </div>
                        <div className="text-sm text-slate-400">
                          GD: {team.goalDifference > 0 ? "+" : ""}
                          {team.goalDifference}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle>Standings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-300">
                  Standings will appear here once you start recording match
                  results for this tournament.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TABLE TAB */}
        <TabsContent value="table" className="space-y-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle>League Table</CardTitle>
            </CardHeader>
            <CardContent>
              {leagueTable.length === 0 ? (
                <p className="text-sm text-slate-300">
                  No table data yet. Once matches are recorded, this table will
                  populate automatically.
                </p>
              ) : (
                <div className="space-y-3">
                  {leagueTable.map((team) => (
                    <div
                      key={team.position}
                      className="border border-slate-700 rounded-xl p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-purple-600">
                              {team.position}
                            </span>
                          </div>
                          <button
                            onClick={() => handleTeamNameClick(team.team)}
                            className="font-medium hover:text-purple-400 hover:underline"
                          >
                            {team.team}
                          </button>
                          {team.qualification && (
                            <Badge
                              className={getQualificationColor(
                                team.qualification
                              )}
                            >
                              {team.qualification}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {team.points} pts
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-6 gap-2 text-xs text-slate-400 mb-2">
                        <div>P: {team.matches}</div>
                        <div>W: {team.wins}</div>
                        <div>D: {team.draws}</div>
                        <div>L: {team.losses}</div>
                        <div>GF: {team.goalsFor}</div>
                        <div>GA: {team.goalsAgainst}</div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                          {team.form.map((result, index) => (
                            <div
                              key={index}
                              className={`w-4 h-4 rounded text-[10px] flex items-center justify-center font-medium ${getFormColor(
                                result
                              )}`}
                            >
                              {result}
                            </div>
                          ))}
                        </div>
                        <div className="text-sm text-slate-200">
                          GD: {team.goalDifference > 0 ? "+" : ""}
                          {team.goalDifference}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FIXTURES TAB */}
        <TabsContent value="fixtures" className="space-y-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle>Fixtures</CardTitle>
            </CardHeader>
            <CardContent>
              {fixturesList.length === 0 ? (
                <p className="text-sm text-slate-300">
                  No fixtures scheduled yet. When you add fixtures for this
                  tournament, they will show up here.
                </p>
              ) : (
                <div className="space-y-4">
                  {fixturesList.map((fixture) => {
                    const statusNorm = normalizeFixtureStatus(fixture.status);
                    const clickable = !!fixture.matchId;
                    const hasScore =
                      typeof fixture.homeScore === "number" &&
                      typeof fixture.awayScore === "number";

                    return (
                      <div
                        key={fixture.id}
                        onClick={() =>
                          clickable ? onMatchClick(fixture) : undefined
                        }
                        className={`border border-slate-700 rounded-xl p-4 transition-colors ${
                          clickable
                            ? "cursor-pointer hover:bg-slate-800"
                            : "cursor-default opacity-80"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            {fixture.date && (
                              <>
                                <Calendar className="w-3 h-3" />
                                <span>{fixture.date}</span>
                              </>
                            )}
                            {fixture.time && (
                              <>
                                <Clock className="w-3 h-3" />
                                <span>{fixture.time}</span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {typeof fixture.matchday === "number" && (
                              <Badge variant="outline">
                                MD {fixture.matchday}
                              </Badge>
                            )}
                            {statusNorm !== "other" && (
                              <Badge
                                className={
                                  statusNorm === "live"
                                    ? "bg-red-500/20 text-red-400 border-red-500/30"
                                    : statusNorm === "finished"
                                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                    : "bg-slate-500/20 text-slate-200 border-slate-500/30"
                                }
                              >
                                {statusNorm === "live"
                                  ? "Live"
                                  : statusNorm === "finished"
                                  ? "Full Time"
                                  : "Scheduled"}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mb-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTeamNameClick(fixture.teamA);
                            }}
                            className="font-medium hover:text-purple-400 hover:underline"
                          >
                            {fixture.teamA}
                          </button>

                          {/* Score / VS */}
                          {hasScore ? (
                            <div className="text-center">
                              <div className="text-xl font-semibold">
                                {fixture.homeScore} – {fixture.awayScore}
                              </div>
                              {statusNorm === "finished" && (
                                <div className="text-[11px] text-slate-400 uppercase tracking-wide">
                                  FT
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-lg font-medium text-slate-300">
                              vs
                            </span>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTeamNameClick(fixture.teamB);
                            }}
                            className="font-medium hover:text-purple-400 hover:underline"
                          >
                            {fixture.teamB}
                          </button>
                        </div>

                        {fixture.venue && (
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <MapPin className="w-3 h-3" />
                            <span>{fixture.venue}</span>
                          </div>
                        )}

                        {!clickable && (
                          <p className="mt-2 text-[11px] text-slate-500">
                            No live match linked to this fixture yet.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* STATS TAB */}
        <TabsContent value="stats" className="space-y-4">
          {/* Top Scorers */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle>Top Scorers</CardTitle>
            </CardHeader>
            <CardContent>
              {topScorersList.length === 0 ? (
                <p className="text-sm text-slate-300">
                  No top scorers yet. Once goals are recorded, player rankings
                  will appear here.
                </p>
              ) : (
                <div className="space-y-3">
                  {topScorersList.map((scorer) => (
                    <div
                      key={scorer.position}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-purple-600">
                            {scorer.position}
                          </span>
                        </div>
                        <div>
                          <button
                            onClick={() =>
                              handlePlayerNameClick(
                                scorer.player,
                                scorer.team
                              )
                            }
                            className="font-medium hover:text-purple-400 hover:underline"
                          >
                            {scorer.player}
                          </button>
                          <div className="text-sm text-slate-400">
                            {scorer.team}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-emerald-400">
                          {scorer.goals} goals
                        </div>
                        {typeof scorer.assists === "number" && (
                          <div className="text-sm text-slate-400">
                            {scorer.assists} assists
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tournament Statistics */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle>Tournament Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              {!tournamentStats.goals &&
              !tournamentStats.discipline &&
              !tournamentStats.attendance ? (
                <p className="text-sm text-slate-300">
                  No aggregated statistics yet. As matches and events are
                  recorded, goals, cards, and attendance numbers will be shown
                  here.
                </p>
              ) : (
                <div className="space-y-6">
                  {tournamentStats.goals && (
                    <div>
                      <h4 className="font-medium mb-3">Goals</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {typeof tournamentStats.goals.total === "number" && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Total Goals</span>
                            <span className="font-medium">
                              {tournamentStats.goals.total}
                            </span>
                          </div>
                        )}
                        {typeof tournamentStats.goals.average ===
                          "number" && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">
                              Average per Match
                            </span>
                            <span className="font-medium">
                              {tournamentStats.goals.average}
                            </span>
                          </div>
                        )}
                        {tournamentStats.goals.highest && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">
                              Highest Scoring
                            </span>
                            <span className="font-medium">
                              {tournamentStats.goals.highest}
                            </span>
                          </div>
                        )}
                        {tournamentStats.goals.lowest && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">
                              Lowest Scoring
                            </span>
                            <span className="font-medium">
                              {tournamentStats.goals.lowest}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {tournamentStats.discipline && (
                    <div>
                      <h4 className="font-medium mb-3">Discipline</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {typeof
                          tournamentStats.discipline.yellowCards ===
                          "number" && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">
                              Yellow Cards
                            </span>
                            <span className="font-medium text-yellow-400">
                              {tournamentStats.discipline.yellowCards}
                            </span>
                          </div>
                        )}
                        {typeof tournamentStats.discipline.redCards ===
                          "number" && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Red Cards</span>
                            <span className="font-medium text-red-400">
                              {tournamentStats.discipline.redCards}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {tournamentStats.attendance && (
                    <div>
                      <h4 className="font-medium mb-3">Attendance</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {typeof tournamentStats.attendance.total ===
                          "number" && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">
                              Total Attendance
                            </span>
                            <span className="font-medium">
                              {tournamentStats.attendance.total.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {typeof tournamentStats.attendance.average ===
                          "number" && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Average</span>
                            <span className="font-medium">
                              {tournamentStats.attendance.average.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {tournamentStats.attendance.highest && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Highest</span>
                            <span className="font-medium">
                              {tournamentStats.attendance.highest}
                            </span>
                          </div>
                        )}
                        {tournamentStats.attendance.lowest && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Lowest</span>
                            <span className="font-medium">
                              {tournamentStats.attendance.lowest}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TournamentProfileScreen;
