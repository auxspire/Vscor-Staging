// src/components/PlayerManagement.tsx
// @ts-nocheck

import React, { useMemo, useState, ChangeEvent } from "react";
import { ArrowLeft, Edit3, Trash2, Check, X, Users } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import type { VscorPlayer } from "./AddPlayer";

type RegisteredTeam = {
  id: string | number;
  name: string;
};

type PlayerManagementProps = {
  onBack: () => void;
  players: VscorPlayer[];
  teams: RegisteredTeam[];
  onUpdatePlayer: (updated: VscorPlayer) => void;
  onDeletePlayer: (playerId: string) => void;
};

const PlayerManagement: React.FC<PlayerManagementProps> = ({
  onBack,
  players,
  teams,
  onUpdatePlayer,
  onDeletePlayer,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterTeamId, setFilterTeamId] = useState<string>("all");

  const [draft, setDraft] = useState<Partial<VscorPlayer>>({});

  const teamMap = useMemo(() => {
    const map = new Map<string, RegisteredTeam>();
    teams.forEach((t) => map.set(String(t.id), t));
    return map;
  }, [teams]);

  const visiblePlayers = useMemo(() => {
    if (filterTeamId === "all") return players;
    return players.filter((p) => String(p.teamId) === filterTeamId);
  }, [players, filterTeamId]);

  const startEdit = (player: VscorPlayer) => {
    setEditingId(player.id);
    setDraft(player);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({});
  };

  const handleDraftChange =
    (field: keyof VscorPlayer) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      setDraft((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleTeamChange = (value: string) => {
    if (!draft) return;
    const team = teamMap.get(value);
    setDraft((prev) => ({
      ...prev,
      teamId: value,
      teamName: team?.name ?? null,
    }));
  };

  const saveEdit = () => {
    if (!editingId || !draft) return;
    const original = players.find((p) => p.id === editingId);
    if (!original) return;
    const updated: VscorPlayer = {
      ...original,
      ...draft,
      id: original.id,
    };
    onUpdatePlayer(updated);
    setEditingId(null);
    setDraft({});
  };

  const confirmDelete = (playerId: string) => {
    if (!window.confirm("Delete this player permanently?")) return;
    onDeletePlayer(playerId);
  };

  return (
    <div className="p-6 space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <button onClick={onBack} className="p-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-medium">Players</h1>
      </div>

      {/* Filter */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-400">
          Total players: <span className="font-semibold">{players.length}</span>
        </p>
        <Select
          value={filterTeamId}
          onValueChange={(value) => setFilterTeamId(value)}
        >
          <SelectTrigger className="h-8 w-40 bg-slate-900 border-slate-600 text-xs">
            <SelectValue placeholder="Filter by team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All teams</SelectItem>
            {teams.map((team) => (
              <SelectItem key={String(team.id)} value={String(team.id)}>
                {team.name}
              </SelectItem>
            ))}
            <SelectItem value="unassigned">Unassigned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {visiblePlayers.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm text-slate-300">
          No players to show. Add players from <span className="font-medium">Add Player</span>{" "}
          or via team registration.
        </div>
      ) : (
        <div className="space-y-3">
          {visiblePlayers.map((player) => {
            const isEditing = editingId === player.id;
            const teamName =
              player.teamId != null
                ? teamMap.get(String(player.teamId))?.name ??
                  player.teamName ??
                  "Unknown team"
                : "Unassigned";

            const syncedLabel = player.synced ? "Synced" : "Offline only";

            return (
              <div
                key={player.id}
                className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3"
              >
                {/* Top row: name + badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <span className="text-sm font-semibold">
                        {player.name?.substring(0, 1)?.toUpperCase() || "P"}
                      </span>
                    </div>
                    <div>
                      {isEditing ? (
                        <Input
                          value={draft.name ?? ""}
                          onChange={handleDraftChange("name")}
                          className="h-8 bg-slate-900 border-slate-600 text-sm"
                        />
                      ) : (
                        <p className="text-sm font-semibold">{player.name}</p>
                      )}
                      <p className="text-[11px] text-slate-400">
                        #{player.jerseyNumber || "-"} • {teamName}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        player.synced
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {syncedLabel}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {player.createdAt
                        ? new Date(player.createdAt).toLocaleDateString()
                        : ""}
                    </span>
                  </div>
                </div>

                {/* Editable fields */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-slate-400 mb-1">Jersey</p>
                    {isEditing ? (
                      <Input
                        value={draft.jerseyNumber ?? ""}
                        onChange={handleDraftChange("jerseyNumber")}
                        className="h-8 bg-slate-900 border-slate-600 text-xs"
                      />
                    ) : (
                      <p className="text-slate-100">
                        {player.jerseyNumber || "-"}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-slate-400 mb-1">Position</p>
                    {isEditing ? (
                      <Input
                        value={draft.position ?? ""}
                        onChange={handleDraftChange("position")}
                        className="h-8 bg-slate-900 border-slate-600 text-xs"
                      />
                    ) : (
                      <p className="text-slate-100">
                        {player.position || "-"}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-slate-400 mb-1">Phone</p>
                    {isEditing ? (
                      <Input
                        value={draft.phoneNumber ?? ""}
                        onChange={handleDraftChange("phoneNumber")}
                        className="h-8 bg-slate-900 border-slate-600 text-xs"
                      />
                    ) : (
                      <p className="text-slate-100">
                        {player.phoneNumber || "-"}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-slate-400 mb-1">Preferred foot</p>
                    {isEditing ? (
                      <Input
                        value={draft.preferredFoot ?? ""}
                        onChange={handleDraftChange("preferredFoot")}
                        className="h-8 bg-slate-900 border-slate-600 text-xs"
                      />
                    ) : (
                      <p className="text-slate-100">
                        {player.preferredFoot || "-"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Team selector (when editing) */}
                {isEditing && (
                  <div className="space-y-1 text-xs">
                    <p className="text-slate-400">Team</p>
                    <Select
                      value={
                        draft.teamId != null
                          ? String(draft.teamId)
                          : draft.teamName
                          ? ""
                          : ""
                      }
                      onValueChange={handleTeamChange}
                    >
                      <SelectTrigger className="h-8 bg-slate-900 border-slate-600 text-xs">
                        <SelectValue placeholder={teamName} />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem
                            key={String(team.id)}
                            value={String(team.id)}
                          >
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <Users className="w-3 h-3" />
                    <span>{teamName}</span>
                  </div>
                  <div className="flex gap-2">
                    {!isEditing ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 text-[11px] border-slate-600"
                          onClick={() => startEdit(player)}
                        >
                          <Edit3 className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 text-[11px] border-slate-700 text-red-400 hover:text-red-300 hover:border-red-400"
                          onClick={() => confirmDelete(player.id)}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          className="h-8 px-2 text-[11px] bg-purple-600 hover:bg-purple-700"
                          onClick={saveEdit}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 text-[11px] border-slate-600"
                          onClick={cancelEdit}
                        >
                          <X className="w-3 h-3 mr-1" />
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PlayerManagement;
