import React, { useState, useEffect } from "react";
import {
  getLocalEventsForMatch,
  queueLocalMatchEvent,
  syncOfflineEventsForMatch,
} from "../lib/offlineEvents";
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Target,
  Circle,
  AlertCircle,
  Users2,
  Flag,
  StopCircle,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { useMatchWithLineups } from "../hooks/useMatchWithLineups";

type LiveScoringProps = {
  matchId: string;
  onBack: () => void;
  onEndMatch: (finalMatchData: any) => void;
  initialSquads?: {
    team1Name: string;
    team2Name: string;
    team1Squad: SquadPlayer[];
    team2Squad: SquadPlayer[];
    team1FullRoster: SquadPlayer[];
    team2FullRoster: SquadPlayer[];
  };
};

type SquadPlayer = {
  id: string;
  name: string;
  number: string | number;
  position: string | null;
};

type MatchEvent = {
  id: number;
  type: string;
  team: 1 | 2;
  teamName: string;
  player?: SquadPlayer | null;
  assist?: SquadPlayer | null;
  playerOut?: SquadPlayer | null;
  playerIn?: SquadPlayer | null;
  time: string;
  timestamp: Date;
  goalType?: string | null;
  shotOnTargetOutcome?: string | null;
  savedBy?: SquadPlayer | null;
  blockedBy?: SquadPlayer | null;
  shotOffTargetOutcome?: string | null;
  yellowCard?: boolean;
  redCard?: boolean;
};

