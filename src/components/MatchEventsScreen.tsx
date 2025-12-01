import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Clock,
  Target,
  AlertTriangle,
  RotateCcw,
  Timer,
  Users,
  MapPin,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { supabase } from '../lib/supabaseClient';
import type {
  Match,
  MatchEventType,
  TeamClickPayload,
  MatchStatus,
} from '../lib/matches';

// ---------- Types ----------

type TimelineEvent = {
  id: string | number;
  minute: number;
  type: string;
  team?: string | null;
  player?: string | null;
  assistedBy?: string | null;
  playerOut?: string | null;
  playerIn?: string | null;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  yellowCard?: boolean;
  redCard?: boolean;
};

type MatchEventRowDB = {
  id: string | number;
  match_id?: string | number;
  event_type?: MatchEventType | string;
  type?: MatchEventType | string;
  minute?: number | string | null;
  minute_mark?: number | null;
  team_name?: string | null;
  team?: string | null;
  team_side_name?: string | null;
  teamSideName?: string | null;
  player_name?: string | null;
  player?: string | null;
  assist_name?: string | null;
  assisted_by?: string | null;
  assistPlayerName?: string | null;
  player_out_name?: string | null;
  player_out?: string | null;
  player_in_name?: string | null;
  player_in?: string | null;
  yellow_card?: boolean | null;
  yellowCard?: boolean | null;
  red_card?: boolean | null;
  redCard?: boolean | null;
  description?: string | null;
  [key: string]: any;
};

type TeamLineupPlayer = {
  name: string;
  position: string;
  number: number;
};

type TeamLineup = {
  formation: string;
  players: TeamLineupPlayer[];
};

type TeamStats = {
  possession: number;
  shots: number;
  shotsOnTarget: number;
  corners: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  passes: number;
  passAccuracy: number;
};

// This is "Match from lib" plus extra fields / fallbacks you use in the UI
type MatchLike = Partial<Match> & {
  matchId?: string | number;
  match_id?: string | number;
  team1?: string;
  team2?: string;
  events?: any[];
  [key: string]: any;
};

type PlayerClickPayload = {
  id: number;
  name: string;
  team: string;
  goals: number;
  assists: number;
};

type MatchEventsScreenProps = {
  match?: MatchLike | null;
  onBack?: () => void;
  onPlayerClick?: (player: PlayerClickPayload) => void;
  onTeamClick?: (team: TeamClickPayload) => void;
};

// ---------- Component ----------

