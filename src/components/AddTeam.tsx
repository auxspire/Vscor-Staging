// src/components/AddTeam.tsx
import React, { useState } from "react";
import { ArrowLeft, Plus, Trash2, UserPlus } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "./ui/dialog";

// ---------- Types ----------

export type PlayerDbRecord = {
  id: string | number;
  name: string;
  position?: string | null;
  jerseyNumber?: string | number | null;
  teamId?: string | number | null;
  teamName?: string | null;
  phoneNumber?: string | null;
  [key: string]: any;
};

type LocalTeamPlayer = {
  name: string;
  position: string;
  jerseyNumber: string;
  isFromDatabase: boolean;
  playerId: string | number | null;
};

export type TeamPlayer = {
  id: string | number;
  name: string;
  number: number;
  position: string;
  jerseyNumber: string;
};

export type TeamRecord = {
  id: string | number;
  name: string;
  coach: string;
  homeVenue: string;
  description: string;
  players: TeamPlayer[];
  createdAt: Date;
};

type AddTeamProps = {
  onBack: () => void;
  onAddTeam?: (team: TeamRecord) => void;
  playerDatabase?: PlayerDbRecord[];
  onAssignPlayerToTeam?: (
    playerId: string | number,
    teamId: string | number,
    teamName: string
  ) => void;
  onAddPlayer?: (player: PlayerDbRecord) => void;
};

// ---------- Component ----------

