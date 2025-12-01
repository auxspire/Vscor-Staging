import React, { useState } from "react";
import { Plus, Check, Users, Loader2 } from "lucide-react";
import AddPlayer, { VscorPlayer } from "./AddPlayer";
import { saveLineupsForMatch } from "../lib/matches";

type MatchLike = {
  id?: string | number;
  team1: string;
  team2: string;
  playersPerTeam: number | string;
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
  const minPlayersPerTeam = playersPerTeam > 7 ? 7 : playersPerTeam;

  const matchTeam1Roster: VscorPlayer[] = (match.team1FullRoster as VscorPlayer[] | undefined) ?? [];
  const matchTeam2Roster: VscorPlayer[] = (match.team2FullRoster as VscorPlayer[] | undefined) ?? [];

  const team1Data = registeredTeams.find((t) => t.name === match.team1);
  const team2Data = registeredTeams.find((t) => t.name === match.team2);

  const unassignedPlayers: VscorPlayer[] = playerDatabase
    .filter((p) => !p.teamId || p.teamId === null)
    .map((p) => ({ ...p, synced: p.synced ?? false }));

  const team1AssignedPlayers: VscorPlayer[] = team1Data?.id
    ? playerDatabase
        .filter((p) => p.teamId === team1Data.id)
        .map((p) => ({ ...p, synced: p.synced ?? false }))
    : [];

  const team2AssignedPlayers: VscorPlayer[] = team2Data?.id
    ? playerDatabase
        .filter((p) => p.teamId === team2Data.id)
        .map((p) => ({ ...p, synced: p.synced ?? false }))
    : [];

  const baseTeam1Players: VscorPlayer[] =
    matchTeam1Roster.length > 0
      ? matchTeam1Roster
      : [...team1AssignedPlayers, ...unassignedPlayers];

  const baseTeam2Players: VscorPlayer[] =
    matchTeam2Roster.length > 0
      ? matchTeam2Roster
      : [...team2AssignedPlayers, ...unassignedPlayers];

  const team1Players: VscorPlayer[] = [...baseTeam1Players, ...customPlayers.team1];
  const team2Players: VscorPlayer[] = [...baseTeam2Players, ...customPlayers.team2];

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

  const handlePlayerCreated = (playerData: VscorPlayer) => {
    const uniqueId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const playerWithId: VscorPlayer = {
      ...playerData,
      id: playerData.id ?? uniqueId,
      synced: playerData.synced ?? false,
    };

    if (addingToTeam === 1) {
      setCustomPlayers((prev) => ({ ...prev, team1: [...prev.team1, playerWithId] }));
    } else if (addingToTeam === 2) {
      setCustomPlayers((prev) => ({ ...prev, team2: [...prev.team2, playerWithId] }));
    }
  };

  const handleStartMatch = async () => {
    const isTeam1Ok = team1Squad.length >= minPlayersPerTeam;
    const isTeam2Ok = team2Squad.length >= minPlayersPerTeam;
    if (!isTeam1Ok || !isTeam2Ok) return;

    setSaving(true);
    setSaveError(null);

    try {
      if (match.id) {
        await saveLineupsForMatch({ matchId: match.id, teamRole: "home", players: team1Squad });
        await saveLineupsForMatch({ matchId: match.id, teamRole: "away", players: team2Squad });
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
      setSaveError(err?.message || "Failed to save lineups. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const isTeam1Ready = team1Squad.length >= minPlayersPerTeam;
  const isTeam2Ready = team2Squad.length >= minPlayersPerTeam;
  const isSquadComplete = isTeam1Ready && isTeam2Ready;

  if (showAddPlayer) {
    return (
      <AddPlayer
        onBack={() => {
          setShowAddPlayer(false);
          setAddingToTeam(null);
        }}
        onAddPlayer={handlePlayerCreated}
        playerDatabase={playerDatabase}
      />
    );
  }

  return (
    <div className="px-4 py-5 pb-32 space-y-5">
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-purple-100">Match</p>
            <p className="text-lg font-bold">{match.team1} vs {match.team2}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-purple-100">Players per team</p>
            <p className="text-2xl font-bold">{playersPerTeam}</p>
          </div>
        </div>
      </div>

      <TeamSquadSection
        teamName={match.team1}
        players={team1Players}
        selectedPlayers={team1Squad}
        playersPerTeam={playersPerTeam}
        minPlayers={minPlayersPerTeam}
        onTogglePlayer={(player) => togglePlayer(1, player)}
        onAddPlayer={() => {
          setAddingToTeam(1);
          setShowAddPlayer(true);
        }}
        isPlayerSelected={(id) => isPlayerSelected(1, id)}
        accentColor="purple"
      />

      <TeamSquadSection
        teamName={match.team2}
        players={team2Players}
        selectedPlayers={team2Squad}
        playersPerTeam={playersPerTeam}
        minPlayers={minPlayersPerTeam}
        onTogglePlayer={(player) => togglePlayer(2, player)}
        onAddPlayer={() => {
          setAddingToTeam(2);
          setShowAddPlayer(true);
        }}
        isPlayerSelected={(id) => isPlayerSelected(2, id)}
        accentColor="emerald"
      />

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 space-y-2">
        {!isSquadComplete && (team1Squad.length > 0 || team2Squad.length > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
            <p className="text-xs text-amber-800">
              Both teams need at least {minPlayersPerTeam} players to start
            </p>
          </div>
        )}

        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2">
            <p className="text-xs text-red-800">{saveError}</p>
          </div>
        )}

        <button
          onClick={handleStartMatch}
          disabled={!isSquadComplete || saving}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white rounded-xl py-4 text-sm font-semibold hover:bg-purple-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving lineups...
            </>
          ) : (
            "Start Match"
          )}
        </button>
      </div>
    </div>
  );
};

