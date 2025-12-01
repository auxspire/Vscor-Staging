// src/components/NewMatch.tsx
import React, {
  useState,
  useRef,
  useEffect,
  ChangeEvent,
  FormEvent,
} from "react";
import { ArrowLeft, Search, Plus, Info } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import AddTeam from "./AddTeam";
import { supabase } from "../lib/supabaseClient";

// -----------------------------
// Types
// -----------------------------

type TeamAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  onAddTeam: () => void;
  placeholder: string;
  teamsList: string[];
};

export type MatchDetails = {
  team1: string;
  team2: string;
  matchFormat: string;
  duration: string; // minutes as string
  venue: string;
  playersPerTeam: string;
  scoreA: number;
  scoreB: number;
  startTime: Date;
  events: any[];
  // Fixture linkage (optional)
  fixtureId?: string | number | null;
  tournamentId?: string | number | null;
};

export type FixtureContext = {
  fixtureId: string | number;
  teamA?: string | null;
  teamB?: string | null;
  venue?: string | null;
  durationMinutes?: number | null;
  tournamentId?: string | number | null;
};

type NewMatchProps = {
  onBack: () => void;
  onSelectSquad?: (matchDetails: MatchDetails) => void;
  registeredTeams?: string[];
  onAddTeam: (team: any) => void;
  playerDatabase?: any[];
  onAssignPlayerToTeam?: (
    playerId: string | number,
    teamId: string | number
  ) => void;
  onAddPlayer?: (player: any) => void;
  fixtureContext?: FixtureContext | null;
};

// -----------------------------
// TeamAutocomplete
// -----------------------------

const TeamAutocomplete: React.FC<TeamAutocompleteProps> = ({
  value,
  onChange,
  onAddTeam,
  placeholder,
  teamsList,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState<string>(value);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredTeams = teamsList.filter((team) =>
    team.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleSelectTeam = (team: string) => {
    setInputValue(team);
    onChange(team);
    setIsOpen(false);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    onChange(e.target.value);
    setIsOpen(true);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
      <Input
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        className="pl-10 py-3.5 border border-slate-200 rounded-2xl text-sm"
      />

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-lg max-h-64 overflow-y-auto">
          {filteredTeams.length > 0 ? (
            <>
              {filteredTeams.map((team, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelectTeam(team)}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm text-slate-700 transition-colors border-b border-slate-100 last:border-b-0"
                >
                  {team}
                </button>
              ))}
            </>
          ) : (
            inputValue && (
              <div className="px-4 py-3 text-slate-400 text-xs">
                No teams found
              </div>
            )
          )}

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onAddTeam();
            }}
            className="w-full text-left px-4 py-3 hover:bg-purple-50 text-purple-600 flex items-center gap-2 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Add Team</span>
          </button>
        </div>
      )}
    </div>
  );
};

// -----------------------------
// NewMatch (mobile-first)
// -----------------------------