const AddTeam: React.FC<AddTeamProps> = ({
  onBack,
  onAddTeam,
  playerDatabase = [],
  onAssignPlayerToTeam,
  onAddPlayer,
}) => {
  const [teamName, setTeamName] = useState<string>("");
  const [coach, setCoach] = useState<string>("");
  const [homeVenue, setHomeVenue] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  const [players, setPlayers] = useState<LocalTeamPlayer[]>([
    {
      name: "",
      position: "",
      jerseyNumber: "",
      isFromDatabase: false,
      playerId: null,
    },
  ]);

  const [showPlayerPicker, setShowPlayerPicker] = useState<boolean>(false);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number | null>(
    null
  );

  // Unassigned players: teamId is null/undefined
  const unassignedPlayers: PlayerDbRecord[] = playerDatabase.filter(
    (p) => !p.teamId
  );

  const addPlayer = () => {
    setPlayers((prev) => [
      ...prev,
      {
        name: "",
        position: "",
        jerseyNumber: "",
        isFromDatabase: false,
        playerId: null,
      },
    ]);
  };

  const removePlayer = (index: number) => {
    setPlayers((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePlayer = (index: number, field: keyof LocalTeamPlayer, value: any) => {
    setPlayers((prev) =>
      prev.map((player, i) =>
        i === index ? { ...player, [field]: value } : player
      )
    );
  };

  const selectPlayerFromDatabase = (
    dbPlayer: PlayerDbRecord,
    index: number
  ) => {
    setPlayers((prev) =>
      prev.map((player, i) =>
        i === index
          ? {
              name: dbPlayer.name,
              position: (dbPlayer.position as string) || "",
              jerseyNumber: dbPlayer.jerseyNumber
                ? String(dbPlayer.jerseyNumber)
                : "",
              isFromDatabase: true,
              playerId: dbPlayer.id,
            }
          : player
      )
    );
    setShowPlayerPicker(false);
    setCurrentPlayerIndex(null);
  };

  const handleSubmit = () => {
    if (!teamName.trim()) return;

    const newTeamId: string = `team-${Date.now()}`;

    const validPlayers: TeamPlayer[] = players
      .filter((p) => p.name.trim() !== "")
      .map((p, index) => {
        // If player comes from DB, mark them assigned
        if (p.isFromDatabase && p.playerId != null && onAssignPlayerToTeam) {
          onAssignPlayerToTeam(p.playerId, newTeamId, teamName);
        } else if (!p.isFromDatabase && p.name.trim() !== "" && onAddPlayer) {
          // New player → add to DB as already assigned to this team
          const newPlayer: PlayerDbRecord = {
            id: `player-${Date.now()}-${index}`,
            name: p.name,
            position: p.position || "",
            jerseyNumber:
              p.jerseyNumber && p.jerseyNumber !== ""
                ? p.jerseyNumber
                : String(index + 1),
            teamId: newTeamId,
            teamName: teamName,
            phoneNumber: "",
          };
          onAddPlayer(newPlayer);
        }

        const number =
          p.jerseyNumber && p.jerseyNumber !== ""
            ? parseInt(p.jerseyNumber, 10)
            : index + 1;

        return {
          id: p.playerId ?? `local-${Date.now()}-${index}`,
          name: p.name,
          number: Number.isNaN(number) ? index + 1 : number,
          position: p.position || "",
          jerseyNumber:
            p.jerseyNumber && p.jerseyNumber !== ""
              ? p.jerseyNumber
              : String(index + 1),
        };
      });

    const teamData: TeamRecord = {
      id: newTeamId,
      name: teamName,
      coach,
      homeVenue,
      description,
      players: validPlayers,
      createdAt: new Date(),
    };

    console.log("Team created:", teamData);

    if (onAddTeam) {
      onAddTeam(teamData);
    }

    onBack();
  };

  const isFormValid = teamName.trim().length > 0;

  return (
    <div className="p-6 space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-medium">Add Team</h1>
      </div>

      <div className="space-y-6">
        {/* Team details */}
        <div>
          <label className="block text-sm font-medium mb-2">Team Name</label>
          <Input
            placeholder="Enter team name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="py-3 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Coach/Manager
          </label>
          <Input
            placeholder="Enter coach/manager name"
            value={coach}
            onChange={(e) => setCoach(e.target.value)}
            className="py-3 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Home Venue</label>
          <Input
            placeholder="Enter home venue"
            value={homeVenue}
            onChange={(e) => setHomeVenue(e.target.value)}
            className="py-3 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <Textarea
            placeholder="Enter team description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border border-gray-300 rounded-lg"
            rows={3}
          />
        </div>

        {/* Players */}
        <div>
          <div className="mb-4 flex justify-between items-center">
            <label className="block text-sm font-medium">Players</label>
            {unassignedPlayers.length > 0 && (
              <span className="text-xs text-purple-600">
                {unassignedPlayers.length} unassigned players available
              </span>
            )}
          </div>

          <div className="space-y-4">
            {players.map((player, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium">Player {index + 1}</h4>
                  <div className="flex gap-2">
                    {unassignedPlayers.length > 0 && !player.isFromDatabase && (
                      <Dialog
                        open={
                          showPlayerPicker && currentPlayerIndex === index
                        }
                        onOpenChange={(open: boolean) => {
                          setShowPlayerPicker(open);
                          setCurrentPlayerIndex(open ? index : null);
                        }}
                      >
                        <DialogTrigger asChild>
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentPlayerIndex(index);
                              setShowPlayerPicker(true);
                            }}
                            className="text-purple-600 hover:text-purple-700"
                            title="Select from existing players"
                          >
                            <UserPlus className="w-4 h-4" />
                          </button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Select Player from Database</DialogTitle>
                            <DialogDescription>
                              Choose an unassigned player to add to this team. Once
                              assigned, they will no longer appear for other teams.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {unassignedPlayers.map((dbPlayer) => (
                              <button
                                key={dbPlayer.id}
                                type="button"
                                onClick={() =>
                                  selectPlayerFromDatabase(dbPlayer, index)
                                }
                                className="w-full text-left p-3 border rounded-lg hover:bg-purple-50 hover:border-purple-300"
                              >
                                <div className="font-medium">
                                  {dbPlayer.name}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {dbPlayer.position &&
                                    `${dbPlayer.position} • `}
                                  {dbPlayer.jerseyNumber &&
                                    `#${dbPlayer.jerseyNumber}`}
                                  {dbPlayer.phoneNumber &&
                                    ` • ${dbPlayer.phoneNumber}`}
                                </div>
                              </button>
                            ))}
                            {unassignedPlayers.length === 0 && (
                              <p className="text-sm text-gray-500">
                                No unassigned players available.
                              </p>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    {players.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePlayer(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {player.isFromDatabase && (
                  <div className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded inline-block">
                    From Player Database
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3">
                  <Input
                    placeholder="Player name"
                    value={player.name}
                    onChange={(e) =>
                      updatePlayer(index, "name", e.target.value)
                    }
                    className="border border-gray-300 rounded-lg"
                    disabled={player.isFromDatabase}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Position"
                      value={player.position}
                      onChange={(e) =>
                        updatePlayer(index, "position", e.target.value)
                      }
                      className="border border-gray-300 rounded-lg"
                    />
                    <Input
                      placeholder="Jersey #"
                      type="number"
                      value={player.jerseyNumber}
                      onChange={(e) =>
                        updatePlayer(index, "jerseyNumber", e.target.value)
                      }
                      className="border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button
              onClick={addPlayer}
              type="button"
              variant="outline"
              size="sm"
              className="w-full text-purple-600 border-purple-600 hover:bg-purple-50"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Player
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            onClick={onBack}
            type="button"
            variant="outline"
            className="flex-1 py-3 border-gray-300 rounded-lg"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            type="button"
            className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
            disabled={!isFormValid}
          >
            Create Team
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddTeam;
