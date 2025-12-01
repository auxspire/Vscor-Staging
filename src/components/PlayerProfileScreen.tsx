// src/components/PlayerProfileScreen.tsx
import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Target,
  Clock,
  User,
  Trophy,
  TrendingUp,
  Calendar,
  MapPin,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Progress } from "./ui/progress";
import {
  loadPlayerProfile,
  type PlayerProfileDTO,
} from "../lib/profiles";

type PlayerNavPayload = {
  id?: string | number;
  name?: string;
  teamName?: string | null;
  tournamentId?: string | number;
};

type PlayerProfileScreenProps = {
  player?: PlayerNavPayload;
  onBack: () => void;
  onTeamClick?: (teamId: string | number) => void;
  onMatchClick?: (matchId: string | number) => void;
};

const PlayerProfileScreen: React.FC<PlayerProfileScreenProps> = ({
  player,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "stats" | "matches">(
    "overview"
  );
  const [profile, setProfile] = useState<PlayerProfileDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!player?.id) {
        setProfile(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const dto = await loadPlayerProfile(player.id, {
          tournamentId: player.tournamentId,
        });
        setProfile(dto);
      } catch (err) {
        console.error("[PlayerProfile] load error", err);
        setError("Could not load player profile.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [player?.id, player?.tournamentId]);

  const p = profile?.player ?? {};
  const tp = profile?.tournamentPlayer ?? null;
  const totals = profile?.totals;

  const displayName =
    p.full_name ?? p.name ?? player?.name ?? "Player";
  const teamName =
    player?.teamName ?? tp?.team_name ?? "Team";
  const primaryPosition = tp?.position ?? p.position ?? "—";
  const jerseyNumber =
    tp?.jersey_number ?? p.jersey_number ?? "—";

  const matchesPlayed = totals?.matches ?? 0;
  const goals = totals?.goals ?? 0;
  const yellowCards = totals?.yellowCards ?? 0;
  const redCards = totals?.redCards ?? 0;

  // A simple “recent form” proxy based on goals per match
  const formScore =
    matchesPlayed > 0 ? Math.min((goals / matchesPlayed) * 10, 10) : 0;

  const performanceMetrics = [
    {
      label: "Goals",
      value: goals,
      max: Math.max(5, goals || 5),
    },
    {
      label: "Matches",
      value: matchesPlayed,
      max: Math.max(5, matchesPlayed || 5),
    },
    {
      label: "Form",
      value: formScore,
      max: 10,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={onBack} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-medium text-slate-900">Player Profile</h1>
        <div className="w-10" />
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4 pb-24">
        {/* Loading / Error */}
        {loading && (
          <Card>
            <CardContent className="py-6 text-sm text-slate-500">
              Loading player profile…
            </CardContent>
          </Card>
        )}
        {error && (
          <Card>
            <CardContent className="py-6 text-sm text-red-600">
              {error}
            </CardContent>
          </Card>
        )}

        {/* Top Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center">
                <User className="w-7 h-7 text-slate-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-slate-900">
                    {displayName}
                  </h2>
                  <Badge variant="secondary" className="text-xs">
                    #{jerseyNumber}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {teamName}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    {primaryPosition}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <div className="text-xs text-slate-500">Matches</div>
                <div className="text-lg font-semibold text-slate-900">
                  {matchesPlayed}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Goals</div>
                <div className="text-lg font-semibold text-slate-900">
                  {goals}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Yellow</div>
                <div className="text-lg font-semibold text-amber-600">
                  {yellowCards}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Red</div>
                <div className="text-lg font-semibold text-red-600">
                  {redCards}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tabs */}
       <Tabs
  value={activeTab}
  onValueChange={(v: "overview" | "stats" | "matches") => {
    setActiveTab(v);
  }}
>
          <TabsList className="grid grid-cols-3 w-full mb-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="matches">Matches</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Current Form
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {performanceMetrics.map((metric) => (
                  <div key={metric.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>{metric.label}</span>
                      <span className="font-medium">
                        {metric.value}
                        {metric.label === "Form" ? "/10" : ""}
                      </span>
                    </div>
                    <Progress
                      value={
                        metric.max > 0
                          ? (metric.value / metric.max) * 100
                          : 0
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Basic Info
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                <div className="space-y-1">
                  <div className="font-medium text-slate-800">Team</div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{teamName}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium text-slate-800">Position</div>
                  <div>{primaryPosition}</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stats */}
          <TabsContent value="stats" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Season Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-slate-500">Matches</div>
                  <div className="text-lg font-semibold text-slate-900">
                    {matchesPlayed}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Goals</div>
                  <div className="text-lg font-semibold text-slate-900">
                    {goals}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Yellow Cards</div>
                  <div className="text-lg font-semibold text-amber-600">
                    {yellowCards}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Red Cards</div>
                  <div className="text-lg font-semibold text-red-600">
                    {redCards}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Matches */}
          <TabsContent value="matches" className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Recent Matches
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {profile?.matches && profile.matches.length > 0 ? (
                  profile.matches.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between border-b last:border-b-0 pb-2 last:pb-0"
                    >
                      <div>
                        <div className="font-medium text-slate-900">
                          {m.teamName} vs {m.opponentName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span>{m.scoreText}</span>
                          {m.resultText && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1 py-0"
                            >
                              {m.resultText}
                            </Badge>
                          )}
                          <span>
                            {m.goals > 0
                              ? `Goals: ${m.goals}`
                              : "No goals"}
                          </span>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {m.date
                          ? new Date(m.date).toLocaleDateString()
                          : ""}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500">
                    No recorded matches yet for this player.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PlayerProfileScreen;
