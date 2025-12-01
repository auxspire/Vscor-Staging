import React, {
  useMemo,
  useState,
  ChangeEvent,
  MouseEvent as ReactMouseEvent,
} from "react";
import { ArrowLeft, Users, Edit2, Trash2, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "./ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

// ----------------------
// Types
// ----------------------

export type RegisteredTeam = {
  id: string | number;
  name: string;
};

export type PlayerWithTeam = {
  id: string | number;
  name: string;
  teamId?: string | number | null;
  jerseyNumber?: string | number;
};

type TeamManagementProps = {
  onBack: () => void;
  teams: RegisteredTeam[];
  players: PlayerWithTeam[];
  onUpdateTeamName: (teamId: string | number, newName: string) => void;
  onDeleteTeam: (teamId: string | number) => void;
  onAssignPlayerToTeam: (playerId: string | number, teamId: string | number) => void;
  onClearPlayerTeam: (playerId: string | number) => void;
};

// ----------------------
// Component
// ----------------------

const TeamManagement: React.FC<TeamManagementProps> = ({
  onBack,
  teams,
  players,
  onUpdateTeamName,
  onDeleteTeam,
  onAssignPlayerToTeam,
  onClearPlayerTeam,
}) => {
  const [teamSearch, setTeamSearch] = useState<string>("");
  const [playerSearch, setPlayerSearch] = useState<string>("");
  const [editingTeamId, setEditingTeamId] = useState<string | number | null>(null);
  const [editingTeamName, setEditingTeamName] = useState<string>("");

  // Helper: equality for string | number ids
  const sameId = (
    a: string | number | null | undefined,
    b: string | number
  ): boolean => String(a) === String(b);

  const assignedPlayersByTeam = useMemo(() => {
    const map = new Map<string, PlayerWithTeam[]>();
    for (const player of players) {
      if (player.teamId == null) continue;
      const key = String(player.teamId);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(player);
    }
    return map;
  }, [players]);

  const unassignedPlayers: PlayerWithTeam[] = useMemo(
    () => players.filter((p) => p.teamId == null),
    [players]
  );

  const filteredTeams = useMemo(() => {
    const term = teamSearch.trim().toLowerCase();
    if (!term) return teams;
    return teams.filter((t) => t.name.toLowerCase().includes(term));
  }, [teams, teamSearch]);

  const filteredUnassignedPlayers = useMemo(() => {
    const term = playerSearch.trim().toLowerCase();
    if (!term) return unassignedPlayers;
    return unassignedPlayers.filter((p) => p.name.toLowerCase().includes(term));
  }, [unassignedPlayers, playerSearch]);

  const startEditTeam = (team: RegisteredTeam) => {
    setEditingTeamId(team.id);
    setEditingTeamName(team.name);
  };

  const cancelEditTeam = () => {
    setEditingTeamId(null);
    setEditingTeamName("");
  };

  const saveEditTeam = (teamId: string | number) => {
    const name = editingTeamName.trim();
    if (!name) return;
    onUpdateTeamName(teamId, name);
    setEditingTeamId(null);
    setEditingTeamName("");
  };

  const handleTeamSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setTeamSearch(e.target.value);
  };

  const handlePlayerSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPlayerSearch(e.target.value);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="p-6 space-y-6 pb-28">
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => onBack()}
            className="p-2 rounded-full hover:bg-slate-800"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold">Teams</h1>
            <p className="text-xs text-slate-300">
              Manage teams and assign players from your player pool.
            </p>
          </div>
        </div>

        {/* Top stats / overview */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-300">Total Teams</p>
              <p className="text-lg font-semibold">{teams.length}</p>
            </div>
          </div>
          <div className="bg-slate-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center">
              <span className="text-sm font-bold">P</span>
            </div>
            <div>
              <p className="text-xs text-slate-300">Players in Teams</p>
              <p className="text-lg font-semibold">
                {players.filter((p) => p.teamId != null).length}
              </p>
            </div>
          </div>
        </div>

        {/* Search Teams */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-300 px-1">
            Search Teams
          </label>
          <Input
            placeholder="Search by team name"
            value={teamSearch}
            onChange={handleTeamSearchChange}
            className="bg-slate-800 border-slate-700 text-sm"
          />
        </div>

        {/* Team list */}
        {filteredTeams.length === 0 ? (
          <div className="bg-slate-800 rounded-2xl p-4 text-sm text-slate-300">
            No teams created yet. Use the New Match screen to add a team while
            creating a match.
          </div>
        ) : (
          <Accordion type="single" collapsible className="space-y-3">
            {filteredTeams.map((team) => {
              const key = String(team.id);
              const teamPlayers = assignedPlayersByTeam.get(key) ?? [];
              const playerCount = teamPlayers.length;

              const isEditing = sameId(editingTeamId, team.id);

              return (
                <AccordionItem
                  key={team.id}
                  value={key}
                  className="overflow-hidden rounded-2xl bg-slate-800 border border-slate-700"
                >
                  <AccordionTrigger className="px-4 py-3">
                    <div className="flex-1 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center">
                        <span className="font-bold text-sm">
                          {team.name.slice(0, 2).toUpperCase()}
                        </span>
                      </div>

                      <div className="flex-1">
                        {isEditing ? (
                          <Input
                            value={editingTeamName}
                            onChange={(
                              e: ChangeEvent<HTMLInputElement>
                            ) => setEditingTeamName(e.target.value)}
                            className="bg-slate-900 border-slate-600 text-sm h-8"
                            autoFocus
                          />
                        ) : (
                          <p className="font-medium text-sm">{team.name}</p>
                        )}
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {playerCount}{" "}
                          {playerCount === 1 ? "player" : "players"} assigned
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-emerald-400 hover:text-emerald-300"
                            onClick={(
                              e: ReactMouseEvent<HTMLButtonElement>
                            ) => {
                              e.stopPropagation();
                              saveEditTeam(team.id);
                            }}
                          >
                            <CheckIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-slate-400 hover:text-slate-200"
                            onClick={(
                              e: ReactMouseEvent<HTMLButtonElement>
                            ) => {
                              e.stopPropagation();
                              cancelEditTeam();
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-slate-300 hover:text-white"
                            onClick={(
                              e: ReactMouseEvent<HTMLButtonElement>
                            ) => {
                              e.stopPropagation();
                              startEditTeam(team);
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-400 hover:text-red-300"
                            onClick={(
                              e: ReactMouseEvent<HTMLButtonElement>
                            ) => {
                              e.stopPropagation();
                              if (
                                window.confirm(
                                  "Delete this team? Players will remain, but become unassigned."
                                )
                              ) {
                                onDeleteTeam(team.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="bg-slate-900/70">
                    <div className="px-4 pb-4 pt-1 space-y-4">
                      {/* Assign player to this team */}
                      <div className="space-y-2">
                        <p className="text-xs text-slate-300 px-1">
                          Assign player to {team.name}
                        </p>
                        {unassignedPlayers.length === 0 ? (
                          <p className="text-[11px] text-slate-500 px-1">
                            No unassigned players available. Add players first or
                            unassign from another team.
                          </p>
                        ) : (
                          <Select
                            onValueChange={(playerId: string) => {
                              const player = unassignedPlayers.find(
                                (p) => String(p.id) === playerId
                              );
                              if (!player) return;
                              onAssignPlayerToTeam(player.id, team.id);
                            }}
                          >
                            <SelectTrigger className="bg-slate-900 border-slate-700 text-xs h-9">
                              <SelectValue placeholder="Select player to assign" />
                            </SelectTrigger>
                            <SelectContent>
                              {unassignedPlayers.map((player) => (
                                <SelectItem
                                  key={player.id}
                                  value={String(player.id)}
                                >
                                  #{player.jerseyNumber ?? "-"} – {player.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      {/* Players in team */}
                      <div className="space-y-2">
                        <p className="text-xs text-slate-300 px-1">
                          Players in {team.name}
                        </p>
                        {teamPlayers.length === 0 ? (
                          <div className="text-[11px] text-slate-500 px-1 py-3">
                            No players assigned yet. Use the selector above to add
                            players.
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                            {teamPlayers.map((player) => (
                              <div
                                key={player.id}
                                className="flex items-center justify-between bg-slate-800 rounded-xl px-3 py-2"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-xs font-semibold">
                                    {player.jerseyNumber ?? "-"}
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium">
                                      {player.name}
                                    </p>
                                    <p className="text-[11px] text-slate-400">
                                      ID: {String(player.id).slice(0, 8)}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-slate-300 hover:text-amber-300"
                                  onClick={(
                                    e: ReactMouseEvent<HTMLButtonElement>
                                  ) => {
                                    e.stopPropagation();
                                    onClearPlayerTeam(player.id);
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}

        {/* Unassigned players panel */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-200">
              Unassigned Players
            </p>
            <span className="text-[11px] text-slate-400">
              {unassignedPlayers.length} total
            </span>
          </div>

          <Input
            placeholder="Search unassigned players"
            value={playerSearch}
            onChange={handlePlayerSearchChange}
            className="bg-slate-800 border-slate-700 text-sm"
          />

          {filteredUnassignedPlayers.length === 0 ? (
            <div className="bg-slate-800 rounded-2xl p-3 text-[11px] text-slate-400">
              No unassigned players match this search.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {filteredUnassignedPlayers.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between bg-slate-800 rounded-xl px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold">
                      {player.jerseyNumber ?? "-"}
                    </div>
                    <div>
                      <p className="text-xs font-medium">{player.name}</p>
                      <p className="text-[11px] text-slate-400">
                        ID: {String(player.id).slice(0, 8)}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Not in any team
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Simple inline Check icon to avoid extra imports
const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M3 8.5L6.2 11.5L13 4.5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default TeamManagement;
