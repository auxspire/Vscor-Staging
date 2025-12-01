import React, { useState } from 'react';
import { Search, Filter, User } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';

const LiveMatchesTab = ({ onMatchClick, onPlayerClick, onTeamClick, onTournamentClick }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const liveMatches = [
    {
      id: 1,
      teamA: 'Team A',
      teamB: 'Team B',
      scoreA: 2,
      scoreB: 2,
      tournament: 'EAFM League',
      time: 'Live: 50\'',
      status: 'live'
    },
    {
      id: 2,
      teamA: 'Team A',
      teamB: 'Team B',
      scoreA: 2,
      scoreB: 2,
      tournament: 'EAFM League',
      time: 'Live: 50\'',
      status: 'live'
    },
    {
      id: 3,
      teamA: 'Team A',
      teamB: 'Team B',
      scoreA: 1,
      scoreB: 3,
      tournament: 'EAFM League',
      time: 'Final',
      status: 'finished'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-medium mb-2">Live Matches</h1>
        <p className="text-purple-600 text-lg">Stay Updated</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          placeholder="Search matches"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 pr-12 py-3 bg-purple-50 border-none rounded-full"
        />
        <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
      </div>

      <Button variant="outline" className="rounded-full px-6">
        <Filter className="w-4 h-4 mr-2" />
        Filter
      </Button>

      <div className="space-y-4">
        {liveMatches.map((match) => (
          <div
            key={match.id}
            onClick={() => onMatchClick(match)}
            className="bg-purple-100 rounded-2xl p-6 cursor-pointer hover:bg-purple-150 transition-colors"
          >
            {match.status === 'live' && (
              <div className="inline-block bg-black text-white px-3 py-1 rounded-lg text-sm mb-4">
                {match.time}
              </div>
            )}
            
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600 mb-2">{match.tournament}</p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-purple-200 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-purple-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium">{match.teamA}</p>
                </div>
              </div>

              <div className="text-center">
                <div className="text-3xl font-medium">
                  {match.scoreA} - {match.scoreB}
                </div>
                {match.status === 'finished' && (
                  <div className="bg-purple-200 text-purple-600 px-3 py-1 rounded-lg text-sm mt-2">
                    Final
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-medium">{match.teamB}</p>
                </div>
                <div className="w-16 h-16 bg-purple-200 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveMatchesTab;