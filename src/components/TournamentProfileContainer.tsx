// src/components/TournamentProfileContainer.tsx
// Tournament profile shell with tabs + inline "Create Fixture" for a tournament, aligned with VScor mobile shell.
// @ts-nocheck

import React, { useEffect, useState, FormEvent } from "react";
import {
  ArrowLeft,
  Trophy,
  Calendar,
  Flag,
  MapPin,
  Loader2,
  Plus,
  Clock,
  ListOrdered,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import {
  loadTournamentProfile,
  type TournamentProfileDTO,
  type TournamentFixtureRow,
  type TournamentStandingRow,
} from "../lib/loadTournamentProfile";
import StatsTab from "./StatsTab";
import Leaderboard from "./Leaderboard";
import { VSSection } from "./ui/vscor-ui";

type Props = {
  tournamentId: string;
  onBack: () => void;
  onMatchClick: (fixture: any) => void; // adapted in handleFixtureClick
  onPlayerClick?: (player: any) => void;
  onTeamClick?: (team: any) => void;
};

type TeamOption = {
  id: string;
  name: string;
};

type Tab = "overview" | "table" | "fixtures" | "stats";

const TournamentProfileContainer: React.FC<Props> = ({
  tournamentId,
  onBack,
  onMatchClick,
  onPlayerClick,
  onTeamClick,
}) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<TournamentProfileDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>("fixtures");
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Teams for fixture creation
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

  // Create fixture form state
  const [showCreateFixture, setShowCreateFixture] = useState(false);
  const [creatingFixture, setCreatingFixture] = useState(false);
  const [fixtureError, setFixtureError] = useState<string | null>(null);

  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [roundName, setRoundName] = useState("");
  const [kickoffAt, setKickoffAt] = useState(""); // datetime-local
  const [venue, setVenue] = useState("");

  // Inline edit fixture state
  const [editingFixtureId, setEditingFixtureId] = useState<
    string | number | null
  >(null);
  const [editRoundName, setEditRoundName] = useState("");
  const [editKickoffAt, setEditKickoffAt] = useState(""); // datetime-local
  const [editVenue, setEditVenue] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editingFixtureSaving, setEditingFixtureSaving] = useState(false);

  // Load tournament profile
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const dto = await loadTournamentProfile(tournamentId);
        if (!cancelled) {
          setProfile(dto);
        }
      } catch (e: any) {
        console.error("[TournamentProfileContainer] load error:", e);
        if (!cancelled) {
          setError("Could not load tournament details.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tournamentId]);

  // Load teams list (for fixture creation)
  useEffect(() => {
    let cancelled = false;

    async function loadTeams() {
      setTeamsLoading(true);
      try {
        const { data, error: teamError } = await supabase
          .from("teams")
          .select("id, name")
          .order("name", { ascending: true });

        if (teamError) {
          console.error(
            "[TournamentProfileContainer] teams load error:",
            teamError
          );
          return;
        }

        if (!cancelled && data) {
          const options: TeamOption[] = data.map((t: any) => ({
            id: t.id,
            name: t.name,
          }));
          setTeams(options);
        }
      } catch (e) {
        console.error("[TournamentProfileContainer] unexpected teams error:", e);
      } finally {
        if (!cancelled) {
          setTeamsLoading(false);
        }
      }
    }

    loadTeams();
    return () => {
      cancelled = true;
    };
  }, []);

  const resetFixtureForm = () => {
    setHomeTeamId("");
    setAwayTeamId("");
    setRoundName("");
    setKickoffAt("");
    setVenue("");
    setFixtureError(null);
  };

  const handleStartEditFixture = (fixture: TournamentFixtureRow) => {
    setEditingFixtureId(fixture.id);
    setEditRoundName((fixture as any).roundName || "");

    // Convert ISO string → datetime-local format
    if ((fixture as any).kickoffAt) {
      try {
        const iso = (fixture as any).kickoffAt as string;
        const d = new Date(iso);
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setEditKickoffAt(local);
      } catch {
        setEditKickoffAt("");
      }
    } else {
      setEditKickoffAt("");
    }

    setEditVenue((fixture as any).venue || "");
    setEditError(null);
  };

  const handleCancelEditFixture = () => {
    setEditingFixtureId(null);
    setEditRoundName("");
    setEditKickoffAt("");
    setEditVenue("");
    setEditError(null);
    setEditingFixtureSaving(false);
  };

  const handleSaveFixtureEdit = async () => {
    if (!editingFixtureId) return;
    setEditingFixtureSaving(true);
    setEditError(null);

    try {
      const updatePayload: any = {
        round_name: editRoundName || null,
        kickoff_at: editKickoffAt ? new Date(editKickoffAt).toISOString() : null,
        venue: editVenue || null,
      };

      const { error: updateError } = await supabase
        .from("tournament_fixtures")
        .update(updatePayload)
        .eq("id", editingFixtureId);

      if (updateError) {
        console.error(
          "[TournamentProfileContainer] update fixture error:",
          updateError
        );
        setEditError(updateError.message || "Could not update fixture.");
        return;
      }

      // Update local state so UI reflects the change immediately
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              fixtures: (prev.fixtures || []).map((fx: any) =>
                fx.id === editingFixtureId
                  ? {
                      ...fx,
                      roundName: editRoundName || fx.roundName,
                      kickoffAt: editKickoffAt
                        ? new Date(editKickoffAt).toISOString()
                        : fx.kickoffAt,
                      venue: editVenue || fx.venue,
                    }
                  : fx
              ),
            }
          : prev
      );

      handleCancelEditFixture();
    } catch (e: any) {
      console.error(
        "[TournamentProfileContainer] unexpected update fixture error:",
        e
      );
      setEditError(e?.message || "Unexpected error while updating fixture.");
    } finally {
      setEditingFixtureSaving(false);
    }
  };

  const handleCreateFixture = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFixtureError(null);

    if (!homeTeamId || !awayTeamId) {
      setFixtureError("Select both Home and Away teams.");
      return;
    }
    if (homeTeamId === awayTeamId) {
      setFixtureError("Home and Away teams must be different.");
      return;
    }

    setCreatingFixture(true);

    try {
      const insertPayload: any = {
        tournament_id: tournamentId,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        round_name: roundName || null,
        matchday: null,
        kickoff_at: kickoffAt ? new Date(kickoffAt).toISOString() : null,
        venue: venue || null,
        status: "scheduled",
        home_score: null,
        away_score: null,
        home_pen_score: null,
        away_pen_score: null,
      };

      const { data, error: insertError } = await supabase
        .from("tournament_fixtures")
        .insert(insertPayload)
        .select(
          `
          id,
          match_id,
          round_name,
          matchday,
          kickoff_at,
          venue,
          status,
          home_team_id,
          away_team_id,
          home_score,
          away_score,
          home_pen_score,
          away_pen_score
        `
        )
        .maybeSingle();

      if (insertError) {
        console.error(
          "[TournamentProfileContainer] create fixture error:",
          insertError
        );
        setFixtureError(insertError.message || "Could not create fixture.");
        return;
      }

      if (!data) {
        setFixtureError("No data returned from create fixture.");
        return;
      }

      // Map DB row to TournamentFixtureRow
      const getTeamName = (id: string | null | undefined): string => {
        if (!id) return "Unknown Team";
        const found = teams.find((t) => t.id === id);
        return found?.name || `Team ${String(id).slice(0, 4)}`;
      };

      const newFixture: TournamentFixtureRow = {
        id: data.id,
        matchId: data.match_id ?? null,
        roundName: data.round_name,
        matchday: data.matchday,
        kickoffAt: data.kickoff_at,
        venue: data.venue,
        status: data.status,
        homeTeamId: data.home_team_id,
        homeTeamName: getTeamName(data.home_team_id),
        homeTeamLogoUrl: null,
        awayTeamId: data.away_team_id,
        awayTeamName: getTeamName(data.away_team_id),
        awayTeamLogoUrl: null,
        homeScore: data.home_score,
        awayScore: data.away_score,
        homePenScore: data.home_pen_score,
        awayPenScore: data.away_pen_score,
      };

      // Push to state (top of fixtures list)
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              fixtures: [newFixture, ...(prev.fixtures || [])],
            }
          : prev
      );

      resetFixtureForm();
      setShowCreateFixture(false);
    } catch (e: any) {
      console.error(
        "[TournamentProfileContainer] unexpected create fixture error:",
        e
      );
      setFixtureError("Unexpected error while creating fixture.");
    } finally {
      setCreatingFixture(false);
    }
  };

  const handleFixtureClick = (f: TournamentFixtureRow) => {
    // Adapt to the shape App.tsx expects in handleTournamentMatchClick
    onMatchClick({
      id: f.id,
      matchId: f.matchId,
      teamA: f.homeTeamName,
      teamB: f.awayTeamName,
      venue: f.venue,
      kickoffAt: f.kickoffAt,
    });
  };

  // ---------------------------
  // Header & Tabs (light theme with card navigation)
  // ---------------------------
  const renderHeader = () => {
    const t = profile?.tournament;
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-5 mb-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <Trophy className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-purple-600 font-bold mb-1">
              Tournament
            </p>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              {t?.name || "Tournament"}
            </h1>
            <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
              {t?.season && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {t.season}
                </span>
              )}
              {t?.country && (
                <span className="flex items-center gap-1.5">
                  <Flag className="w-4 h-4" />
                  {t.country}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTabs = () => (
    <div className="grid grid-cols-4 gap-3 mb-5">
      {[
        { id: "overview", label: "Overview", icon: "📋" },
        { id: "table", label: "Table", icon: "📊" },
        { id: "fixtures", label: "Fixtures", icon: "⚽" },
        { id: "stats", label: "Stats", icon: "📈" },
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id as Tab)}
          className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${
            activeTab === tab.id
              ? "bg-gradient-to-br from-purple-600 to-purple-700 text-white border-purple-500 shadow-lg shadow-purple-500/25"
              : "bg-white text-slate-700 border-slate-200 hover:border-purple-200 hover:bg-purple-50 shadow-sm"
          }`}
        >
          <span className="text-xl mb-1">{tab.icon}</span>
          <span className="text-xs font-semibold">{tab.label}</span>
        </button>
      ))}
    </div>
  );

  // ---------------------------
  // Overview
  // ---------------------------
  const renderOverview = () => {
    const t = profile?.tournament;
    const info = profile?.info;

    const subtitleParts: string[] = [];
    if (t?.season) subtitleParts.push(`Season ${t.season}`);
    if (t?.country) subtitleParts.push(t.country);
    const subtitle =
      subtitleParts.length > 0
        ? subtitleParts.join(" · ")
        : "Tournament overview";

    return (
      <VSSection title="Overview" subtitle={subtitle}>
        {info?.description ? (
          <p className="text-sm leading-relaxed text-slate-700">
            {info.description}
          </p>
        ) : (
          <p className="text-sm text-slate-500">
            No description yet. Add rules and description later from admin
            console.
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500 font-medium mb-1">Dates</p>
            <p className="text-sm font-semibold text-slate-900">
              {t?.startDate
                ? new Date(t.startDate).toLocaleDateString()
                : "TBD"}{" "}
              —{" "}
              {t?.endDate
                ? new Date(t.endDate).toLocaleDateString()
                : "TBD"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500 font-medium mb-1">Venue</p>
            <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-slate-500" />
              {t?.venue || "Not set"}
            </p>
          </div>
        </div>

        {info && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 mt-4">
            <p className="text-xs text-slate-500 font-medium mb-1">Points System</p>
            <p className="text-sm font-semibold text-slate-900">
              Win: {info.pointsForWin} • Draw: {info.pointsForDraw} • Loss:{" "}
              {info.pointsForLoss}
            </p>
          </div>
        )}
      </VSSection>
    );
  };

  // ---------------------------
  // Table
  // ---------------------------
  const renderTable = () => {
    const rows: TournamentStandingRow[] = profile?.table ?? [];

    if (!rows.length) {
      return (
        <VSSection
          title="Points Table"
          subtitle="Standings will update when finished fixtures are recorded."
        >
          <p className="text-sm text-slate-500">
            No standings yet. Table updates automatically when finished
            fixtures are recorded.
          </p>
        </VSSection>
      );
    }

    return (
      <VSSection
        title="Points Table"
        subtitle="Based on completed matches"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center gap-2 text-sm text-slate-500 font-medium">
            <ListOrdered className="w-4 h-4" />
            Standings
          </span>
        </div>
        <div className="divide-y divide-slate-100">
          {rows.map((row) => (
            <div
              key={row.teamId}
              className="py-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                  {row.position}
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  {row.teamName}
                </span>
              </div>
              <div className="text-right text-sm text-slate-500">
                <div>
                  {row.played} • {row.won}-{row.drawn}-{row.lost}
                </div>
                <div>
                  {row.goalDiff >= 0 ? "+" : ""}
                  {row.goalDiff} •{" "}
                  <span className="font-bold text-purple-600">
                    {row.points} pts
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </VSSection>
    );
  };

  // ---------------------------
  // Fixture creation UI (light theme)
  // ---------------------------
  const renderCreateFixture = () => {
    if (!showCreateFixture) {
      return (
        <button
          onClick={() => setShowCreateFixture(true)}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-purple-300 bg-purple-50 py-4 text-sm font-semibold text-purple-700 hover:bg-purple-100 active:bg-purple-200 transition"
        >
          <Plus className="w-5 h-5" />
          <span>Create Fixture</span>
        </button>
      );
    }

    return (
      <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-base font-bold text-slate-900">
            New Fixture
          </p>
          <button
            type="button"
            onClick={() => {
              resetFixtureForm();
              setShowCreateFixture(false);
            }}
            className="text-sm text-slate-500 hover:text-slate-700 font-medium"
          >
            Cancel
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleCreateFixture}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">
                Home Team *
              </label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-purple-500"
                value={homeTeamId}
                onChange={(e) => setHomeTeamId(e.target.value)}
                disabled={teamsLoading}
              >
                <option value="">Select team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">
                Away Team *
              </label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-purple-500"
                value={awayTeamId}
                onChange={(e) => setAwayTeamId(e.target.value)}
                disabled={teamsLoading}
              >
                <option value="">Select team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">
              Round (optional)
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-purple-500"
              value={roundName}
              onChange={(e) => setRoundName(e.target.value)}
              placeholder="Group A, Matchday 1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">
                Kickoff
              </label>
              <input
                type="datetime-local"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-purple-500"
                value={kickoffAt}
                onChange={(e) => setKickoffAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">
                Venue
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-purple-500"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Main Stadium"
              />
            </div>
          </div>

          {fixtureError && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {fixtureError}
            </p>
          )}

          <button
            type="submit"
            disabled={creatingFixture}
            className="w-full rounded-2xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 px-4 py-4 text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25"
          >
            {creatingFixture && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            <span>Create Fixture</span>
          </button>
        </form>
      </div>
    );
  };

  // ---------------------------
  // Fixtures list
  // ---------------------------
  const renderFixtures = () => {
    const fixtures: TournamentFixtureRow[] = profile?.fixtures ?? [];

    if (loading && !profile) {
      return (
        <VSSection title="Fixtures">
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
          </div>
        </VSSection>
      );
    }

    if (!fixtures.length) {
      return (
        <>
          <VSSection
            title="Fixtures"
            subtitle="Create and manage matches for this tournament."
          >
            {renderCreateFixture()}
          </VSSection>
          <VSSection title="No fixtures yet">
            <p className="text-[12px] text-slate-400">
              No fixtures yet. Create your first fixture for this tournament
              to start building your schedule.
            </p>
          </VSSection>
        </>
      );
    }

    return (
      <>
        <VSSection
          title="Fixtures"
          subtitle="Tap a fixture to go to squad & live scoring."
        >
          {renderCreateFixture()}
        </VSSection>

        <VSSection title="All fixtures">
          <div className="space-y-2">
            {fixtures.map((f) => {
              const dateLabel = f.kickoffAt
                ? new Date(f.kickoffAt).toLocaleString()
                : "TBD";

              const scoreLabel =
                typeof f.homeScore === "number" &&
                typeof f.awayScore === "number"
                  ? `${f.homeScore} - ${f.awayScore}`
                  : "vs";

              const isEditing = editingFixtureId === f.id;

              return (
                <div key={f.id} className="space-y-2">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleFixtureClick(f)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleFixtureClick(f);
                      }
                    }}
                    className="w-full text-left rounded-2xl bg-white border border-slate-200 px-4 py-4 flex items-center justify-between active:scale-[0.99] transition-transform cursor-pointer hover:border-purple-200 hover:shadow-md"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {f.homeTeamName} vs {f.awayTeamName}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{dateLabel}</span>
                        {f.venue && (
                          <>
                            <span className="mx-1 text-slate-300">•</span>
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{f.venue}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-slate-900">
                        {scoreLabel}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-wide text-slate-500 font-semibold">
                        {f.status || "SCHEDULED"}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEditFixture(f);
                        }}
                        className="mt-2 inline-flex items-center text-xs font-semibold text-purple-600 hover:text-purple-700 hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="rounded-2xl border border-purple-200 bg-purple-50 px-4 py-4 space-y-3">
                      {editError && (
                        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                          {editError}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">
                            Round
                          </label>
                          <input
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-purple-500"
                            value={editRoundName}
                            onChange={(e) =>
                              setEditRoundName(e.target.value)
                            }
                            placeholder="Matchday / Round"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">
                            Kickoff
                          </label>
                          <input
                            type="datetime-local"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-purple-500"
                            value={editKickoffAt}
                            onChange={(e) =>
                              setEditKickoffAt(e.target.value)
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">
                          Venue
                        </label>
                        <input
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-purple-500"
                          value={editVenue}
                          onChange={(e) => setEditVenue(e.target.value)}
                          placeholder="Ground / Stadium"
                        />
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleCancelEditFixture}
                          className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveFixtureEdit}
                          disabled={editingFixtureSaving}
                          className="px-4 py-2 rounded-xl bg-purple-600 text-sm font-bold text-white disabled:opacity-60 hover:bg-purple-700"
                        >
                          {editingFixtureSaving ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </VSSection>
      </>
    );
  };

  // ---------------------------
  // Stats
  // ---------------------------
  const renderStats = () => {
    if (!profile) {
      return (
        <VSSection title="Stats">
          <p className="text-sm text-slate-500">Loading stats…</p>
        </VSSection>
      );
    }

    if (
      !profile.stats &&
      (!profile.topScorers || profile.topScorers.length === 0) &&
      (!profile.table || profile.table.length === 0)
    ) {
      return (
        <VSSection
          title="Stats"
          subtitle="Stats will appear when matches and events are recorded."
        >
          <p className="text-sm text-slate-500">
            No stats yet. Stats will appear once matches and events are
            recorded.
          </p>
        </VSSection>
      );
    }

    if (showLeaderboard) {
      const players =
        profile.topScorers?.map((p) => ({
          id: p.playerId,
          name: p.playerName,
          team: p.teamName,
          goals: p.goals,
          assists: p.assists,
          matches: p.matchesPlayed,
          rating: null as number | null,
        })) ?? [];

      const teams =
        profile.table?.map((t) => ({
          id: t.teamId,
          name: t.teamName,
          matches: t.played,
          wins: t.won,
          draws: t.drawn,
          losses: t.lost,
          points: t.points,
          gf: t.goalsFor,
          ga: t.goalsAgainst,
        })) ?? [];

      return (
        <Leaderboard
          players={players}
          teams={teams}
          onBack={() => setShowLeaderboard(false)}
          onPlayerClick={(player) => {
            if (onPlayerClick) onPlayerClick(player);
          }}
          onTeamClick={(team) => {
            if (onTeamClick) onTeamClick(team);
          }}
        />
      );
    }

    return (
      <StatsTab
        stats={profile.stats}
        topScorers={profile.topScorers}
        standings={profile.table}
        onPlayerClick={(player) => {
          if (onPlayerClick) onPlayerClick(player);
        }}
        onTeamClick={(team) => {
          if (onTeamClick) onTeamClick(team);
        }}
        onTournamentClick={() => {
          // Already on this tournament – later can navigate to global stats if needed
        }}
        onLeaderboard={() => setShowLeaderboard(true)}
        onPointsTable={() => setActiveTab("table")}
        onPlayerComparison={() => {
          alert("Player comparison coming soon.");
        }}
        onTeamComparison={() => {
          alert("Team comparison coming soon.");
        }}
      />
    );
  };

  // ---------------------------
  // Loading / error wrappers
  // ---------------------------
  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
        <p className="text-sm font-semibold text-slate-50 mb-2">
          {error}
        </p>
        <button
          onClick={onBack}
          className="mt-1 px-4 py-2 rounded-full bg-purple-600 text-white text-xs font-semibold hover:bg-purple-500 active:bg-purple-700 transition"
        >
          Back to Tournaments
        </button>
      </div>
    );
  }

  return (
    <div className="pb-4">
      {renderHeader()}
      {renderTabs()}
      <div className="px-1 pt-2 space-y-4">
        {activeTab === "overview" && renderOverview()}
        {activeTab === "table" && renderTable()}
        {activeTab === "fixtures" && renderFixtures()}
        {activeTab === "stats" && renderStats()}
      </div>
    </div>
  );
};

export default TournamentProfileContainer;
