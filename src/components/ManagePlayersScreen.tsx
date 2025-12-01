import React from "react";
import { ArrowLeft, User, Target, Plus, Search } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

type ManagePlayersScreenProps = {
  onBack: () => void;
};

const demoPlayers = [
  { id: 1, name: "Suraj Kumar", position: "Forward", team: "Astros FC" },
  { id: 2, name: "Nishant Nair", position: "Midfielder", team: "Eagles United" },
];

const ManagePlayersScreen: React.FC<ManagePlayersScreenProps> = ({ onBack }) => {
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
          <h1 className="text-lg font-semibold">Players</h1>
          <p className="text-xs text-gray-500">
            Central player database across all teams
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search players..."
          className="pl-9 rounded-full bg-purple-50 border-none"
        />
      </div>

      {/* Player cards */}
      <div className="space-y-3">
        {demoPlayers.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-3 py-3 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                <User className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {p.name}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    {p.position}
                  </span>
                  <span>· {p.team}</span>
                </div>
              </div>
            </div>

            <button className="text-xs font-medium text-purple-600">
              Edit
            </button>
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="pt-2">
        <Button className="w-full rounded-full flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" />
          <span>Add Player</span>
        </Button>
        <p className="mt-2 text-[11px] text-gray-400 text-center">
          Pure UI for now – we’ll hook this to your Supabase player DB.
        </p>
      </div>
    </div>
  );
};

export default ManagePlayersScreen;
