import React, { useState, useEffect } from "react";
import { Users, Plus, Search, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

type ManageTeamsScreenProps = {
  onBack: () => void;
};

type Team = {
  id: string;
  name: string;
  short_name?: string;
  playerCount?: number;
};

const ManageTeamsScreen: React.FC<ManageTeamsScreenProps> = ({ onBack }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [saving, setSaving] = useState(false);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, short_name")
        .order("name");

      if (error) throw error;
      setTeams(data || []);
    } catch (err) {
      console.error("[ManageTeamsScreen] Failed to load teams", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const handleAddTeam = async () => {
    if (!newTeamName.trim()) return;
    
    try {
      setSaving(true);
      const { error } = await supabase
        .from("teams")
        .insert({ name: newTeamName.trim() });

      if (error) throw error;

      setNewTeamName("");
      setShowAddForm(false);
      await loadTeams();
    } catch (err) {
      console.error("[ManageTeamsScreen] Failed to add team", err);
      alert("Failed to add team. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const filteredTeams = teams.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="px-4 py-5 space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-4 h-4 text-purple-500" />
          <span className="text-xs font-medium text-purple-600 uppercase tracking-wide">Team Management</span>
        </div>
        <p className="text-sm text-slate-500">Manage your squads and rosters</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search teams..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
          <Users className="w-12 h-12 mx-auto mb-3 text-slate-400" />
          <p className="text-sm font-medium text-slate-700 mb-1">
            {teams.length === 0 ? "No teams yet" : "No teams found"}
          </p>
          <p className="text-xs text-slate-500">
            {teams.length === 0
              ? "Add your first team to get started"
              : "Try a different search"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTeams.map((team) => (
            <button
              key={team.id}
              className="w-full flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-4 hover:border-purple-200 hover:shadow-sm transition-all active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-lg font-bold text-purple-700">{team.name.charAt(0)}</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-slate-900">{team.name}</p>
                {team.short_name && (
                  <p className="text-xs text-slate-500">{team.short_name}</p>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          ))}
        </div>
      )}

      {showAddForm ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <p className="text-sm font-medium text-slate-900">Add New Team</p>
          <input
            type="text"
            placeholder="Team name"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-purple-500"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewTeamName("");
              }}
              className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddTeam}
              disabled={saving || !newTeamName.trim()}
              className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Add Team"
              )}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white rounded-xl py-3.5 text-sm font-medium hover:bg-purple-700 active:scale-[0.98] transition-all shadow-lg shadow-purple-500/25"
        >
          <Plus className="w-5 h-5" />
          Add Team
        </button>
      )}
    </div>
  );
};

export default ManageTeamsScreen;
