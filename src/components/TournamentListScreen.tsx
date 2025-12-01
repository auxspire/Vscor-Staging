// src/components/TournamentListScreen.tsx
// Tournament list view with card-style UI, mobile-friendly.
// @ts-nocheck

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  ArrowLeft,
  Trophy,
  Calendar,
  Loader2,
  Flag,
  Plus,
} from "lucide-react";
import { AppCard, AppCardTitle } from "./ui/AppCard";

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
  tournaments?: TournamentSummary[]; // App can pass [] or preload
};

const TournamentListScreen: React.FC<Props> = ({
  onBack,
  onTournamentClick,
  tournaments: initialTournaments = [],
}) => {
  const [tournaments, setTournaments] =
    useState<TournamentSummary[]>(initialTournaments);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------
  // Load tournaments from DB
  // ---------------------------
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: loadError } = await supabase
          .from("tournaments")
          .select(
            "id, name, status, season, country, start_date, end_date, venue, logo_url"
          )
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
    return () => {
      cancelled = true;
    };
  }, []);

  const formatDate = (value?: string | null) => {
    if (!value) return "";
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return "";
    }
  };

  // ---------------------------
  // Header
  // ---------------------------
  const renderHeader = () => (
    <div className="flex items-center justify-between mb-3">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-2xl bg-purple-600 flex items-center justify-center shadow-md shadow-purple-900/30">
          <Trophy className="w-4 h-4 text-white" />
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
            VScor
          </p>
          <p className="text-xs font-semibold text-slate-900">
            Tournaments
          </p>
        </div>
      </div>
    </div>
  );

  // ---------------------------
  // “Create tournament” CTA (UI only; no DB write yet)
  // ---------------------------
  const renderCreateCta = () => (
    <button
      type="button"
      // later: onClick={() => setShowCreateTournament(true)}
      className="w-full mb-2 rounded-2xl border border-dashed border-purple-300 bg-purple-50/80 px-4 py-3 flex items-center justify-between active:scale-[0.99] transition-transform"
    >
      <div className="text-left">
        <div className="text-[10px] uppercase tracking-[0.18em] text-purple-500">
          New Tournament
        </div>
        <div className="text-sm font-semibold text-purple-900">
          Create tournament
        </div>
        <div className="text-[11px] text-purple-700 mt-0.5">
          Name, season, venue & teams
        </div>
      </div>
      <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center shadow-md">
        <Plus className="w-4 h-4 text-white" />
      </div>
    </button>
  );

  // ---------------------------
  // List
  // ---------------------------
  const renderList = () => {
    if (loading && tournaments.length === 0) {
      return (
        <AppCard>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
          </div>
        </AppCard>
      );
    }

    if (error) {
      return (
        <AppCard>
          <AppCardTitle
            title="Tournaments"
            subtitle="We could not load tournaments."
          />
          <p className="mt-2 text-xs text-red-600">{error}</p>
        </AppCard>
      );
    }

    if (!tournaments.length) {
      return (
        <AppCard>
          <AppCardTitle
            title="No tournaments yet"
            subtitle="Once you have at least one tournament, it will show here."
          />
          <p className="mt-2 text-xs text-slate-500">
            Use the “Create tournament” action above to set up your first
            competition.
          </p>
        </AppCard>
      );
    }

    return (
      <div className="space-y-2">
        {tournaments.map((t) => (
          <AppCard
            key={t.id}
            onClick={() => onTournamentClick(t)}
            className="flex items-center justify-between active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-purple-700" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  {t.name}
                </p>
                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                  {t.season && (
                    <>
                      <Calendar className="w-3 h-3" />
                      <span>{t.season}</span>
                    </>
                  )}
                  {t.country && (
                    <>
                      {t.season && <span className="mx-1">•</span>}
                      <Flag className="w-3 h-3" />
                      <span>{t.country}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-500">
              <span className="font-medium">
                {t.status || "UPCOMING"}
              </span>
              {t.startDate && (
                <div className="mt-0.5">{formatDate(t.startDate)}</div>
              )}
            </div>
          </AppCard>
        ))}
      </div>
    );
  };

  // ---------------------------
  // Layout
  // ---------------------------
  return (
    <div className="px-4 py-4 space-y-3">
      {renderHeader()}
      {renderCreateCta()}
      {renderList()}
    </div>
  );
};

export default TournamentListScreen;
