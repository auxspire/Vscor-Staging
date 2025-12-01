// src/components/ScoringTab.tsx
import React, { useState } from "react";
import { Plus, Edit2, Flag, Users, UserPlus } from "lucide-react";
import { Button } from "./ui/button";
import {
  VSSection,
  VSQuickAction,
  VSMatchCard,
  VSPill,
} from "./ui/vscor-ui";

export type ScoringMatch = {
  id: string | number;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  status?: string | null;
  tournamentName?: string | null;
};

type ScoringTabProps = {
  ongoingMatches: ScoringMatch[];
  completedMatches: ScoringMatch[];
  onNewMatch: () => void;
  onAddTeam: () => void;
  onAddPlayer: () => void;
  onAddTournament: () => void;
  onMatchClick: (match: ScoringMatch) => void;
  onEditResult?: (
    matchId: string | number,
    homeScore: number,
    awayScore: number
  ) => void;
};

const ScoringTab: React.FC<ScoringTabProps> = ({
  ongoingMatches,
  completedMatches,
  onNewMatch,
  onAddTeam,
  onAddPlayer,
  onAddTournament,
  onMatchClick,
  onEditResult,
}) => {
  const [editOpen, setEditOpen] = useState(false);
  const [editMatch, setEditMatch] = useState<ScoringMatch | null>(null);
  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const openEdit = (match: ScoringMatch) => {
    setEditMatch(match);
    setHomeScore(match.scoreA ?? 0);
    setAwayScore(match.scoreB ?? 0);
    setEditOpen(true);
  };

  const closeEdit = () => {
    if (saving) return;
    setEditOpen(false);
    setEditMatch(null);
  };

  const handleSave = async () => {
    if (!editMatch || !onEditResult) {
      setEditOpen(false);
      return;
    }
    setSaving(true);
    try {
      await onEditResult(editMatch.id, homeScore, awayScore);
      setEditOpen(false);
      setEditMatch(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-2">
      {/* Quick Actions */}
      <VSSection
        title="Quick actions"
        subtitle="Fast paths into your scoring workflow"
      >
        <div className="grid grid-cols-2 gap-3">
          <VSQuickAction
            icon={Plus}
            label="New Match"
            hint="Kick off a fresh game"
            variant="primary"
            onClick={onNewMatch}
          />
          <VSQuickAction
            icon={Flag}
            label="Add Tournament"
            hint="League / cup setup"
            variant="secondary"
            onClick={onAddTournament}
          />
          <VSQuickAction
            icon={Users}
            label="Teams"
            hint="Add / manage squads"
            onClick={onAddTeam}
          />
          <VSQuickAction
            icon={UserPlus}
            label="Players"
            hint="Maintain your roster"
            onClick={onAddPlayer}
          />
        </div>
      </VSSection>

      {/* Ongoing matches */}
      {ongoingMatches.length > 0 && (
        <VSSection
          title="Live matches"
          subtitle="Tap a match to open full event stream"
        >
          <div className="space-y-2">
            {ongoingMatches.map((m) => (
              <VSMatchCard
                key={m.id}
                teamA={m.teamA}
                teamB={m.teamB}
                scoreA={m.scoreA}
                scoreB={m.scoreB}
                tournamentName={m.tournamentName}
                statusTone="live"
                statusLabel={m.status || "Live"}
                metaLine={m.tournamentName || undefined}
                onClick={() => onMatchClick(m)}
              />
            ))}
          </div>
        </VSSection>
      )}

      {/* Recently finished matches */}
      <VSSection
        title="Recent matches"
        subtitle={
          completedMatches.length
            ? "Latest full-time results you’ve scored"
            : "Start a match to see results here"
        }
      >
        {completedMatches.length === 0 ? (
          <div className="border border-dashed border-slate-600/60 rounded-2xl p-4 text-[12px] text-slate-400 bg-slate-900/60">
            No matches recorded yet. Start a{" "}
            <button
              className="underline text-purple-300 font-medium"
              onClick={onNewMatch}
            >
              new match
            </button>{" "}
            to see full-time results here.
          </div>
        ) : (
          <div className="space-y-2">
            {completedMatches.map((m) => {
              const status = (m.status ?? "Final").toLowerCase();
              const tone =
                status.includes("live") || status.includes("playing")
                  ? "live"
                  : status.includes("upcoming") || status.includes("scheduled")
                  ? "upcoming"
                  : "finished";

              return (
                <VSMatchCard
                  key={m.id}
                  teamA={m.teamA}
                  teamB={m.teamB}
                  scoreA={m.scoreA}
                  scoreB={m.scoreB}
                  tournamentName={m.tournamentName}
                  statusTone={tone as any}
                  statusLabel={m.status || "Final"}
                  metaLine={m.tournamentName || undefined}
                  onClick={() => onMatchClick(m)}
                  rightSlot={
                    onEditResult ? (
                      <button
                        type="button"
                        className="mt-1 inline-flex items-center justify-center rounded-full border border-slate-500/60 px-2 py-1 text-[10px] text-slate-100 hover:bg-slate-800/80"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(m);
                        }}
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Edit
                      </button>
                    ) : (
                      <VSPill tone={tone as any}>
                        {(m.status || "Final").toUpperCase()}
                      </VSPill>
                    )
                  }
                />
              );
            })}
          </div>
        )}
      </VSSection>

      {/* Edit overlay */}
      {editOpen && editMatch && (
        <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center">
          <div className="bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-xs p-4">
            <div className="text-sm font-semibold mb-1 text-slate-50">
              Edit Result
            </div>
            <div className="text-xs text-slate-400 mb-3">
              {editMatch.teamA} vs {editMatch.teamB}
            </div>

            <div className="flex items-center justify-center gap-2 mb-4">
              <input
                type="number"
                value={homeScore}
                onChange={(e) =>
                  setHomeScore(Number(e.target.value) || 0)
                }
                className="w-16 border border-slate-700 bg-slate-900 rounded-lg px-2 py-1 text-center text-sm text-slate-50"
              />
              <span className="text-sm font-semibold text-slate-200">
                :
              </span>
              <input
                type="number"
                value={awayScore}
                onChange={(e) =>
                  setAwayScore(Number(e.target.value) || 0)
                }
                className="w-16 border border-slate-700 bg-slate-900 rounded-lg px-2 py-1 text-center text-sm text-slate-50"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={closeEdit}
                disabled={saving}
                className="border-slate-600 text-slate-200 bg-transparent hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoringTab;