const NewMatch: React.FC<NewMatchProps> = ({
  onBack,
  onSelectSquad,
  registeredTeams = [],
  onAddTeam,
  playerDatabase = [],
  onAssignPlayerToTeam,
  onAddPlayer,
  fixtureContext = null,
}) => {
  const [team1, setTeam1] = useState<string>("");
  const [team2, setTeam2] = useState<string>("");
  const [matchFormat, setMatchFormat] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [venue, setVenue] = useState<string>("");
  const [playersPerTeam, setPlayersPerTeam] = useState<string>("");
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [sameTeamError, setSameTeamError] = useState<string>("");

  // Real team list (from parent OR Supabase)
  const [availableTeams, setAvailableTeams] = useState<string[]>(registeredTeams);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // 🔁 Pre-fill from fixture context (but don't override user edits)
  useEffect(() => {
    if (!fixtureContext) return;

    setTeam1((prev) => prev || fixtureContext.teamA || "");
    setTeam2((prev) => prev || fixtureContext.teamB || "");
    setVenue((prev) => prev || fixtureContext.venue || "");
    if (!duration && fixtureContext.durationMinutes != null) {
      setDuration(String(fixtureContext.durationMinutes));
    }
  }, [fixtureContext, duration]);

  // Keep local list in sync with parent-provided teams
  useEffect(() => {
    if (registeredTeams && registeredTeams.length > 0) {
      setAvailableTeams(registeredTeams);
    }
  }, [registeredTeams]);

  // If no teams passed in, load from Supabase `teams` table
  useEffect(() => {
    if (registeredTeams && registeredTeams.length > 0) return;
    if (availableTeams.length > 0) return;

    let cancelled = false;

    const loadTeams = async () => {
      try {
        setLoadingTeams(true);
        const { data, error } = await supabase
          .from("teams")
          .select("name")
          .order("name", { ascending: true });

        if (error) {
          console.error("[NewMatch] teams load error:", error);
          return;
        }

        if (!cancelled && data) {
          const names = data
            .map((row: any) => row.name as string | null)
            .filter((n): n is string => !!n);

          setAvailableTeams(Array.from(new Set(names)));
        }
      } catch (e) {
        console.error("[NewMatch] unexpected teams load error:", e);
      } finally {
        if (!cancelled) {
          setLoadingTeams(false);
        }
      }
    };

    loadTeams();

    return () => {
      cancelled = true;
    };
  }, [registeredTeams, availableTeams.length]);

  const handleTeam1Change = (value: string) => {
    setTeam1(value);
    if (value && value === team2) {
      setSameTeamError("Home and Away teams cannot be the same.");
    } else {
      setSameTeamError("");
    }
  };

  const handleTeam2Change = (value: string) => {
    setTeam2(value);
    if (value && value === team1) {
      setSameTeamError("Home and Away teams cannot be the same.");
    } else {
      setSameTeamError("");
    }
  };

  const isFormValid =
    team1 &&
    team2 &&
    matchFormat &&
    duration &&
    playersPerTeam &&
    !sameTeamError;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    const matchDetails: MatchDetails = {
      team1,
      team2,
      matchFormat,
      duration,
      venue,
      playersPerTeam,
      scoreA: 0,
      scoreB: 0,
      startTime: new Date(),
      events: [],
      fixtureId: fixtureContext?.fixtureId ?? null,
      tournamentId: fixtureContext?.tournamentId ?? null,
    };

    onSelectSquad?.(matchDetails);
  };

  const handleAddTeamBack = () => {
    setShowAddTeam(false);
  };

  // Full-screen AddTeam mode
  if (showAddTeam) {
    return (
      <AddTeam
        onBack={handleAddTeamBack}
        onAddTeam={onAddTeam}
        playerDatabase={playerDatabase}
        onAssignPlayerToTeam={onAssignPlayerToTeam}
        onAddPlayer={onAddPlayer}
      />
    );
  }

  // -----------------------------
  // Mobile-first layout
  // -----------------------------
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <div className="max-w-md mx-auto w-full bg-white text-slate-900 pb-24 flex-1 flex flex-col">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-slate-100">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full p-2 hover:bg-slate-100 active:scale-95 transition"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
              Match Setup
            </span>
            <h1 className="text-lg font-semibold text-slate-900">
              {fixtureContext ? "New Match from Fixture" : "New Match"}
            </h1>
          </div>
        </div>

        {/* Fixture context pill (if any) */}
        {fixtureContext && (
          <div className="px-4 pt-2">
            <div className="flex items-start gap-2 rounded-2xl border border-purple-100 bg-purple-50 px-3 py-2.5 text-xs text-purple-900">
              <Info className="w-4 h-4 mt-[2px] text-purple-700 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">
                  Linked Fixture #
                  {String(fixtureContext.fixtureId).slice(0, 8)}
                </p>
                <p className="mt-0.5">
                  {fixtureContext.teamA || "Home"} vs{" "}
                  {fixtureContext.teamB || "Away"}
                  {fixtureContext.venue && ` · ${fixtureContext.venue}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="px-4 pt-3 space-y-5 flex-1 overflow-y-auto"
        >
          {sameTeamError && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-2xl text-xs">
              {sameTeamError}
            </div>
          )}

          {/* Teams */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-600 px-1">
                Home Team
              </label>
              <TeamAutocomplete
                value={team1}
                onChange={handleTeam1Change}
                onAddTeam={() => setShowAddTeam(true)}
                placeholder="Search or add home team"
                teamsList={availableTeams}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-600 px-1">
                Away Team
              </label>
              <TeamAutocomplete
                value={team2}
                onChange={handleTeam2Change}
                onAddTeam={() => setShowAddTeam(true)}
                placeholder="Search or add away team"
                teamsList={availableTeams}
              />
            </div>

            <p className="text-[11px] text-slate-500 px-1">
              Use{" "}
              <span className="font-medium text-purple-600">Add Team</span> if
              your squad isn&apos;t registered yet.
            </p>

            {loadingTeams && availableTeams.length === 0 && (
              <p className="text-[10px] text-slate-400 px-1">
                Loading teams from VScor…
              </p>
            )}
          </div>

          {/* Match format */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-slate-600 px-1">
              Match format
            </label>
            <Select
              value={matchFormat}
              onValueChange={(val: string) => setMatchFormat(val)}
            >
              <SelectTrigger className="w-full rounded-2xl border border-slate-200 h-11 text-sm px-3">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single match</SelectItem>
                <SelectItem value="league">League game</SelectItem>
                <SelectItem value="knockout">Knockout</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-slate-600 px-1">
              Duration (minutes)
            </label>
            <Input
              type="number"
              placeholder="e.g. 90"
              value={duration}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setDuration(e.target.value)
              }
              className="py-3.5 border border-slate-200 rounded-2xl text-sm"
            />
            <p className="text-[10px] text-slate-400 px-1">
              You can use 60, 30 etc. for shorter formats.
            </p>
          </div>

          {/* Venue */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-slate-600 px-1">
              Venue (optional)
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Ground / pitch name"
                value={venue}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setVenue(e.target.value)
                }
                className="pl-10 py-3.5 border border-slate-200 rounded-2xl text-sm"
              />
            </div>
          </div>

          {/* Players per team */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-slate-600 px-1">
              Players per team
            </label>
            <Input
              type="number"
              placeholder="e.g. 7 or 11"
              value={playersPerTeam}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const value = e.target.value;
                const asNum = parseInt(value, 10);
                if (Number.isNaN(asNum)) {
                  setPlayersPerTeam(value);
                  return;
                }
                if (asNum < 1) return;
                if (asNum > 22) return;
                setPlayersPerTeam(value);
              }}
              className="py-3.5 border border-slate-200 rounded-2xl text-sm"
            />
          </div>

          {/* CTA */}
          <div className="pt-1 pb-6">
            <Button
              type="submit"
              className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-sm font-semibold"
              disabled={!isFormValid}
            >
              Select Squad
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewMatch;