const MatchEventsScreen: React.FC<MatchEventsScreenProps> = ({
  match,
  onBack,
  onPlayerClick,
  onTeamClick,
}) => {
  const [activeTab, setActiveTab] =
    useState<'timeline' | 'stats' | 'lineups'>('timeline');

  // Supabase-backed events state
  const [dbEvents, setDbEvents] = useState<MatchEventRowDB[]>([]);
  const [loadingEvents, setLoadingEvents] = useState<boolean>(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const matchId =
    match?.id ??
    match?.matchId ??
    match?.match_id ??
    null;

  const getEventIconAndColor = (
    eventType: MatchEventType | string,
  ): {
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    color: string;
  } => {
    const eventMap: Record<
      string,
      {
        icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
        color: string;
      }
    > = {
      goal: { icon: Target, color: 'text-green-600 bg-green-100' },
      substitution: { icon: RotateCcw, color: 'text-purple-600 bg-purple-100' },
      foul: { icon: AlertTriangle, color: 'text-yellow-600 bg-yellow-100' },
      yellow_card: { icon: AlertTriangle, color: 'text-yellow-600 bg-yellow-100' },
      red_card: { icon: AlertTriangle, color: 'text-red-600 bg-red-100' },
      shot_on_goal: { icon: Target, color: 'text-blue-600 bg-blue-100' },
      off_target: { icon: Target, color: 'text-gray-600 bg-gray-100' },
      offside: { icon: Timer, color: 'text-orange-600 bg-orange-100' },
      corner: { icon: Timer, color: 'text-gray-600 bg-gray-100' },
      kickoff: { icon: Clock, color: 'text-purple-600 bg-purple-100' },
    };

    return eventMap[eventType] ?? { icon: Clock, color: 'text-gray-600 bg-gray-100' };
  };

  const mapDbEventToUiEvent = (row: MatchEventRowDB): TimelineEvent => {
    const rawType = (row.event_type || row.type || 'other') as MatchEventType | string;
    const { icon, color } = getEventIconAndColor(rawType);

    let minute = 0;
    if (typeof row.minute === 'number') {
      minute = row.minute;
    } else if (typeof row.minute === 'string') {
      const parsed = parseInt(row.minute, 10);
      minute = Number.isNaN(parsed) ? 0 : parsed;
    } else if (typeof row.minute_mark === 'number') {
      minute = row.minute_mark;
    }

    const team =
      row.team_name ??
      row.team ??
      row.team_side_name ??
      row.teamSideName ??
      null;

    const player = row.player_name ?? row.player ?? null;
    const assistedBy =
      row.assist_name ??
      row.assisted_by ??
      row.assistPlayerName ??
      null;
    const playerOut = row.player_out_name ?? row.player_out ?? null;
    const playerIn = row.player_in_name ?? row.player_in ?? null;

    const yellowCard = Boolean(row.yellow_card ?? row.yellowCard);
    const redCard = Boolean(row.red_card ?? row.redCard);

    const description =
      row.description ??
      String(rawType).replace(/_/g, ' ');

    return {
      id: row.id,
      minute,
      type: String(rawType),
      team,
      player,
      assistedBy,
      playerOut,
      playerIn,
      description,
      icon,
      color,
      yellowCard,
      redCard,
    };
  };

  const loadDbEvents = useCallback(async () => {
    if (!matchId) return;
    try {
      setLoadingEvents(true);
      setEventsError(null);

      const { data, error } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', matchId)
        .order('minute', { ascending: false });

      if (error) {
        console.error('[MatchEventsScreen] Supabase events error', error);
        setEventsError(error.message || 'Could not load events');
        setDbEvents([]);
      } else {
        setDbEvents(data ?? []);
      }
    } catch (e: any) {
      console.error('[MatchEventsScreen] Unexpected events error', e);
      setEventsError(e?.message || 'Could not load events');
      setDbEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, [matchId]);

  useEffect(() => {
    loadDbEvents();
  }, [loadDbEvents]);

  const matchData: MatchLike = match
    ? {
        ...match,
        teamA: match.teamA || match.team1 || 'Team A',
        teamB: match.teamB || match.team2 || 'Team B',
        scoreA: match.scoreA !== undefined ? match.scoreA : 0,
        scoreB: match.scoreB !== undefined ? match.scoreB : 0,
        tournament: match.tournament || 'Tournament',
        status: (match.status as MatchStatus | undefined) ?? 'finished',
        venue: match.venue || 'Match Venue',
        time: match.time || '',
        referee: match.referee || 'Referee',
        kickoffTime: match.kickoffTime || '',
        matchday: match.matchday || 1,
        weather: match.weather || '',
      }
    : {
        id: 1,
        teamA: 'Manchester United',
        teamB: 'Arsenal FC',
        scoreA: 2,
        scoreB: 1,
        tournament: 'Premier League',
        time: "Live: 67'",
        status: 'live',
        venue: 'Old Trafford',
        attendance: 74310,
        referee: 'Michael Oliver',
        kickoffTime: '15:00',
        matchday: 28,
        weather: 'Clear, 18°C',
      };

  // 🔐 force these to be non-undefined strings everywhere below
  const teamAName = String(matchData.teamA || 'Team A');
  const teamBName = String(matchData.teamB || 'Team B');
  const tournamentName = String(matchData.tournament || 'Tournament');

  // --- Fallback static stats (used when no usable events) ---
  const fallbackStats: Record<string, TeamStats> = {
    'Manchester United': {
      possession: 58,
      shots: 12,
      shotsOnTarget: 6,
      corners: 7,
      fouls: 8,
      yellowCards: 1,
      redCards: 0,
      passes: 456,
      passAccuracy: 84,
    },
    'Arsenal FC': {
      possession: 42,
      shots: 8,
      shotsOnTarget: 4,
      corners: 3,
      fouls: 12,
      yellowCards: 1,
      redCards: 0,
      passes: 332,
      passAccuracy: 81,
    },
  };

  const teamLineups: Record<string, TeamLineup> = {
    'Manchester United': {
      formation: '4-2-3-1',
      players: [
        { name: 'André Onana', position: 'GK', number: 24 },
        { name: 'Diogo Dalot', position: 'RB', number: 20 },
        { name: 'Raphael Varane', position: 'CB', number: 19 },
        { name: 'Lisandro Martínez', position: 'CB', number: 6 },
        { name: 'Luke Shaw', position: 'LB', number: 23 },
        { name: 'Casemiro', position: 'CDM', number: 18 },
        { name: 'Bruno Fernandes', position: 'CAM', number: 8 },
        { name: 'Antony', position: 'RW', number: 21 },
        { name: 'Marcus Rashford', position: 'LW', number: 10 },
        { name: 'Jadon Sancho', position: 'AM', number: 25 },
        { name: 'Anthony Martial', position: 'ST', number: 9 },
      ],
    },
    'Arsenal FC': {
      formation: '4-3-3',
      players: [
        { name: 'Aaron Ramsdale', position: 'GK', number: 1 },
        { name: 'Ben White', position: 'RB', number: 4 },
        { name: 'William Saliba', position: 'CB', number: 12 },
        { name: 'Gabriel Magalhães', position: 'CB', number: 6 },
        { name: 'Oleksandr Zinchenko', position: 'LB', number: 35 },
        { name: 'Thomas Partey', position: 'CDM', number: 5 },
        { name: 'Granit Xhaka', position: 'CM', number: 34 },
        { name: 'Martin Ødegaard', position: 'CAM', number: 8 },
        { name: 'Bukayo Saka', position: 'RW', number: 7 },
        { name: 'Gabriel Jesus', position: 'ST', number: 9 },
        { name: 'Gabriel Martinelli', position: 'LW', number: 11 },
      ],
    },
  };

  const handlePlayerNameClick = (playerName: string, teamName: string) => {
    const player = teamLineups[teamName]?.players.find(
      (p: TeamLineupPlayer) => p.name === playerName,
    );
    if (player && onPlayerClick) {
      onPlayerClick({
        id: player.number,
        name: player.name,
        team: teamName,
        goals: playerName === 'Marcus Rashford' ? 18 : Math.floor(Math.random() * 15),
        assists: Math.floor(Math.random() * 12),
      });
    }
  };

  const getEventIcon = (event: TimelineEvent) => {
    const IconComponent = event.icon;
    return <IconComponent className={`w-5 h-5 ${event.color.split(' ')[0]}`} />;
  };

  const fallbackEvents: TimelineEvent[] =
    match?.events && match.events.length > 0
      ? match.events.map((event: any): TimelineEvent => {
          const { icon, color } = getEventIconAndColor(event.type);
          const minute = event.time ? parseInt(event.time.split(':')[0], 10) : 0;

          let description = '';
          if (event.type === 'goal') {
            description = 'Goal scored';
          } else if (event.type === 'substitution') {
            description = 'Tactical substitution';
          } else if (event.type === 'foul') {
            if (event.yellowCard) description = 'Yellow card for foul';
            else if (event.redCard) description = 'Red card for foul';
            else description = 'Foul committed';
          } else {
            description = event.type.replace(/_/g, ' ');
          }

          return {
            id: event.id,
            minute,
            type: event.type,
            team: event.teamName,
            player: event.player?.name || null,
            assistedBy: event.assist?.name || null,
            playerOut: event.playerOut?.name || null,
            playerIn: event.playerIn?.name || null,
            description,
            icon,
            color,
            yellowCard: event.yellowCard,
            redCard: event.redCard,
          };
        })
      : [
          {
            id: 1,
            minute: 67,
            type: 'goal',
            team: 'Manchester United',
            player: 'Marcus Rashford',
            assistedBy: 'Bruno Fernandes',
            description:
              'Right footed shot from the centre of the box to the bottom left corner.',
            icon: Target,
            color: 'text-green-600 bg-green-100',
          },
          {
            id: 2,
            minute: 58,
            type: 'substitution',
            team: 'Arsenal FC',
            playerOut: 'Bukayo Saka',
            playerIn: 'Gabriel Martinelli',
            description: 'Tactical substitution',
            icon: RotateCcw,
            color: 'text-blue-600 bg-blue-100',
          },
          {
            id: 3,
            minute: 52,
            type: 'yellow_card',
            team: 'Manchester United',
            player: 'Casemiro',
            description: 'Unsporting behaviour - simulation',
            icon: AlertTriangle,
            color: 'text-yellow-600 bg-yellow-100',
          },
          {
            id: 4,
            minute: 45,
            type: 'goal',
            team: 'Arsenal FC',
            player: 'Gabriel Jesus',
            assistedBy: 'Martin Ødegaard',
            description:
              'Left footed shot from very close range to the centre of the goal.',
            icon: Target,
            color: 'text-green-600 bg-green-100',
          },
          {
            id: 5,
            minute: 34,
            type: 'goal',
            team: 'Manchester United',
            player: 'Antony',
            assistedBy: 'Luke Shaw',
            description:
              'Right footed shot from the right side of the six yard box to the top right corner.',
            icon: Target,
            color: 'text-green-600 bg-green-100',
          },
          {
            id: 6,
            minute: 23,
            type: 'yellow_card',
            team: 'Arsenal FC',
            player: 'Thomas Partey',
            description: 'Unsporting behaviour - holding opponent',
            icon: AlertTriangle,
            color: 'text-yellow-600 bg-yellow-100',
          },
          {
            id: 7,
            minute: 12,
            type: 'corner',
            team: 'Manchester United',
            player: 'Bruno Fernandes',
            description: 'Corner kick from the right side',
            icon: Timer,
            color: 'text-gray-600 bg-gray-100',
          },
          {
            id: 8,
            minute: 1,
            type: 'kickoff',
            team: null,
            description: 'Match started',
            icon: Clock,
            color: 'text-purple-600 bg-purple-100',
          },
        ];

  const matchEvents: TimelineEvent[] =
    dbEvents.length > 0 ? dbEvents.map(mapDbEventToUiEvent) : fallbackEvents;

  matchEvents.sort((a: TimelineEvent, b: TimelineEvent) => b.minute - a.minute);

  // --- Derive statistics from events (shots, fouls, cards, corners, etc.) ---
  const matchStats: Record<string, TeamStats> = React.useMemo(() => {
    // If we have no events with a team, just use the static fallback
    if (!matchEvents.length || !matchEvents.some((ev) => ev.team)) {
      return fallbackStats;
    }

    const stats: Record<string, TeamStats> = {};

    const ensureTeam = (teamName: string): TeamStats => {
      if (!stats[teamName]) {
        stats[teamName] = {
          possession: 0,
          shots: 0,
          shotsOnTarget: 0,
          corners: 0,
          fouls: 0,
          yellowCards: 0,
          redCards: 0,
          passes: 0,
          passAccuracy: 0,
        };
      }
      return stats[teamName];
    };

    for (const ev of matchEvents) {
      if (!ev.team) continue;
      const teamName = ev.team;
      const s = ensureTeam(teamName);

      switch (ev.type) {
        case 'goal':
          s.shots += 1;
          s.shotsOnTarget += 1;
          break;
        case 'shot_on_goal':
          s.shots += 1;
          s.shotsOnTarget += 1;
          break;
        case 'off_target':
          s.shots += 1;
          break;
        case 'corner':
          s.corners += 1;
          break;
        case 'foul':
          s.fouls += 1;
          break;
        case 'yellow_card':
          s.yellowCards += 1;
          break;
        case 'red_card':
          s.redCards += 1;
          break;
        default:
          break;
      }
    }

    // Simple possession placeholder – split 50/50 if exactly 2 teams
    const teamNames = Object.keys(stats);
    if (teamNames.length === 2) {
      stats[teamNames[0]].possession = 50;
      stats[teamNames[1]].possession = 50;
    }

    return stats;
  }, [matchEvents, fallbackStats]);

  const getScoreAtTime = (minute: number): string => {
    let teamAScore = 0;
    let teamBScore = 0;

    matchEvents
      .filter((event: TimelineEvent) => event.type === 'goal' && event.minute <= minute)
      .forEach((goal: TimelineEvent) => {
        if (goal.team === teamAName) teamAScore++;
        if (goal.team === teamBName) teamBScore++;
      });

    return `${teamAScore}-${teamBScore}`;
  };

  return (
    <div className="p-6 space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-medium">Match Events</h1>
      </div>

      {/* Match Header */}
      <div className="bg-purple-100 rounded-2xl p-6">
        <div className="text-center mb-4">
          <button
            onClick={() =>
              onTeamClick?.({
                id: 1,
                name: tournamentName,
                matches: 380,
                wins: 0,
                goals: 0,
              })
            }
            className="text-sm text-purple-600 hover:text-purple-800 hover:underline font-medium"
          >
            {tournamentName} • Matchday {matchData.matchday}
          </button>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-600 mt-1">
            <MapPin className="w-3 h-3" />
            <span>{matchData.venue}</span>
            <span>•</span>
            <Users className="w-3 h-3" />
            <span>{matchData.attendance?.toLocaleString()}</span>
          </div>
        </div>

        {/* Teams and Score */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() =>
              onTeamClick?.({
                id: 1,
                name: teamAName,
                matches: 28,
                wins: 18,
                goals: 58,
              })
            }
            className="flex items-center gap-3 hover:text-purple-600 transition-colors"
          >
            <div className="w-16 h-16 bg-purple-200 rounded-full flex items-center justify-center">
              <span className="text-lg font-medium text-purple-600">
                {teamAName
                  .split(' ')
                  .map((word: string) => word[0])
                  .join('')
                  .slice(0, 2)}
              </span>
            </div>
            <div className="text-left">
              <p className="font-medium">{teamAName}</p>
              <p className="text-sm text-gray-600">
                {teamLineups[teamAName]?.formation}
              </p>
            </div>
          </button>

          <div className="text-center">
            <div className="text-4xl font-medium mb-2">
              {matchData.scoreA} - {matchData.scoreB}
            </div>
            <Badge
              className={
                matchData.status === 'live'
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-gray-100 text-gray-600'
              }
            >
              {matchData.time}
            </Badge>
            {loadingEvents && (
              <div className="mt-1 text-[11px] text-gray-600">Updating events…</div>
            )}
            {eventsError && (
              <div className="mt-1 text-[11px] text-red-600">{eventsError}</div>
            )}
          </div>

          <button
            onClick={() =>
              onTeamClick?.({
                id: 2,
                name: teamBName,
                matches: 28,
                wins: 15,
                goals: 52,
              })
            }
            className="flex items-center gap-3 hover:text-purple-600 transition-colors"
          >
            <div className="text-right">
              <p className="font-medium">{teamBName}</p>
              <p className="text-sm text-gray-600">
                {teamLineups[teamBName]?.formation}
              </p>
            </div>
            <div className="w-16 h-16 bg-purple-200 rounded-full flex items-center justify-center">
              <span className="text-lg font-medium text-purple-600">
                {teamBName
                  .split(' ')
                  .map((word: string) => word[0])
                  .join('')
                  .slice(0, 2)}
              </span>
            </div>
          </button>
        </div>

        {/* Match Info */}
        <div className="grid grid-cols-3 gap-4 text-center text-sm text-gray-600">
          <div>
            <p className="font-medium">Referee</p>
            <p>{matchData.referee}</p>
          </div>
          <div>
            <p className="font-medium">Kickoff</p>
            <p>{matchData.kickoffTime}</p>
          </div>
          <div>
            <p className="font-medium">Weather</p>
            <p>{matchData.weather}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="lineups">Lineups</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          {/* Events Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Match Events Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {matchEvents.map((event: TimelineEvent, index: number) => (
                  <div key={event.id} className="flex gap-4 relative">
                    {/* Timeline line */}
                    {index < matchEvents.length - 1 && (
                      <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-200" />
                    )}

                    {/* Event icon */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${event.color}`}>
                      {getEventIcon(event)}
                    </div>

                    {/* Event details */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-lg">{event.minute}'</span>
                        {event.team && (
                          <Badge variant="outline" className="text-xs">
                            {event.team}
                          </Badge>
                        )}
                        {event.type === 'goal' && (
                          <Badge className="text-xs bg-green-100 text-green-800">
                            {getScoreAtTime(event.minute)}
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1">
                        {event.player && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                handlePlayerNameClick(event.player as string, event.team || '')
                              }
                              className="font-medium text-purple-600 hover:text-purple-800 hover:underline"
                            >
                              {event.player}
                            </button>
                            {event.yellowCard && <span>🟨</span>}
                            {event.redCard && <span>🟥</span>}
                          </div>
                        )}

                        {event.assistedBy && (
                          <p className="text-sm text-gray-600">
                            Assisted by{' '}
                            <button
                              onClick={() =>
                                handlePlayerNameClick(
                                  event.assistedBy as string,
                                  event.team || '',
                                )
                              }
                              className="text-purple-600 hover:text-purple-800 hover:underline"
                            >
                              {event.assistedBy}
                            </button>
                          </p>
                        )}

                        {event.playerOut && event.playerIn && (
                          <div className="text-sm text-gray-600">
                            <button
                              onClick={() =>
                                handlePlayerNameClick(event.playerOut as string, event.team || '')
                              }
                              className="text-red-600 hover:text-red-800 hover:underline"
                            >
                              {event.playerOut}
                            </button>
                            {' → '}
                            <button
                              onClick={() =>
                                handlePlayerNameClick(event.playerIn as string, event.team || '')
                              }
                              className="text-green-600 hover:text-green-800 hover:underline"
                            >
                              {event.playerIn}
                            </button>
                          </div>
                        )}

                        <p className="text-sm text-gray-600">{event.description}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {matchEvents.length === 0 && !loadingEvents && (
                  <p className="text-sm text-gray-600 text-center">
                    No events recorded yet for this match.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          {/* Match Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Match Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(matchStats).map(([teamName, stats]) => (
                  <div key={teamName}>
                    <h4 className="font-medium mb-3">{teamName}</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Possession</span>
                        <span className="font-medium">
                          {stats.possession}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Shots</span>
                        <span className="font-medium">{stats.shots}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">On Target</span>
                        <span className="font-medium">
                          {stats.shotsOnTarget}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Corners</span>
                        <span className="font-medium">{stats.corners}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fouls</span>
                        <span className="font-medium">{stats.fouls}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Yellow Cards</span>
                        <span className="font-medium">
                          {stats.yellowCards}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Red Cards</span>
                        <span className="font-medium">{stats.redCards}</span>
                      </div>
                      {/* Pass / accuracy (placeholder for now) */}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Pass Accuracy</span>
                        <span className="font-medium">
                          {stats.passAccuracy}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lineups" className="space-y-4">
          {/* Team Lineups */}
          {Object.entries(teamLineups).map(([teamName, lineup]) => (
            <Card key={teamName}>
              <CardHeader>
                <CardTitle>
                  {teamName} ({lineup.formation})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {lineup.players.map((player) => (
                    <button
                      key={player.number}
                      onClick={() => handlePlayerNameClick(player.name, teamName)}
                      className="flex items-center gap-3 p-2 hover:bg-purple-50 rounded-lg transition-colors text-left"
                    >
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-purple-600">
                          {player.number}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{player.name}</p>
                        <p className="text-xs text-gray-600">{player.position}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MatchEventsScreen;
