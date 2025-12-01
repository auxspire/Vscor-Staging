import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Trophy, Calendar, Loader2, Plus, ChevronRight, MapPin } from "lucide-react";

export type TournamentSummary = {
  id: string;
  name: string;
  status?: string | null;
  season?: string | null;
  country?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  venue?: string | null;
  logoUrl?: string | null;
};

type Props = {
  onBack: () => void;
  onTournamentClick: (t: TournamentSummary) => void;
  tournaments?: TournamentSummary[];
};

const TournamentListScreen: React.FC<Props> = ({
  onBack,
  onTournamentClick,
  tournaments: initialTournaments = [],
}) => {
  const [tournaments, setTournaments] = useState<TournamentSummary[]>(initialTournaments);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSeason, setNewSeason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: loadError } = await supabase
          .from("tournaments")
          .select("id, name, status, season, country, start_date, end_date, venue, logo_url")
          .order("created_at", { ascending: false });

        if (loadError) throw loadError;

        if (!cancelled && data) {
          const mapped: TournamentSummary[] = data.map((t: any) => ({
            id: t.id,
            name: t.name,
            status: t.status,
            season: t.season,
            country: t.country,
            startDate: t.start_date,
            endDate: t.end_date,
            venue: t.venue,
            logoUrl: t.logo_url,
          }));
          setTournaments(mapped);
        }
      } catch (e: any) {
        console.error("[TournamentListScreen] load error", e);
        if (!cancelled) {
          setError(e?.message || "Failed to load tournaments");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const handleAddTournament = async () => {
    if (!newName.trim()) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from("tournaments")
        .insert({ name: newName.trim(), season: newSeason.trim() || null });

      if (error) throw error;

      setNewName("");
      setNewSeason("");
      setShowAddForm(false);
      
      const { data } = await supabase
        .from("tournaments")
        .select("id, name, status, season, country, start_date, end_date, venue, logo_url")
        .order("created_at", { ascending: false });

      if (data) {
        setTournaments(data.map((t: any) => ({
          id: t.id,
          name: t.name,
          status: t.status,
          season: t.season,
          country: t.country,
          startDate: t.start_date,
          endDate: t.end_date,
          venue: t.venue,
          logoUrl: t.logo_url,
        })));
      }
    } catch (err) {
      console.error("[TournamentListScreen] Failed to add", err);
      alert("Failed to add tournament. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "";
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return "";
    }
  };

  return (
    <div className="px-4 py-5 space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-medium text-amber-600 uppercase tracking-wide">Tournaments</span>
        </div>
        <p className="text-sm text-slate-500">Manage your leagues and competitions</p>
      </div>

      {showAddForm ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <p className="text-sm font-medium text-slate-900">Create Tournament</p>
          <input
            type="text"
            placeholder="Tournament name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-amber-500"
            autoFocus
          />
          <input
            type="text"
            placeholder="Season (e.g. 2024-25)"
            value={newSeason}
            onChange={(e) => setNewSeason(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-amber-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewName("");
                setNewSeason("");
              }}
              className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddTournament}
              disabled={saving || !newName.trim()}
              className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-between bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl p-4 shadow-lg shadow-amber-500/25 active:scale-[0.98] transition-all"
        >
          <div className="text-left">
            <p className="text-sm font-semibold">Create Tournament</p>
            <p className="text-xs text-amber-100">Set up a new league or cup</p>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </div>
        </button>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          {error}
        </div>
      )}

      {loading && tournaments.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
        </div>
      ) : tournaments.length === 0 ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
          <Trophy className="w-12 h-12 mx-auto mb-3 text-slate-400" />
          <p className="text-sm font-medium text-slate-700 mb-1">No tournaments yet</p>
          <p className="text-xs text-slate-500">Create your first tournament to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tournaments.map((t) => (
            <button
              key={t.id}
              onClick={() => onTournamentClick(t)}
              className="w-full flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-4 hover:border-amber-200 hover:shadow-sm transition-all active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-amber-700" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  {t.season && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {t.season}
                    </span>
                  )}
                  {t.venue && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {t.venue}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className={`px-2 py-1 text-[10px] font-semibold rounded-full ${
                  t.status?.toLowerCase() === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-600"
                }`}>
                  {t.status || "UPCOMING"}
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TournamentListScreen;
