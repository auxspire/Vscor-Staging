import React from "react";
import { ArrowLeft, Users, Plus, Search } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

type ManageTeamsScreenProps = {
  onBack: () => void;
};

const demoTeams = [
  { id: 1, name: "Astros FC", players: 18, tournaments: 2 },
  { id: 2, name: "Eagles United", players: 16, tournaments: 1 },
];

const ManageTeamsScreen: React.FC<ManageTeamsScreenProps> = ({ onBack }) => {
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center bg-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-semibold">Teams</h1>
          <p className="text-xs text-gray-500">
            Manage squads for your matches & tournaments
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search teams..."
          className="pl-9 rounded-full bg-purple-50 border-none"
        />
      </div>

      {/* Team cards */}
      <div className="space-y-3">
        {demoTeams.map((team) => (
          <div
            key={team.id}
            className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-3 py-3 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-purple-700" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {team.name}
                </div>
                <div className="text-[11px] text-gray-500">
                  {team.players} players · {team.tournaments} tournaments
                </div>
              </div>
            </div>

            <button className="text-xs font-medium text-purple-600">
              Edit
            </button>
          </div>
        ))}

        {/* Empty state hint (you can later show this when list is empty) */}
        {/* <div className="text-xs text-gray-400 text-center mt-4">
          No teams yet. Tap “Add Team” to create your first squad.
        </div> */}
      </div>

      {/* Bottom CTA */}
      <div className="pt-2">
        <Button className="w-full rounded-full flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" />
          <span>Add Team</span>
        </Button>
        <p className="mt-2 text-[11px] text-gray-400 text-center">
          This is UI-only for now. We’ll wire it to Supabase teams table next.
        </p>
      </div>
    </div>
  );
};

export default ManageTeamsScreen;
