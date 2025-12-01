// src/components/MatchSummaryScreen.tsx
import React from "react";
import {
  ArrowLeft,
  Trophy,
  Flag,
  AlertCircle,
  Users2,
  Target,
  Circle,
  Clock,
} from "lucide-react";
import { Button } from "./ui/button";

type SquadPlayer = {
  id: string;
  name: string;
  number: string | number;
  position: string | null;
};

type MatchEvent = {
  id: number | string;
  type: string;
  team: 1 | 2;
  teamName: string;
  player?: SquadPlayer | null;
  assist?: SquadPlayer | null;
  playerOut?: SquadPlayer | null;
  playerIn?: SquadPlayer | null;
  time: string;
  goalType?: string | null;
  shotOnTargetOutcome?: string | null;
  savedBy?: SquadPlayer | null;
  blockedBy?: SquadPlayer | null;
  shotOffTargetOutcome?: string | null;
  yellowCard?: boolean;
  redCard?: boolean;
};

export type FinishedMatchPayload = {
  matchId: string;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  events: MatchEvent[];
  finalTime: string;
  duration: number; // seconds
  status: string;
  endTime: Date;
};

type Props = {
  data: FinishedMatchPayload;
  onBack: () => void;
};

function getEventIcon(type: string) {
  switch (type) {
    case "goal":
      return Target;
    case "shot_on_goal":
      return Circle;
    case "off_target":
      return Circle;
    case "foul":
      return AlertCircle;
    case "substitution":
      return Users2;
    case "offside":
      return Flag;
    default:
      return Circle;
  }
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getWinnerBadge(
  teamA: string,
  teamB: string,
  scoreA: number,
  scoreB: number
) {
  if (scoreA > scoreB) return `${teamA} win`;
  if (scoreB > scoreA) return `${teamB} win`;
  return "Draw";
}

const MatchSummaryScreen: React.FC<Props> = ({ data, onBack }) => {
  const {
    teamA,
    teamB,
    scoreA,
    scoreB,
    events,
    finalTime,
    duration,
  } = data;

  const winnerBadge = getWinnerBadge(teamA, teamB, scoreA, scoreB);

  const totalGoalsTeam1 = events.filter(
    (e) => e.type === "goal" && e.team === 1
  ).length;
  const totalGoalsTeam2 = events.filter(
    (e) => e.type === "goal" && e.team === 2
  ).length;

  const totalShotsOnTargetTeam1 = events.filter(
    (e) => e.type === "shot_on_goal" && e.team === 1
  ).length;
  const totalShotsOnTargetTeam2 = events.filter(
    (e) => e.type === "shot_on_goal" && e.team === 2
  ).length;

  const totalFoulsTeam1 = events.filter(
    (e) => e.type === "foul" && e.team === 1
  ).length;
  const totalFoulsTeam2 = events.filter(
    (e) => e.type === "foul" && e.team === 2
  ).length;

  const totalCardsTeam1 = events.filter(
    (e) => e.team === 1 && (e.yellowCard || e.redCard)
  ).length;
  const totalCardsTeam2 = events.filter(
    (e) => e.team === 2 && (e.yellowCard || e.redCard)
  ).length;

  const sortedEvents = [...events].sort((a, b) => {
    const toSeconds = (t: string) => {
      const [m, s] = t.split(":").map((x) => parseInt(x, 10) || 0);
      return m * 60 + s;
    };
    return toSeconds(a.time) - toSeconds(b.time);
  });

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-900 px-4 pt-6 pb-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-800">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-semibold">Match Summary</h1>
      </div>

      <div className="px-4 pb-32 space-y-6">
        {/* Score Card */}
        <div className="bg-purple-600 rounded-2xl p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm bg-white/15 px-3 py-1 rounded-full flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              <span className="font-medium">{winnerBadge}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-purple-100">
              <Clock className="w-4 h-4" />
              <span>{finalTime} (FT)</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="flex-1 text-left">
              <div className="font-medium mb-1">{teamA}</div>
              <div className="text-4xl font-semibold">{scoreA}</div>
            </div>
            <div className="px-4 text-center">
              <div className="text-sm text-purple-100">Full Time</div>
              <div className="text-xs text-purple-200 mt-1">
                Duration: {formatDuration(duration)}
              </div>
            </div>
            <div className="flex-1 text-right">
              <div className="font-medium mb-1">{teamB}</div>
              <div className="text-4xl font-semibold">{scoreB}</div>
            </div>
          </div>
        </div>

        {/* Key Stats */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-100 mb-2">
            Key Match Stats
          </h2>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="w-24 text-slate-300">Goals</span>
              <div className="flex-1 flex items-center gap-2">
                <span className="w-6 text-right font-semibold">
                  {totalGoalsTeam1}
                </span>
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{
                      width:
                        totalGoalsTeam1 + totalGoalsTeam2 === 0
                          ? "0%"
                          : `${
                              (totalGoalsTeam1 /
                                (totalGoalsTeam1 + totalGoalsTeam2)) *
                              100
                            }%`,
                    }}
                  />
                </div>
                <span className="w-6 font-semibold">
                  {totalGoalsTeam2}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="w-24 text-slate-300">Shots on Target</span>
              <div className="flex-1 flex items-center gap-2">
                <span className="w-6 text-right font-semibold">
                  {totalShotsOnTargetTeam1}
                </span>
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{
                      width:
                        totalShotsOnTargetTeam1 + totalShotsOnTargetTeam2 ===
                        0
                          ? "0%"
                          : `${
                              (totalShotsOnTargetTeam1 /
                                (totalShotsOnTargetTeam1 +
                                  totalShotsOnTargetTeam2)) *
                              100
                            }%`,
                    }}
                  />
                </div>
                <span className="w-6 font-semibold">
                  {totalShotsOnTargetTeam2}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="w-24 text-slate-300">Fouls</span>
              <div className="flex-1 flex items-center gap-2">
                <span className="w-6 text-right font-semibold">
                  {totalFoulsTeam1}
                </span>
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500"
                    style={{
                      width:
                        totalFoulsTeam1 + totalFoulsTeam2 === 0
                          ? "0%"
                          : `${
                              (totalFoulsTeam1 /
                                (totalFoulsTeam1 + totalFoulsTeam2)) *
                              100
                            }%`,
                    }}
                  />
                </div>
                <span className="w-6 font-semibold">
                  {totalFoulsTeam2}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="w-24 text-slate-300">Cards</span>
              <div className="flex-1 flex items-center gap-2">
                <span className="w-6 text-right font-semibold">
                  {totalCardsTeam1}
                </span>
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500"
                    style={{
                      width:
                        totalCardsTeam1 + totalCardsTeam2 === 0
                          ? "0%"
                          : `${
                              (totalCardsTeam1 /
                                (totalCardsTeam1 + totalCardsTeam2)) *
                              100
                            }%`,
                    }}
                  />
                </div>
                <span className="w-6 font-semibold">
                  {totalCardsTeam2}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
          <h2 className="text-sm font-semibold text-slate-100 mb-3">
            Match Timeline
          </h2>

          {sortedEvents.length === 0 ? (
            <p className="text-xs text-slate-400">
              No match events recorded.
            </p>
          ) : (
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {sortedEvents.map((event) => {
                const Icon = getEventIcon(event.type);
                let label = event.type.replace(/_/g, " ").toUpperCase();

                const details: string[] = [];

                if (event.player) {
                  details.push(event.player.name);
                }

                if (event.goalType) {
                  details.push(`(${event.goalType})`);
                }

                if (event.assist) {
                  details.push(`Assist: ${event.assist.name}`);
                }

                if (event.type === "shot_on_goal") {
                  if (event.shotOnTargetOutcome && event.savedBy) {
                    details.push(
                      `${event.shotOnTargetOutcome} by ${event.savedBy.name}`
                    );
                  } else if (
                    event.shotOnTargetOutcome &&
                    event.blockedBy
                  ) {
                    details.push(
                      `${event.shotOnTargetOutcome} by ${event.blockedBy.name}`
                    );
                  }
                }

                if (event.type === "off_target" && event.shotOffTargetOutcome) {
                  details.push(event.shotOffTargetOutcome);
                }

                if (event.playerOut && event.playerIn) {
                  details.push(
                    `OUT: ${event.playerOut.name}, IN: ${event.playerIn.name}`
                  );
                }

                if (event.yellowCard) {
                  details.push("🟨 Yellow card");
                }
                if (event.redCard) {
                  details.push("🟥 Red card");
                }

                const detailText = details.join(" • ");

                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 text-xs bg-slate-800/60 rounded-xl px-3 py-2"
                  >
                    <div className="mt-1">
                      <Icon className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-0.5">
                        <span className="font-semibold text-slate-100">
                          {event.teamName}
                        </span>
                        <span className="text-slate-400 font-medium">
                          {event.time}
                        </span>
                      </div>
                      <div className="text-slate-300">{label}</div>
                      {detailText && (
                        <div className="text-slate-400 mt-0.5">
                          {detailText}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer actions (placeholder for future share/export) */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-slate-700 text-slate-100"
            onClick={onBack}
          >
            Back to Matches
          </Button>
          <Button className="flex-1 bg-purple-600 hover:bg-purple-700">
            Share Summary
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MatchSummaryScreen;
