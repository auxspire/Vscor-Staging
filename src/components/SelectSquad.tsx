// src/components/SelectSquad.tsx
import React, { useState } from "react";
import { ArrowLeft, Plus, Check } from "lucide-react";
import { Button } from "./ui/button";
import AddPlayer, { VscorPlayer } from "./AddPlayer";
import { saveLineupsForMatch } from "../lib/matches";

type MatchLike = {
  id?: string | number; // will come from Supabase matches row via App
  team1: string;
  team2: string;
  playersPerTeam: number | string;
  // Optional full roster fields injected from App.tsx (tournament flow)
  team1FullRoster?: VscorPlayer[];
  team2FullRoster?: VscorPlayer[];
  [key: string]: any;
};

type RegisteredTeamPlayer = {
  id: string | number;
  name: string;
  jerseyNumber?: string | number;
  position?: string;
};

type RegisteredTeam = {
  id: string | number;
  name: string;
  players?: RegisteredTeamPlayer[];
};

type SelectSquadProps = {
  match: MatchLike;
  onBack: () => void;
  onStartMatch: (matchWithSquads: any) => void;
  registeredTeams?: RegisteredTeam[];
  playerDatabase?: VscorPlayer[];
};

const SelectSquad: React.FC<SelectSquadProps> = ({
  match,
  onBack,
  onStartMatch,
  registeredTeams = [],
  playerDatabase = [],
}) => {
  const [team1Squad, setTeam1Squad] = useState<VscorPlayer[]>([]);
  const [team2Squad, setTeam2Squad] = useState<VscorPlayer[]>([]);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [addingToTeam, setAddingToTeam] = useState<1 | 2 | null>(null);
  const [customPlayers, setCustomPlayers] = useState<{
    team1: VscorPlayer[];
    team2: VscorPlayer[];
  }>({ team1: [], team2: [] });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const playersPerTeam = parseInt(String(match.playersPerTeam), 10) || 11;
const minPlayersPerTeam =  playersPerTeam > 7 ? 7 : playersPerTeam;
  // ------------------------------------------------------------------
  // ROSTER SOURCES
  // ------------------------------------------------------------------

  // Full roster coming from App.tsx (tournament flow)
  const matchTeam1Roster: VscorPlayer[] =
    (match.team1FullRoster as VscorPlayer[] | undefined) ?? [];
  const matchTeam2Roster: VscorPlayer[] =
    (match.team2FullRoster as VscorPlayer[] | undefined) ?? [];

  // --- Find team records from registeredTeams (for adhoc/manual flow) ---
  const team1Data = registeredTeams.find((t) => t.name === match.team1);
  const team2Data = registeredTeams.find((t) => t.name === match.team2);

  // --- Unassigned players from DB (can be used by any team for this MVP) ---
  const unassignedPlayers: VscorPlayer[] = playerDatabase
    .filter((p) => !p.teamId || p.teamId === null)
    .map((p) => ({
      ...p,
      synced: p.synced ?? false,
    }));

  // --- DB players assigned to specific teams ---
  const team1AssignedPlayers: VscorPlayer[] = team1Data?.id
    ? playerDatabase
        .filter((p) => p.teamId === team1Data.id)
        .map((p) => ({
          ...p,
          synced: p.synced ?? false,
        }))
    : [];

  const team2AssignedPlayers: VscorPlayer[] = team2Data?.id
    ? playerDatabase
        .filter((p) => p.teamId === team2Data.id)
        .map((p) => ({
          ...p,
          synced: p.synced ?? false,
        }))
    : [];

  // ------------------------------------------------------------------
  // FINAL AVAILABLE PLAYERS PER TEAM
  // ------------------------------------------------------------------
  // Priority:
  // 1) If match.team1FullRoster / match.team2FullRoster exists → use that
  // 2) Else fall back to: assigned + unassigned + custom
  const baseTeam1Players: VscorPlayer[] =
    matchTeam1Roster.length > 0
      ? matchTeam1Roster
      : [...team1AssignedPlayers, ...unassignedPlayers];

  const baseTeam2Players: VscorPlayer[] =
    matchTeam2Roster.length > 0
      ? matchTeam2Roster
      : [...team2AssignedPlayers, ...unassignedPlayers];

  const team1Players: VscorPlayer[] = [
    ...baseTeam1Players,
    ...customPlayers.team1,
  ];

  const team2Players: VscorPlayer[] = [
    ...baseTeam2Players,
    ...customPlayers.team2,
  ];

  // ------------------------------------------------------------------
  // Selection helpers
  // ------------------------------------------------------------------
  const togglePlayer = (team: 1 | 2, player: VscorPlayer) => {
    if (team === 1) {
      const isSelected = team1Squad.some((p) => p.id === player.id);
      if (isSelected) {
        setTeam1Squad((prev) => prev.filter((p) => p.id !== player.id));
      } else if (team1Squad.length < playersPerTeam) {
        setTeam1Squad((prev) => [...prev, player]);
      }
    } else {
      const isSelected = team2Squad.some((p) => p.id === player.id);
      if (isSelected) {
        setTeam2Squad((prev) => prev.filter((p) => p.id !== player.id));
      } else if (team2Squad.length < playersPerTeam) {
        setTeam2Squad((prev) => [...prev, player]);
      }
    }
  };

  const isPlayerSelected = (team: 1 | 2, playerId: VscorPlayer["id"]) => {
    return team === 1
      ? team1Squad.some((p) => p.id === playerId)
      : team2Squad.some((p) => p.id === playerId);
  };

  // ------------------------------------------------------------------
  // AddPlayer sub-view
  // ------------------------------------------------------------------
  const handleAddPlayerBack = () => {
    setShowAddPlayer(false);
    setAddingToTeam(null);
  };

  const handlePlayerCreated = (playerData: VscorPlayer) => {
    const uniqueId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;

    const playerWithId: VscorPlayer = {
      ...playerData,
      id: playerData.id ?? uniqueId,
      synced: playerData.synced ?? false,
    };

    if (addingToTeam === 1) {
      setCustomPlayers((prev) => ({
        ...prev,
        team1: [...prev.team1, playerWithId],
      }));
    } else if (addingToTeam === 2) {
      setCustomPlayers((prev) => ({
        ...prev,
        team2: [...prev.team2, playerWithId],
      }));
    }
  };

  // ------------------------------------------------------------------
  // Start Match
  // ------------------------------------------------------------------
  const handleStartMatch = async () => {
      const isTeam1Ok = team1Squad.length >= minPlayersPerTeam;
  const isTeam2Ok = team2Squad.length >= minPlayersPerTeam;
    if (!isTeam1Ok || !isTeam2Ok) {
      // Button is disabled already, but we keep this guard
      return;
    }

    if (!match.id) {
      console.warn(
        "[SelectSquad] handleStartMatch called without match.id – skipping DB lineup save"
      );
    }

    setSaving(true);
    setSaveError(null);

    try {
      if (match.id) {
        // Persist starting lineups to match_lineups
        await saveLineupsForMatch({
          matchId: match.id,
          teamRole: "home",
          players: team1Squad,
        });

        await saveLineupsForMatch({
          matchId: match.id,
          teamRole: "away",
          players: team2Squad,
        });
      }

      const matchWithSquads = {
        ...match,
        team1Squad,
        team2Squad,
        team1FullRoster: team1Players,
        team2FullRoster: team2Players,
      };

      onStartMatch(matchWithSquads);
    } catch (err: any) {
      console.error("[SelectSquad] Failed to save lineups:", err);
      setSaveError(
        err?.message || "Failed to save lineups. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------------
  // Squad completeness checks
  // ------------------------------------------------------------------
  const isTeam1Ready = team1Squad.length >= minPlayersPerTeam;
  const isTeam2Ready = team2Squad.length >= minPlayersPerTeam;
  const isSquadComplete = isTeam1Ready && isTeam2Ready;

  // "Full" means ideal squad size reached (not minimum)
  const isTeam1Full = team1Squad.length >= playersPerTeam;
  const isTeam2Full = team2Squad.length >= playersPerTeam;

  const team1Remaining = Math.max(playersPerTeam - team1Squad.length, 0);
  const team2Remaining = Math.max(playersPerTeam - team2Squad.length, 0); // ------------------------------------------------------------------
  // "Add Player" sub-screen
  // ------------------------------------------------------------------
  if (showAddPlayer) {
    return (
      <AddPlayer
        onBack={handleAddPlayerBack}
        onAddPlayer={handlePlayerCreated}
        playerDatabase={playerDatabase}
      />
    );
  }

  // ------------------------------------------------------------------
  // Main UI
  // ------------------------------------------------------------------
  return (
    <div className="bg-white text-slate-900 pb-32">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-full p-2 hover:bg-slate-100 active:scale-95 transition"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
            Match Setup
          </span>
          <h1 className="text-lg font-semibold">Select Squads</h1>
        </div>
      </div>

      {/* Match summary */}
      <div className="px-4">
        <div className="bg-purple-50 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-500">Match</p>
            <p className="text-sm font-semibold">
              {match.team1} <span className="text-slate-400">vs</span>{" "}
              {match.team2}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-slate-500">Players per team</p>
            <p className="text-sm font-semibold">{playersPerTeam}</p>
          </div>
        </div>
      </div>

      {/* Squads */}
      <div className="px-4 pt-5 space-y-6">
        {/* Team 1 Squad */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{match.team1}</h2>
            <span className="text-[11px] text-slate-500">
              {team1Squad.length}/{playersPerTeam} selected
            </span>
          </div>

             {!isTeam1Full && team1Squad.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <p className="text-[11px] text-amber-800">
                Add {team1Remaining} more{" "}
                {team1Remaining === 1 ? "player" : "players"} to complete the
                squad.
              </p>
            </div>
          )}

          <div className="space-y-2">
            {team1Players.map((player) => {
              const selected = isPlayerSelected(1, player.id);
              const shirtNumber = player.jerseyNumber
                ? parseInt(String(player.jerseyNumber), 10)
                : undefined;

              return (
                <button
                  key={player.id}
                  onClick={() => togglePlayer(1, player)}
                  disabled={!selected && team1Squad.length >= playersPerTeam}
                  className={`w-full px-3 py-2.5 rounded-2xl flex items-center justify-between text-sm transition-all ${
                    selected
                      ? "bg-purple-600 text-white"
                      : "bg-white border border-slate-200 hover:bg-purple-50"
                  } ${
                    !selected && team1Squad.length >= playersPerTeam
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold ${
                        selected ? "bg-purple-700" : "bg-purple-100"
                      }`}
                    >
                      <span
                        className={
                          selected ? "text-white" : "text-purple-700"
                        }
                      >
                        {shirtNumber ?? "-"}
                      </span>
                    </div>
                    <span>{player.name}</span>
                  </div>
                  {selected && <Check className="w-4 h-4" />}
                </button>
              );
            })}

            <Button
              onClick={() => {
                setAddingToTeam(1);
                setShowAddPlayer(true);
              }}
              variant="outline"
              className="w-full py-2.5 border-2 border-dashed border-purple-300 text-purple-600 hover:bg-purple-50 text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Player
            </Button>
          </div>
        </div>

        {/* Team 2 Squad */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{match.team2}</h2>
            <span className="text-[11px] text-slate-500">
              {team2Squad.length}/{playersPerTeam} selected
            </span>
          </div>

          {!isTeam2Full  && team2Squad.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <p className="text-[11px] text-amber-800">
                Add {team2Remaining} more{" "}
                {team2Remaining === 1 ? "player" : "players"} to complete the
                squad.
              </p>
            </div>
          )}

          <div className="space-y-2">
            {team2Players.map((player) => {
              const selected = isPlayerSelected(2, player.id);
              const shirtNumber = player.jerseyNumber
                ? parseInt(String(player.jerseyNumber), 10)
                : undefined;

              return (
                <button
                  key={player.id}
                  onClick={() => togglePlayer(2, player)}
                  disabled={!selected && team2Squad.length >= playersPerTeam}
                  className={`w-full px-3 py-2.5 rounded-2xl flex items-center justify-between text-sm transition-all ${
                    selected
                      ? "bg-purple-600 text-white"
                      : "bg-white border border-slate-200 hover:bg-purple-50"
                  } ${
                    !selected && team2Squad.length >= playersPerTeam
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold ${
                        selected ? "bg-purple-700" : "bg-purple-100"
                      }`}
                    >
                      <span
                        className={
                          selected ? "text-white" : "text-purple-700"
                        }
                      >
                        {shirtNumber ?? "-"}
                      </span>
                    </div>
                    <span>{player.name}</span>
                  </div>
                  {selected && <Check className="w-4 h-4" />}
                </button>
              );
            })}

            <Button
              onClick={() => {
                setAddingToTeam(2);
                setShowAddPlayer(true);
              }}
              variant="outline"
              className="w-full py-2.5 border-2 border-dashed border-purple-300 text-purple-600 hover:bg-purple-50 text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Player
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Start button */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-4 pb-5 pt-3 bg-white border-t border-slate-200 space-y-2">
               {!isSquadComplete &&
          (team1Squad.length > 0 || team2Squad.length > 0) && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <p className="text-[11px] text-red-800">
                Both teams must have at least {minPlayersPerTeam}{" "}
                {minPlayersPerTeam === 1 ? "player" : "players"} selected to start
                the match.
              </p>
            </div>
          )}

        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <p className="text-[11px] text-red-800">{saveError}</p>
          </div>
        )}

        <Button
          onClick={handleStartMatch}
          className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-sm font-semibold disabled:bg-slate-300 disabled:cursor-not-allowed"
          disabled={!isSquadComplete || saving}
        >
          {saving ? "Saving lineups…" : "Start Match"}
        </Button>
      </div>
    </div>
  );
};

export default SelectSquad;