const LiveScoring: React.FC<LiveScoringProps> = ({
  matchId,
  onBack,
  onEndMatch,
  initialSquads,
}) => {
  const { loading, error, match, homeTeam, awayTeam, homePlayers, awayPlayers } =
    useMatchWithLineups(matchId);

  // -----------------------------
  // Derive team names + squads
  // -----------------------------

  // Names: prefer initialSquads → Supabase → fallback
  const team1Name =
    initialSquads?.team1Name ?? homeTeam?.name ?? "Home";
  const team2Name =
    initialSquads?.team2Name ?? awayTeam?.name ?? "Away";

  // Map DB lineups into SquadPlayer shape
  const dbTeam1Squad: SquadPlayer[] = homePlayers.map((p) => ({
    id: String(p.id),
    name: p.name,
    number: p.jersey,
    position: p.position,
  }));

  const dbTeam2Squad: SquadPlayer[] = awayPlayers.map((p) => ({
    id: String(p.id),
    name: p.name,
    number: p.jersey,
    position: p.position,
  }));

  // Effective starting squads (what UI uses everywhere)
  const team1Squad: SquadPlayer[] =
    initialSquads?.team1Squad ?? dbTeam1Squad;
  const team2Squad: SquadPlayer[] =
    initialSquads?.team2Squad ?? dbTeam2Squad;

  // Full roster: prefer initial full roster → squad
  const team1FullRoster: SquadPlayer[] =
    initialSquads?.team1FullRoster ?? team1Squad;
  const team2FullRoster: SquadPlayer[] =
    initialSquads?.team2FullRoster ?? team2Squad;

  // -----------------------------
  // Local state
  // -----------------------------
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showPlayerSelect, setShowPlayerSelect] = useState(false);
  const [showEndMatchDialog, setShowEndMatchDialog] = useState(false);
  const [showAssistSelect, setShowAssistSelect] = useState(false);
  const [goalScorer, setGoalScorer] = useState<any>(null);
  const [selectedTeam, setSelectedTeam] = useState<1 | 2 | null>(null);
  const [yellowCard, setYellowCard] = useState(false);
  const [redCard, setRedCard] = useState(false);
  const [showSubstituteSelect, setShowSubstituteSelect] = useState(false);
  const [playerOut, setPlayerOut] = useState<SquadPlayer | null>(null);

  // specifically track the foul-selected player for highlight
  const [selectedFoulPlayerId, setSelectedFoulPlayerId] =
    useState<string | null>(null);

  // Goal type
  const [goalType, setGoalType] = useState<string | null>(null);

  // Shot on target
  const [shotOnTargetOutcome, setShotOnTargetOutcome] =
    useState<string | null>(null);
  const [showBlockerSelect, setShowBlockerSelect] = useState(false);
  const [shootingPlayer, setShootingPlayer] = useState<{
    team: 1 | 2;
    player: SquadPlayer | null;
  } | null>(null);

  // Shot off target
  const [shotOffTargetOutcome, setShotOffTargetOutcome] =
    useState<string | null>(null);

  // Initialize scores from DB match once
  useEffect(() => {
    if (match) {
      setScoreA(match.home_score ?? 0);
      setScoreB(match.away_score ?? 0);
      // Later we can pull elapsed time from metadata
    }
  }, [match]);

  // Hydrate local offline events for this match & try sync
  useEffect(() => {
    if (!matchId) return;

    try {
      const queued = getLocalEventsForMatch(matchId) ?? [];
      const localEvents = queued
        .map((e: any) =>
          e && e.payload ? (e.payload as MatchEvent) : null
        )
        .filter(
          (ev): ev is MatchEvent =>
            !!ev && typeof (ev as any).type === "string"
        );

      if (localEvents.length) {
        setEvents((prev) => (prev.length ? prev : localEvents));
      }
    } catch (err) {
      console.error("[LiveScoring] Failed to hydrate local events", err);
    }

    void syncOfflineEventsForMatch(matchId).catch((err) => {
      console.error("[LiveScoring] Failed to sync offline events", err);
    });
  }, [matchId]);


  // Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isRunning) {
      interval = setInterval(() => {
        setTime((t) => t + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // First tap - select event type
  const handleEventSelect = (eventType: any) => {
    setSelectedEvent(eventType);
    setYellowCard(false);
    setRedCard(false);
    setGoalType(null);
    setShotOnTargetOutcome(null);
    setShotOffTargetOutcome(null);
    setSelectedTeam(null);
    setPlayerOut(null);
    setSelectedFoulPlayerId(null);

    if (eventType.type === "substitution") {
      setShowSubstituteSelect(true);
    } else {
      setShowPlayerSelect(true);
    }
  };

  // Generic event creator (also persists offline)
  const createEvent = (
    team: 1 | 2,
    player: SquadPlayer | null,
    additionalData: any = {}
  ) => {
    if (!selectedEvent) return;

    const newEvent: MatchEvent = {
      id: Date.now(),
      type: selectedEvent.type,
      team,
      teamName: team === 1 ? team1Name : team2Name,
      player: player || null,
      time: formatTime(time),
      timestamp: new Date(),
      ...additionalData,
    };

    setEvents((prev) => [newEvent, ...prev]);

    if (matchId) {
      queueLocalMatchEvent(matchId, newEvent);
    }

    setSelectedEvent(null);
    setShowPlayerSelect(false);
    setYellowCard(false);
    setRedCard(false);
    setSelectedTeam(null);
    setPlayerOut(null);
    setSelectedFoulPlayerId(null);
  };

  // Second tap - select team/player
  const handlePlayerSelect = (
    team: 1 | 2,
    player: SquadPlayer | null = null
  ) => {
    const logicalMatch = {
      team1Squad,
      team2Squad,
    };

    setSelectedTeam(team);

    if (!selectedEvent) return;

    if (selectedEvent.type === "goal") {
      setGoalScorer({ team, player });
      setShowPlayerSelect(false);
      setShowAssistSelect(true);
      return;
    }

    if (selectedEvent.type === "shot_on_goal") {
      if (shotOnTargetOutcome === "Saved") {
        const opposingTeam = team === 1 ? 2 : 1;
        const opposingSquad =
          opposingTeam === 1 ? logicalMatch.team1Squad : logicalMatch.team2Squad;
        const goalkeeper = opposingSquad?.find(
          (p: any) => p.position === "Goalkeeper"
        );
        createEvent(team, player, {
          shotOnTargetOutcome,
          savedBy: goalkeeper || null,
        });
        setShowPlayerSelect(false);
        return;
      } else if (shotOnTargetOutcome === "Blocked") {
        setShootingPlayer({ team, player });
        setShowPlayerSelect(false);
        setShowBlockerSelect(true);
        return;
      }
    }

    if (selectedEvent.type === "foul") {
      setPlayerOut(player || null);
      setSelectedFoulPlayerId(player?.id ?? null);
      return;
    }

    if (selectedEvent.type === "off_target") {
      createEvent(team, player, {
        shotOffTargetOutcome,
      });
      return;
    }

    createEvent(team, player);
  };

  const handleBlockerSelect = (blocker: SquadPlayer) => {
    if (!shootingPlayer) return;
    createEvent(shootingPlayer.team, shootingPlayer.player, {
      shotOnTargetOutcome,
      blockedBy: blocker,
    });
    setShowBlockerSelect(false);
    setShootingPlayer(null);
  };

  const handleAssistSelect = (assistPlayer: SquadPlayer | null = null) => {
    if (!goalScorer) return;

    const newEvent: MatchEvent = {
      id: Date.now(),
      type: "goal",
      team: goalScorer.team,
      teamName: goalScorer.team === 1 ? team1Name : team2Name,
      player: goalScorer.player,
      assist: assistPlayer || undefined,
      time: formatTime(time),
      timestamp: new Date(),
      goalType,
    };

    setEvents((prev) => [newEvent, ...prev]);

    if (matchId) {
      queueLocalMatchEvent(matchId, newEvent);
    }

    if (goalScorer.team === 1) {
      setScoreA((s) => s + 1);
    } else {
      setScoreB((s) => s + 1);
    }

    setSelectedEvent(null);
    setShowAssistSelect(false);
    setGoalScorer(null);
    setGoalType(null);
  };

  const handleSubstituteConfirm = (team: 1 | 2, playerIn: SquadPlayer) => {
    if (!playerOut) return;

    const newEvent: MatchEvent = {
      id: Date.now(),
      type: "substitute",
      team,
      teamName: team === 1 ? team1Name : team2Name,
      playerOut,
      playerIn,
      time: formatTime(time),
      timestamp: new Date(),
    };

    setEvents((prev) => [newEvent, ...prev]);

    if (matchId) {
      queueLocalMatchEvent(matchId, newEvent);
    }

    setSelectedEvent(null);
    setShowSubstituteSelect(false);
    setPlayerOut(null);
    setSelectedTeam(null);
    setSelectedFoulPlayerId(null);
  };

  const eventButtons = [
    {
      type: "goal",
      label: "Goal",
      icon: Target,
      color: "bg-green-500 hover:bg-green-600 text-white",
    },
    {
      type: "shot_on_goal",
      label: "Shot on Goal",
      icon: Circle,
      color: "bg-blue-500 hover:bg-blue-600 text-white",
    },
    {
      type: "off_target",
      label: "Off Target",
      icon: Circle,
      color: "bg-gray-500 hover:bg-gray-600 text-white",
    },
    {
      type: "foul",
      label: "Foul",
      icon: AlertCircle,
      color: "bg-yellow-500 hover:bg-yellow-600 text-white",
    },
    {
      type: "substitution",
      label: "Substitution",
      icon: Users2,
      color: "bg-purple-500 hover:bg-purple-600 text-white",
    },
    {
      type: "offside",
      label: "Offside",
      icon: Flag,
      color: "bg-orange-500 hover:bg-orange-600 text-white",
    },
  ];

  const getEventIcon = (eventType: string) => {
    const event = eventButtons.find((e) => e.type === eventType);
    return event ? event.icon : Circle;
  };

  const getEventColor = (eventType: string) => {
    const colors: Record<string, string> = {
      goal: "bg-green-100 text-green-600",
      shot_on_goal: "bg-blue-100 text-blue-600",
      off_target: "bg-gray-100 text-gray-600",
      foul: "bg-yellow-100 text-yellow-600",
      substitution: "bg-purple-100 text-purple-600",
      offside: "bg-orange-100 text-orange-600",
    };
    return colors[eventType] || "bg-gray-100 text-gray-600";
  };

  if (!matchId) {
    return <div className="p-4 text-slate-500">No match selected</div>;
  }

  if (loading || !match) {
    return <div className="p-4 text-slate-500">Loading match…</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error loading match: {String(error)}
      </div>
    );
  }

  const venueLabel = match.venue_name || "Match Venue";

  return (
    <div className="pb-24">
      <div className="px-4 py-5 space-y-4">
        {/* Timer and Match Info */}
        <div className="bg-purple-600 text-white rounded-2xl p-6 space-y-4">
          <div className="text-center">
            <div className="text-5xl font-medium mb-2">
              {formatTime(time)}
            </div>
            <p className="text-purple-200 text-sm">{venueLabel}</p>
          </div>

          {/* Score Display */}
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-2 mx-auto">
                <span className="font-medium text-xl">
                  {team1Name?.substring(0, 1)}
                </span>
              </div>
              <p className="font-medium mb-2">{team1Name}</p>
              <div className="text-4xl font-medium">{scoreA}</div>
            </div>

            <div className="text-center px-4">
              <div className="text-xl font-medium text-purple-200">
                VS
              </div>
            </div>

            <div className="text-center flex-1">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-2 mx-auto">
                <span className="font-medium text-xl">
                  {team2Name?.substring(0, 1)}
                </span>
              </div>
              <p className="font-medium mb-2">{team2Name}</p>
              <div className="text-4xl font-medium">{scoreB}</div>
            </div>
          </div>

          {/* Timer Controls */}
          <div className="flex justify-center gap-3">
            <Button
              onClick={() => setIsRunning((r) => !r)}
              className={`rounded-full px-6 ${
                isRunning
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-green-500 hover:bg-green-600"
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Start
                </>
              )}
            </Button>

            <Button
              onClick={() => setTime(0)}
              variant="outline"
              className="rounded-full px-6 bg-white/20 border-white/40 text-white hover:bg-white/30"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Reset
            </Button>
          </div>
        </div>

        {/* End Match Button */}
        <Button
          onClick={() => {
            setIsRunning(false);
            setShowEndMatchDialog(true);
          }}
          className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl"
        >
          <StopCircle className="w-5 h-5 mr-2" />
          End Match
        </Button>

        {/* Event Buttons */}
        <div className="bg-white rounded-2xl p-6 space-y-4">
          <h2 className="font-medium text-center text-lg">
            Record Event
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {eventButtons.map((button) => {
              const Icon = button.icon;
              return (
                <Button
                  key={button.type}
                  onClick={() => handleEventSelect(button)}
                  className={`h-24 flex flex-col items-center justify-center gap-2 ${button.color}`}
                >
                  <Icon className="w-8 h-8" />
                  <span>{button.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Recent Events */}
        {events.length > 0 && (
          <div className="bg-white rounded-2xl p-4">
            <h3 className="font-medium mb-3">Match Events</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {events.map((event) => {
                const EventIcon = getEventIcon(event.type);
                return (
                  <div
                    key={event.id}
                    className={`flex items-center gap-3 p-3 rounded-xl ${getEventColor(
                      event.type
                    )}`}
                  >
                    <EventIcon className="w-5 h-5" />
                    <div className="flex-1">
                      <p className="font-medium">
                        {event.type.replace(/_/g, " ").toUpperCase()}
                      </p>
                      <p className="text-sm opacity-80">
                        {event.teamName}
                        {event.player && ` - ${event.player.name}`}
                        {event.goalType && ` (${event.goalType})`}
                        {event.assist &&
                          ` (Assist: ${event.assist.name})`}
                        {event.shotOnTargetOutcome &&
                          event.savedBy &&
                          ` - ${event.shotOnTargetOutcome} by ${event.savedBy.name}`}
                        {event.shotOnTargetOutcome &&
                          event.blockedBy &&
                          ` - ${event.shotOnTargetOutcome} by ${event.blockedBy.name}`}
                        {event.shotOffTargetOutcome &&
                          ` - ${event.shotOffTargetOutcome}`}
                        {event.yellowCard && " 🟨"}
                        {event.redCard && " 🟥"}
                        {event.playerOut &&
                          event.playerIn &&
                          ` - OUT: ${event.playerOut.name}, IN: ${event.playerIn.name}`}
                      </p>
                    </div>
                    <div className="text-sm font-medium">
                      {event.time}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Player Selection Dialog */}
      <Dialog open={showPlayerSelect} onOpenChange={setShowPlayerSelect}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedEvent &&
                `Select ${
                  selectedEvent.type === "foul" ? "Player for" : "Team for"
                } ${selectedEvent.label}`}
            </DialogTitle>
            <DialogDescription>
              Choose the player or team involved in this event.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Cards for fouls */}
            {selectedEvent && selectedEvent.type === "foul" && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <p className="font-medium text-sm">Card Given (Optional)</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={yellowCard}
                      onChange={(e) => {
                        setYellowCard(e.target.checked);
                        if (e.target.checked) setRedCard(false);
                      }}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm">Yellow Card</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={redCard}
                      onChange={(e) => {
                        setRedCard(e.target.checked);
                        if (e.target.checked) setYellowCard(false);
                      }}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm">Red Card</span>
                  </label>
                </div>
              </div>
            )}

            {/* Goal types */}
            {selectedEvent && selectedEvent.type === "goal" && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <p className="font-medium text-sm">
                  Goal Type (Optional)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {["Long shot", "Tap-in", "Acrobatic", "Header"].map(
                    (type) => (
                      <label
                        key={type}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={goalType === type}
                          onChange={(e) => {
                            setGoalType(e.target.checked ? type : null);
                          }}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <span className="text-sm">{type}</span>
                      </label>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Shot on target outcomes */}
            {selectedEvent &&
              selectedEvent.type === "shot_on_goal" && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <p className="font-medium text-sm">
                    Outcome (Optional)
                  </p>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shotOnTargetOutcome === "Saved"}
                        onChange={(e) => {
                          setShotOnTargetOutcome(
                            e.target.checked ? "Saved" : null
                          );
                        }}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm">Saved</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shotOnTargetOutcome === "Blocked"}
                        onChange={(e) => {
                          setShotOnTargetOutcome(
                            e.target.checked ? "Blocked" : null
                          );
                        }}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm">Blocked</span>
                    </label>
                  </div>
                </div>
              )}

            {/* Shot off target outcomes */}
            {selectedEvent &&
              selectedEvent.type === "off_target" && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <p className="font-medium text-sm">
                    Outcome (Optional)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      "Hit post",
                      "Hit crossbar",
                      "Wide of the post",
                      "Over the bar",
                    ].map((type) => (
                      <label
                        key={type}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={shotOffTargetOutcome === type}
                          onChange={(e) => {
                            setShotOffTargetOutcome(
                              e.target.checked ? type : null
                            );
                          }}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

            {/* Team 1 */}
            <div className="space-y-2">
              <h3 className="font-medium">{team1Name}</h3>
              {team1Squad.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                  {team1Squad.map((player) => {
                    const isFoulSelected =
                      selectedEvent?.type === "foul" &&
                      selectedTeam === 1 &&
                      selectedFoulPlayerId === player.id;

                    return (
                      <Button
                        key={player.id}
                        onClick={() => {
                          if (selectedEvent?.type === "foul") {
                            setSelectedTeam(1);
                            setPlayerOut(player);
                            setSelectedFoulPlayerId(player.id);
                          } else {
                            handlePlayerSelect(1, player);
                          }
                        }}
                        variant="outline"
                        className={`justify-start h-auto py-3 ${
                          isFoulSelected
                            ? "bg-purple-600 text-white border-purple-600"
                            : ""
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                            isFoulSelected
                              ? "bg-purple-700"
                              : "bg-purple-100"
                          }`}
                        >
                          <span
                            className={`text-sm font-medium ${
                              isFoulSelected
                                ? "text-white"
                                : "text-purple-600"
                            }`}
                          >
                            {player.number}
                          </span>
                        </div>
                        {player.name}
                      </Button>
                    );
                  })}
                </div>
              ) : (
                <Button
                  onClick={() => {
                    if (selectedEvent?.type === "foul") {
                      setSelectedTeam(1);
                      setPlayerOut(null);
                      setSelectedFoulPlayerId(null);
                    } else {
                      handlePlayerSelect(1, null);
                    }
                  }}
                  variant="outline"
                  className="w-full justify-start h-auto py-3"
                >
                  {team1Name} (Team Event)
                </Button>
              )}
            </div>

            {/* Team 2 */}
            <div className="space-y-2">
              <h3 className="font-medium">{team2Name}</h3>
              {team2Squad.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                  {team2Squad.map((player) => {
                    const isFoulSelected =
                      selectedEvent?.type === "foul" &&
                      selectedTeam === 2 &&
                      selectedFoulPlayerId === player.id;

                    return (
                      <Button
                        key={player.id}
                        onClick={() => {
                          if (selectedEvent?.type === "foul") {
                            setSelectedTeam(2);
                            setPlayerOut(player);
                            setSelectedFoulPlayerId(player.id);
                          } else {
                            handlePlayerSelect(2, player);
                          }
                        }}
                        variant="outline"
                        className={`justify-start h-auto py-3 ${
                          isFoulSelected
                            ? "bg-purple-600 text-white border-purple-600"
                            : ""
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                            isFoulSelected
                              ? "bg-purple-700"
                              : "bg-purple-100"
                          }`}
                        >
                          <span
                            className={`text-sm font-medium ${
                              isFoulSelected
                                ? "text-white"
                                : "text-purple-600"
                            }`}
                          >
                            {player.number}
                          </span>
                        </div>
                        {player.name}
                      </Button>
                    );
                  })}
                </div>
              ) : (
                <Button
                  onClick={() => {
                    if (selectedEvent?.type === "foul") {
                      setSelectedTeam(2);
                      setPlayerOut(null);
                      setSelectedFoulPlayerId(null);
                    } else {
                      handlePlayerSelect(2, null);
                    }
                  }}
                  variant="outline"
                  className="w-full justify-start h-auto py-3"
                >
                  {team2Name} (Team Event)
                </Button>
              )}
            </div>

            {/* Confirm button for fouls */}
            {selectedEvent &&
              selectedEvent.type === "foul" &&
              selectedTeam &&
              (playerOut || selectedFoulPlayerId) && (
                <Button
                  onClick={() => {
                    createEvent(selectedTeam as 1 | 2, playerOut, {
                      yellowCard,
                      redCard,
                    });
                    setShowPlayerSelect(false);
                    setSelectedFoulPlayerId(null);
                    setSelectedTeam(null);
                    setPlayerOut(null);
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Confirm Foul
                </Button>
              )}

            <Button
              onClick={() => {
                setSelectedEvent(null);
                setShowPlayerSelect(false);
                setYellowCard(false);
                setRedCard(false);
                setSelectedTeam(null);
                setPlayerOut(null);
                setSelectedFoulPlayerId(null);
              }}
              variant="outline"
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assist Selection Dialog */}
      <Dialog open={showAssistSelect} onOpenChange={setShowAssistSelect}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Assist (Optional)</DialogTitle>
            <DialogDescription>
              Goal scored by {goalScorer?.player?.name || "Team"}. Select
              the player who assisted, or skip if none.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">
                {goalScorer?.team === 1 ? team1Name : team2Name}
              </h3>
              {(
                (goalScorer?.team === 1 ? team1Squad : team2Squad) || []
              )
                .filter((p) => p.id !== goalScorer?.player?.id)
                .map((player) => (
                  <Button
                    key={player.id}
                    onClick={() => handleAssistSelect(player)}
                    variant="outline"
                    className="w-full justify-start h-auto py-3"
                  >
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-purple-600 text-sm font-medium">
                        {player.number}
                      </span>
                    </div>
                    {player.name}
                  </Button>
                ))}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => handleAssistSelect(null)}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                No Assist
              </Button>
              <Button
                onClick={() => {
                  setShowAssistSelect(false);
                  setGoalScorer(null);
                  setSelectedEvent(null);
                  setGoalType(null);
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Substitute Selection Dialog */}
      <Dialog open={showSubstituteSelect} onOpenChange={setShowSubstituteSelect}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {!playerOut
                ? "Select Player Going Out"
                : "Select Player Coming In"}
            </DialogTitle>
            <DialogDescription>
              {!playerOut
                ? "Choose the player being substituted from the current playing XI."
                : "Choose the replacement player from available squad members."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!playerOut ? (
              <>
                {/* Step 1: Select player OUT */}
                <div className="space-y-2">
                  <h3 className="font-medium">{team1Name}</h3>
                  {team1Squad.length > 0 && (
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                      {team1Squad.map((player) => (
                        <Button
                          key={player.id}
                          onClick={() => {
                            setPlayerOut(player);
                            setSelectedTeam(1);
                          }}
                          variant="outline"
                          className="justify-start h-auto py-3"
                        >
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-purple-600 text-sm font-medium">
                              {player.number}
                            </span>
                          </div>
                          {player.name}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">{team2Name}</h3>
                  {team2Squad.length > 0 && (
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                      {team2Squad.map((player) => (
                        <Button
                          key={player.id}
                          onClick={() => {
                            setPlayerOut(player);
                            setSelectedTeam(2);
                          }}
                          variant="outline"
                          className="justify-start h-auto py-3"
                        >
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-purple-600 text-sm font-medium">
                              {player.number}
                            </span>
                          </div>
                          {player.name}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Step 2: Select player IN */}
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <span className="font-medium">{playerOut.name}</span> is
                    being substituted. Select the replacement player.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">
                    Available Players (Not in Playing XI)
                  </h3>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                    {(() => {
                      const fullRoster =
                        selectedTeam === 1 ? team1FullRoster : team2FullRoster;
                      const currentSquad =
                        selectedTeam === 1 ? team1Squad : team2Squad;
                      const availablePlayers =
                        fullRoster?.filter(
                          (p) => !currentSquad?.some((s) => s.id === p.id)
                        ) || [];

                      if (availablePlayers.length === 0) {
                        return (
                          <p className="text-sm text-gray-600 py-4 text-center">
                            No available substitute players
                          </p>
                        );
                      }

                      return availablePlayers.map((player) => (
                        <Button
                          key={player.id}
                          onClick={() =>
                            handleSubstituteConfirm(selectedTeam as 1 | 2, player)
                          }
                          variant="outline"
                          className="justify-start h-auto py-3"
                        >
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-green-600 text-sm font-medium">
                              {player.number}
                            </span>
                          </div>
                          {player.name}
                        </Button>
                      ));
                    })()}
                  </div>
                </div>
              </>
            )}

            <Button
              onClick={() => {
                setShowSubstituteSelect(false);
                setPlayerOut(null);
                setSelectedEvent(null);
                setSelectedTeam(null);
                setSelectedFoulPlayerId(null);
              }}
              variant="outline"
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Blocker Selection Dialog */}
      <Dialog open={showBlockerSelect} onOpenChange={setShowBlockerSelect}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Blocking Player</DialogTitle>
            <DialogDescription>
              Shot blocked. Select the defending player who blocked the
              shot.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">
                {shootingPlayer?.team === 1 ? team2Name : team1Name}
              </h3>
              {(
                (shootingPlayer?.team === 1 ? team2Squad : team1Squad) ||
                []
              ).map((player) => (
                <Button
                  key={player.id}
                  onClick={() => handleBlockerSelect(player)}
                  variant="outline"
                  className="w-full justify-start h-auto py-3"
                >
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-red-600 text-sm font-medium">
                      {player.number}
                    </span>
                  </div>
                  {player.name}
                </Button>
              ))}
            </div>

            <Button
              onClick={() => {
                setShowBlockerSelect(false);
                setShootingPlayer(null);
                setSelectedEvent(null);
              }}
              variant="outline"
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* End Match Confirmation Dialog */}
      <AlertDialog open={showEndMatchDialog} onOpenChange={setShowEndMatchDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Match?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to end this match? The final score
              will be recorded as {team1Name} {scoreA} - {scoreB}{" "}
              {team2Name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const finalMatchData = {
                  matchId,
                  teamA: team1Name,
                  teamB: team2Name,
                  scoreA,
                  scoreB,
                  events: [...events].reverse(),
                  finalTime: formatTime(time),
                  duration: time,
                  status: "Final",
                  endTime: new Date(),
                };
                onEndMatch(finalMatchData);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              End Match
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LiveScoring;