type TeamSquadSectionProps = {
  teamName: string;
  players: VscorPlayer[];
  selectedPlayers: VscorPlayer[];
  playersPerTeam: number;
  minPlayers: number;
  onTogglePlayer: (player: VscorPlayer) => void;
  onAddPlayer: () => void;
  isPlayerSelected: (id: VscorPlayer["id"]) => boolean;
  accentColor: "purple" | "emerald";
};

const TeamSquadSection: React.FC<TeamSquadSectionProps> = ({
  teamName,
  players,
  selectedPlayers,
  playersPerTeam,
  minPlayers,
  onTogglePlayer,
  onAddPlayer,
  isPlayerSelected,
  accentColor,
}) => {
  const remaining = Math.max(playersPerTeam - selectedPlayers.length, 0);
  const isFull = selectedPlayers.length >= playersPerTeam;
  const isReady = selectedPlayers.length >= minPlayers;

  const colors = {
    purple: {
      bg: "bg-purple-100",
      text: "text-purple-700",
      selected: "bg-purple-600",
      border: "border-purple-200",
    },
    emerald: {
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      selected: "bg-emerald-600",
      border: "border-emerald-200",
    },
  };

  const c = colors[accentColor];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full ${c.bg} flex items-center justify-center`}>
            <Users className={`w-4 h-4 ${c.text}`} />
          </div>
          <h3 className="text-base font-semibold text-slate-900">{teamName}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            isReady ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
          }`}>
            {selectedPlayers.length}/{playersPerTeam}
          </span>
        </div>
      </div>

      {players.length === 0 ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
          <p className="text-sm text-slate-600 mb-2">No players available</p>
          <button
            onClick={onAddPlayer}
            className={`text-sm font-medium ${c.text}`}
          >
            Add a player
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {players.map((player) => {
            const selected = isPlayerSelected(player.id);
            const disabled = !selected && isFull;
            const shirtNumber = player.jerseyNumber
              ? parseInt(String(player.jerseyNumber), 10)
              : undefined;

            return (
              <button
                key={player.id}
                onClick={() => onTogglePlayer(player)}
                disabled={disabled}
                className={`w-full p-3 rounded-xl flex items-center justify-between transition-all ${
                  selected
                    ? `${c.selected} text-white`
                    : "bg-white border border-slate-200 hover:border-slate-300"
                } ${disabled ? "opacity-50 cursor-not-allowed" : "active:scale-[0.98]"}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      selected ? "bg-white/20" : c.bg
                    }`}
                  >
                    <span className={selected ? "text-white" : c.text}>
                      {shirtNumber ?? "-"}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-medium ${selected ? "text-white" : "text-slate-900"}`}>
                      {player.name}
                    </p>
                    {player.position && (
                      <p className={`text-xs ${selected ? "text-white/70" : "text-slate-500"}`}>
                        {player.position}
                      </p>
                    )}
                  </div>
                </div>
                {selected && <Check className="w-5 h-5" />}
              </button>
            );
          })}

          <button
            onClick={onAddPlayer}
            className={`w-full p-3 rounded-xl border-2 border-dashed ${c.border} flex items-center justify-center gap-2 ${c.text} hover:bg-slate-50 transition-colors`}
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add Player</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default SelectSquad;
