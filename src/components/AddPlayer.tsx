import React, { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";

const LOCAL_STORAGE_KEY = "vscor-players";

// ----------------------
// Types
// ----------------------

export interface VscorPlayer {
  id: string;
  name: string;
  jerseyNumber: string;
  phoneNumber: string;
  dateOfBirth: string;
  position: string;
  teamKey: string | null;   // "eafm_astros" etc
  teamName: string | null;  // "EAFM Astros" etc
  teamId: string | null;    // future: Supabase id
  height: string;
  weight: string;
  nationality: string;
  preferredFoot: string;
  bio: string;
  createdAt: string;
  synced: boolean;
}

interface AddPlayerProps {
  onBack: () => void;
  onAddPlayer?: (player: VscorPlayer) => void | Promise<void>;
  playerDatabase?: VscorPlayer[];
}

// ----------------------
// Component
// ----------------------

const AddPlayer: React.FC<AddPlayerProps> = ({
  onBack,
  onAddPlayer,
  playerDatabase = [],
}) => {
  const [playerName, setPlayerName] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [dateOfBirth, setDateOfBirth] = useState<string>("");
  const [position, setPosition] = useState<string>("");
  const [jerseyNumber, setJerseyNumber] = useState<string>("");
  const [team, setTeam] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [nationality, setNationality] = useState<string>("");
  const [preferredFoot, setPreferredFoot] = useState<string>("");
  const [bio, setBio] = useState<string>("");

  // Local cached players from device (offline DB)
  const [localPlayers, setLocalPlayers] = useState<VscorPlayer[]>([]);

  // Load players from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setLocalPlayers(parsed as VscorPlayer[]);
      }
    } catch (err) {
      console.error("[AddPlayer] Failed to load local players:", err);
    }
  }, []);

  const positions = [
    "Goalkeeper",
    "Right Back",
    "Left Back",
    "Centre Back",
    "Defensive Midfielder",
    "Central Midfielder",
    "Attacking Midfielder",
    "Right Winger",
    "Left Winger",
    "Striker",
    "Centre Forward",
  ];

  const teams = [
    "EAFM Astros",
    "EAFM Eagles",
    "Karappuram Strikers",
    "KSL Illuminatiz",
    "Anayara Kings",
  ];

  /**
   * Helper: normalize "Team Name" → "team_name" key form
   */
  const toKey = (name: string): string =>
    name.toLowerCase().replace(/\s+/g, "_");

  /**
   * Combined list for duplicate check:
   * - players from parent DB
   * - players from local offline DB
   */
  const allPlayersForDuplicateCheck: VscorPlayer[] = [
    ...playerDatabase,
    ...localPlayers,
  ];

  // Check for duplicate player name in any known DB
  const isDuplicateName: boolean =
    playerName.trim() !== "" &&
    allPlayersForDuplicateCheck.some(
      (player) =>
        player &&
        typeof player.name === "string" &&
        player.name.toLowerCase() === playerName.toLowerCase()
    );

  // Phone is optional; if present, must be 10 digits
  const isPhoneValid: boolean =
    phoneNumber === "" ||
    (phoneNumber.length === 10 && /^\d+$/.test(phoneNumber));

  // Form valid = name present AND phone (if any) is valid
  const isFormValid: boolean = playerName.trim() !== "" && isPhoneValid;

  /**
   * Persist an array of players to localStorage
   */
  const saveLocalPlayers = (players: VscorPlayer[]): void => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify(players)
      );
      setLocalPlayers(players);
    } catch (err) {
      console.error("[AddPlayer] Failed to save local players:", err);
    }
  };

  /**
   * Generate a local unique ID for the player
   */
  const generateLocalId = (): string =>
    `local_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2)}`;

  /**
   * Main submit handler:
   * 1. Build player object
   * 2. Save to local DB (offline-first)
   * 3. Try to sync via onAddPlayer if online
   */
  const handleSubmit = async (): Promise<void> => {
    if (!isFormValid) return;

    const localId = generateLocalId();

    const teamNameResolved: string | null = team
      ? teams.find((t) => toKey(t) === team) || null
      : null;

    const basePlayerData: VscorPlayer = {
      id: localId,
      name: playerName.trim(),
      jerseyNumber:
        jerseyNumber || String(Math.floor(Math.random() * 99) + 1),
      phoneNumber: phoneNumber || "",
      dateOfBirth,
      position,
      teamKey: team || null,
      teamName: teamNameResolved,
      teamId: null,
      height,
      weight,
      nationality,
      preferredFoot,
      bio,
      createdAt: new Date().toISOString(),
      synced: false,
    };

    // 1) Save to local DB
    const updatedLocal = [...localPlayers, basePlayerData];
    saveLocalPlayers(updatedLocal);

    console.log("[AddPlayer] Player stored locally:", basePlayerData);

    // 2) Try to sync to backend if possible
    if (typeof onAddPlayer === "function") {
      try {
        const online =
          typeof navigator !== "undefined" ? navigator.onLine : true;

        if (online) {
          const maybePromise = onAddPlayer(basePlayerData);

          // Support async or sync handler
          if (
            maybePromise &&
            typeof (maybePromise as Promise<void>).then === "function"
          ) {
            await (maybePromise as Promise<void>);
          }

          // Mark as synced in local DB
          const withSyncedFlag = updatedLocal.map((p) =>
            p.id === localId ? { ...p, synced: true } : p
          );
          saveLocalPlayers(withSyncedFlag);

          console.log(
            "[AddPlayer] Player synced to backend successfully."
          );
        } else {
          console.log(
            "[AddPlayer] Offline detected, will keep player as unsynced."
          );
        }
      } catch (err) {
        console.error(
          "[AddPlayer] Failed to sync player to backend, keeping unsynced:",
          err
        );
        // leave synced:false so a separate sync routine can retry later
      }
    }

    // 3) Go back to previous screen
    onBack();
  };

  return (
    <div className="p-6 space-y-6 pb-24">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-medium">Add Player</h1>
      </div>

      <div className="space-y-6">
        {/* Primary Fields */}
        <div className="space-y-4 pb-4 border-b-2 border-purple-100">
          <div>
            <label className="block text-sm font-medium mb-2">
              Player Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Enter player name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="py-3 border border-gray-300 rounded-lg"
            />
            {isDuplicateName && (
              <p className="text-red-500 text-sm mt-1">
                There is an existing player under the same name, add phone
                number to differentiate
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Phone Number
            </label>
            <Input
              type="tel"
              placeholder="Enter 10-digit phone number (optional)"
              value={phoneNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                if (value.length <= 10) {
                  setPhoneNumber(value);
                }
              }}
              className={`py-3 border rounded-lg ${
                phoneNumber && !isPhoneValid
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
              maxLength={10}
            />
            {phoneNumber && !isPhoneValid && (
              <p className="text-red-500 text-sm mt-1">
                Please enter a valid number
              </p>
            )}
          </div>
        </div>

        {/* Optional Fields */}
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Optional Information</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Date of Birth
              </label>
              <div className="relative">
                <Input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="py-3 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Jersey Number
              </label>
              <Input
                type="number"
                placeholder="Number"
                value={jerseyNumber}
                onChange={(e) => setJerseyNumber(e.target.value)}
                className="py-3 border border-gray-300 rounded-lg"
                min={1}
                max={99}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Position
          </label>
          <Select value={position} onValueChange={setPosition}>
            <SelectTrigger className="py-3 border border-gray-300 rounded-lg">
              <SelectValue placeholder="Select position" />
            </SelectTrigger>
            <SelectContent>
              {positions.map((pos) => (
                <SelectItem
                  key={pos}
                  value={pos.toLowerCase().replace(/\s+/g, "_")}
                >
                  {pos}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Team
          </label>
          <Select value={team} onValueChange={setTeam}>
            <SelectTrigger className="py-3 border border-gray-300 rounded-lg">
              <SelectValue placeholder="Select team (optional)" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((teamName) => (
                <SelectItem key={teamName} value={toKey(teamName)}>
                  {teamName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Height (cm)
            </label>
            <Input
              type="number"
              placeholder="Height"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="py-3 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text.sm font-medium mb-2">
              Weight (kg)
            </label>
            <Input
              type="number"
              placeholder="Weight"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="py-3 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Nationality
            </label>
            <Input
              placeholder="Nationality"
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              className="py-3 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Preferred Foot
            </label>
            <Select
              value={preferredFoot}
              onValueChange={setPreferredFoot}
            >
              <SelectTrigger className="py-3 border border-gray-300 rounded-lg">
                <SelectValue placeholder="Select foot" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="right">Right</SelectItem>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Bio
          </label>
          <Textarea
            placeholder="Enter player bio (optional)"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="border border-gray-300 rounded-lg"
            rows={3}
          />
        </div>

        <div className="flex gap-4">
          <Button
            onClick={onBack}
            variant="outline"
            className="flex-1 py-3 border-gray-300 rounded-lg"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
            disabled={!isFormValid}
          >
            Register Player
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddPlayer;
