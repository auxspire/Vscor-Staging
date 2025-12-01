import React, { useState, useRef, useEffect, ChangeEvent, FormEvent } from "react";
import { Search, Plus, ChevronDown, Clock, Users, MapPin } from "lucide-react";
import AddTeam from "./AddTeam";
import { supabase } from "../lib/supabaseClient";

type TeamAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  onAddTeam: () => void;
  placeholder: string;
  teamsList: string[];
  label: string;
};

export type MatchDetails = {
  team1: string;
  team2: string;
  matchFormat: string;
  duration: string;
  venue: string;
  playersPerTeam: string;
  scoreA: number;
  scoreB: number;
  startTime: Date;
  events: any[];
  fixtureId?: string | number | null;
  tournamentId?: string | number | null;
  team1FullRoster?: any[];
  team2FullRoster?: any[];
  id?: string | number;
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
  onAssignPlayerToTeam?: (playerId: string | number, teamId: string | number) => void;
  onAddPlayer?: (player: any) => void;
  fixtureContext?: FixtureContext | null;
};

const TeamAutocomplete: React.FC<TeamAutocompleteProps> = ({
  value,
  onChange,
  onAddTeam,
  placeholder,
  teamsList,
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState<string>(value);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
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
    <div ref={wrapperRef} className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
        <input
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />

        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
            {filteredTeams.length > 0 && filteredTeams.map((team, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelectTeam(team)}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm text-slate-900 transition-colors border-b border-slate-100 last:border-b-0"
              >
                {team}
              </button>
            ))}
            {filteredTeams.length === 0 && inputValue && (
              <div className="px-4 py-3 text-slate-500 text-sm">No teams found</div>
            )}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onAddTeam();
              }}
              className="w-full text-left px-4 py-3 hover:bg-purple-50 text-purple-600 flex items-center gap-2 text-sm font-medium border-t border-slate-100"
            >
              <Plus className="w-4 h-4" />
              Add New Team
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const MATCH_FORMATS = [
  { value: "5-a-side", label: "5-a-side", players: 5, duration: 40 },
  { value: "7-a-side", label: "7-a-side", players: 7, duration: 60 },
  { value: "11-a-side", label: "11-a-side", players: 11, duration: 90 },
  { value: "custom", label: "Custom", players: 0, duration: 0 },
];

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
  const [availableTeams, setAvailableTeams] = useState<string[]>(registeredTeams);
  const [loadingTeams, setLoadingTeams] = useState(false);

  useEffect(() => {
    if (!fixtureContext) return;
    setTeam1((prev) => prev || fixtureContext.teamA || "");
    setTeam2((prev) => prev || fixtureContext.teamB || "");
    setVenue((prev) => prev || fixtureContext.venue || "");
    if (!duration && fixtureContext.durationMinutes != null) {
      setDuration(String(fixtureContext.durationMinutes));
    }
  }, [fixtureContext, duration]);

  useEffect(() => {
    if (registeredTeams && registeredTeams.length > 0) {
      setAvailableTeams(registeredTeams);
    }
  }, [registeredTeams]);

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
        if (!cancelled) setLoadingTeams(false);
      }
    };

    loadTeams();
    return () => { cancelled = true; };
  }, [registeredTeams, availableTeams.length]);

  const handleFormatChange = (formatValue: string) => {
    setMatchFormat(formatValue);
    const format = MATCH_FORMATS.find((f) => f.value === formatValue);
    if (format && format.value !== "custom") {
      setPlayersPerTeam(String(format.players));
      setDuration(String(format.duration));
    }
  };

  const handleTeam1Change = (value: string) => {
    setTeam1(value);
    if (value && value === team2) {
      setSameTeamError("Teams cannot be the same");
    } else {
      setSameTeamError("");
    }
  };

  const handleTeam2Change = (value: string) => {
    setTeam2(value);
    if (value && value === team1) {
      setSameTeamError("Teams cannot be the same");
    } else {
      setSameTeamError("");
    }
  };

  const isFormValid = team1 && team2 && matchFormat && duration && playersPerTeam && !sameTeamError;

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

  if (showAddTeam) {
    return (
      <AddTeam
        onBack={() => setShowAddTeam(false)}
        onAddTeam={onAddTeam}
        playerDatabase={playerDatabase}
        onAssignPlayerToTeam={onAssignPlayerToTeam}
        onAddPlayer={onAddPlayer}
      />
    );
  }

  return (
    <div className="px-4 py-5 space-y-6">
      <div>
        <p className="text-sm text-slate-500">
          Set up your match details and proceed to squad selection
        </p>
      </div>

      {sameTeamError && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          {sameTeamError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <TeamAutocomplete
          value={team1}
          onChange={handleTeam1Change}
          onAddTeam={() => setShowAddTeam(true)}
          placeholder="Search or add team"
          teamsList={availableTeams}
          label="Home Team"
        />

        <TeamAutocomplete
          value={team2}
          onChange={handleTeam2Change}
          onAddTeam={() => setShowAddTeam(true)}
          placeholder="Search or add team"
          teamsList={availableTeams}
          label="Away Team"
        />

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Match Format</label>
          <div className="grid grid-cols-2 gap-2">
            {MATCH_FORMATS.map((format) => (
              <button
                key={format.value}
                type="button"
                onClick={() => handleFormatChange(format.value)}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  matchFormat === format.value
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {format.label}
              </button>
            ))}
          </div>
        </div>

        {matchFormat === "custom" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                <Users className="w-4 h-4" />
                Players/Team
              </label>
              <input
                type="number"
                placeholder="e.g. 6"
                value={playersPerTeam}
                onChange={(e) => setPlayersPerTeam(e.target.value)}
                min={1}
                max={22}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Duration (min)
              </label>
              <input
                type="number"
                placeholder="e.g. 50"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            Venue (optional)
          </label>
          <input
            type="text"
            placeholder="Stadium or ground name"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <button
          type="submit"
          disabled={!isFormValid}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white rounded-xl py-4 text-sm font-semibold hover:bg-purple-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25"
        >
          Select Squad
          <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
        </button>
      </form>
    </div>
  );
};

export default NewMatch;
