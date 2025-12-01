import React, { useState, useEffect } from "react";
import { User, UserPlus, Search, ChevronRight, Loader2, Target } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

type ManagePlayersScreenProps = {
  onBack: () => void;
};

type Player = {
  id: string;
  full_name: string;
  default_position?: string;
  jersey_number?: number;
  team_name?: string;
};

const ManagePlayersScreen: React.FC<ManagePlayersScreenProps> = ({ onBack }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerPosition, setNewPlayerPosition] = useState("");
  const [newPlayerJersey, setNewPlayerJersey] = useState("");
  const [saving, setSaving] = useState(false);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("players")
        .select("id, full_name, default_position, jersey_number")
        .order("full_name");

      if (error) throw error;
      setPlayers(data || []);
    } catch (err) {
      console.error("[ManagePlayersScreen] Failed to load players", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlayers();
  }, []);

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) return;

    try {
      setSaving(true);
      const playerData: any = { full_name: newPlayerName.trim() };
      if (newPlayerPosition.trim()) {
        playerData.default_position = newPlayerPosition.trim();
      }
      if (newPlayerJersey.trim()) {
        playerData.jersey_number = parseInt(newPlayerJersey, 10);
      }

      const { error } = await supabase.from("players").insert(playerData);

      if (error) throw error;

      setNewPlayerName("");
      setNewPlayerPosition("");
      setNewPlayerJersey("");
      setShowAddForm(false);
      await loadPlayers();
    } catch (err) {
      console.error("[ManagePlayersScreen] Failed to add player", err);
      alert("Failed to add player. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const filteredPlayers = players.filter((p) =>
    p.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const positions = ["Goalkeeper", "Defender", "Midfielder", "Forward"];

  return (
    <div className="px-4 py-5 space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Player Database</span>
        </div>
        <p className="text-sm text-slate-500">Central roster across all teams</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search players..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
          <User className="w-12 h-12 mx-auto mb-3 text-slate-400" />
          <p className="text-sm font-medium text-slate-700 mb-1">
            {players.length === 0 ? "No players yet" : "No players found"}
          </p>
          <p className="text-xs text-slate-500">
            {players.length === 0
              ? "Add your first player to get started"
              : "Try a different search"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPlayers.map((player) => (
            <button
              key={player.id}
              className="w-full flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-4 hover:border-emerald-200 hover:shadow-sm transition-all active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center relative">
                <span className="text-lg font-bold text-emerald-700">{player.full_name.charAt(0)}</span>
                {player.jersey_number && (
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {player.jersey_number}
                  </span>
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-slate-900">{player.full_name}</p>
                {player.default_position && (
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    {player.default_position}
                  </p>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          ))}
        </div>
      )}

      {showAddForm ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <p className="text-sm font-medium text-slate-900">Add New Player</p>
          <input
            type="text"
            placeholder="Player name"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={newPlayerPosition}
              onChange={(e) => setNewPlayerPosition(e.target.value)}
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Position (optional)</option>
              {positions.map((pos) => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Jersey #"
              value={newPlayerJersey}
              onChange={(e) => setNewPlayerJersey(e.target.value)}
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewPlayerName("");
                setNewPlayerPosition("");
                setNewPlayerJersey("");
              }}
              className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddPlayer}
              disabled={saving || !newPlayerName.trim()}
              className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Add Player"
              )}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-xl py-3.5 text-sm font-medium hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/25"
        >
          <UserPlus className="w-5 h-5" />
          Add Player
        </button>
      )}
    </div>
  );
};

export default ManagePlayersScreen;
