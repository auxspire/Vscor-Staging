// src/components/TeamProfileScreen.tsx
import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Users,
  Trophy,
  Target,
  Calendar,
  MapPin,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Progress } from "./ui/progress";
import {
  loadTeamProfile,
  type TeamProfileDTO,
  type TeamSquadPlayer,
  type TeamMatchRow,
} from "../lib/profiles";

type TeamProfileInput = {
  id?: string | number;
  name?: string;
  tournamentId?: string | number;
};

type TeamClickPlayerPayload = {
  id: string;
  name: string;
};

type TeamProfileScreenProps = {
  team?: TeamProfileInput;
  onBack: () => void;
  onPlayerClick?: (player: TeamClickPlayerPayload) => void;
  onMatchClick?: (match: TeamMatchRow) => void;
};

type TeamProfileTab = "overview" | "squad" | "matches";

const TeamProfileScreen: React.FC<TeamProfileScreenProps> = ({
  team,
  onBack,
  onPlayerClick,
  onMatchClick,
}) => {
  const [activeTab, setActiveTab] =
    useState<TeamProfileTab>("overview");
  const [profile, setProfile] = useState<TeamProfileDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!team?.id) {
        setProfile(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const dto = await loadTeamProfile(team.id, {
          tournamentId: team.tournamentId,
        });
        setProfile(dto);
      } catch (err) {
        console.error("[TeamProfile] load error", err);
        setError("Could not load team profile.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [team?.id, team?.tournamentId]);

  const t = profile?.team ?? {};
  const st = profile?.standings;
  const squad: TeamSquadPlayer[] = profile?.squad ?? [];
  const matches: TeamMatchRow[] = profile?.matches ?? [];

  const teamName = t.name ?? team?.name ?? "Team";
  const country = t.country ?? t.location ?? "Unknown";
  const venue = t.home_ground ?? t.venue ?? "—";

  const played = st?.played ?? matches.length;
  const wins = st?.won ?? 0;
  const draws = st?.drawn ?? 0;
  const losses = st?.lost ?? 0;
  const goalsFor = st?.goalsFor ?? 0;
  const goalsAgainst = st?.goalsAgainst ?? 0;
  const goalDiff = st?.goalDiff ?? goalsFor - goalsAgainst;
  const points = st?.points ?? wins * 3 + draws;

  const formScore =
    played > 0 ? Math.min(((wins * 3 + draws) / (played * 3)) * 100, 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={onBack} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-medium text-slate-900">Team Profile</h1>
        <div className="w-10" />
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4 pb-24">
        {/* Loading / Error */}
        {loading && (
          <Card>
            <CardContent className="py-6 text-sm text-slate-500">
              Loading team profile…
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

        {/* Top summary */}
        <Card>
          <CardHeader className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center">
                <Users className="w-7 h-7 text-slate-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-slate-900">
                    {teamName}
                  </h2>
                  <Badge variant="secondary" className="text-xs">
                    {t.short_name ?? t.code ?? "TEAM"}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {country}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Venue: {venue}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-[11px] text-slate-500">Played</div>
                <div className="text-lg font-semibold text-slate-900">
                  {played}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Points</div>
                <div className="text-lg font-semibold text-slate-900">
                  {points}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Goal Diff</div>
                <div className="text-lg font-semibold text-slate-900">
                  {goalDiff}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tabs */}
     <Tabs
  value={activeTab}
  onValueChange={(v: TeamProfileTab) => {
    setActiveTab(v);
  }}
>

          <TabsList className="grid grid-cols-3 w-full mb-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="squad">Squad</TabsTrigger>
            <TabsTrigger value="matches">Matches</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>League Form</span>
                    <span className="font-medium">
                      {wins}W {draws}D {losses}L
                    </span>
                  </div>
                  <Progress value={formScore} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-[11px] text-slate-500">
                      Goals For
                    </div>
                    <div className="text-lg font-semibold text-slate-900">
                      {goalsFor}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">
                      Goals Against
                    </div>
                    <div className="text-lg font-semibold text-slate-900">
                      {goalsAgainst}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">
                      Clean Sheets
                    </div>
                    <div className="text-lg font-semibold text-slate-900">
                      {/* We don't have this yet; could compute later */}
                      —
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Squad */}
          <TabsContent value="squad" className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Squad
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {squad.length === 0 && (
                  <div className="text-slate-500">
                    No registered players for this tournament yet.
                  </div>
                )}
                {squad.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      onPlayerClick &&
                      onPlayerClick({
                        id: p.id,
                        name: p.name,
                      })
                    }
                    className="w-full flex items-center justify-between py-2 border-b last:border-b-0 text-left hover:bg-slate-50 rounded-lg px-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold">
                        {p.jerseyNumber ?? "-"}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {p.position ?? "—"}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Matches */}
          <TabsContent value="matches" className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Recent Matches
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {matches.length === 0 && (
                  <div className="text-slate-500">
                    No recorded matches yet for this team.
                  </div>
                )}
                {matches.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() =>
                      onMatchClick && onMatchClick(m)
                    }
                    className="w-full flex items-center justify-between py-2 border-b last:border-b-0 text-left hover:bg-slate-50 rounded-lg px-2"
                  >
                    <div>
                      <div className="font-medium text-slate-900">
                        {m.isHome ? teamName : m.opponentName} vs{" "}
                        {m.isHome ? m.opponentName : teamName}
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
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {m.date
                        ? new Date(m.date).toLocaleDateString()
                        : ""}
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TeamProfileScreen;
