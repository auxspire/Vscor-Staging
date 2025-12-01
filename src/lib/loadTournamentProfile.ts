// src/lib/loadTournamentProfile.ts
import { supabase } from "./supabaseClient";

// ---------- Types used by the screen ----------

export type TournamentSummary = {
  id: string;
  name: string;
  slug?: string | null;
  logoUrl?: string | null;
  country?: string | null;
  season?: string | null;
  status: "UPCOMING" | "LIVE" | "COMPLETED" | "ARCHIVED";
  startDate?: string | null;
  endDate?: string | null;
  venue?: string | null;
};

export type TournamentInfoMeta = {
  description?: string | null;
  format?: string | null;
  rulesMarkdown?: string | null;
  prizePoolText?: string | null;
  sponsorsText?: string | null;
  maxTeams?: number | null;
  pointsForWin: number;
  pointsForDraw: number;
  pointsForLoss: number;
};

export type TournamentStandingRow = {
  teamId: string;
  teamName: string;
  teamLogoUrl?: string | null;
  groupName?: string | null;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  last5?: string | null;
};

export type TournamentFixtureRow = {
  id: string;
  /** FK → matches.id (nullable if not yet linked) */
  matchId?: string | null;
  roundName?: string | null;
  matchday?: number | null;
  kickoffAt?: string | null;
  venue?: string | null;
  status: string;
  homeTeamId: string;
  homeTeamName: string;
  homeTeamLogoUrl?: string | null;
  awayTeamId: string;
  awayTeamName: string;
  awayTeamLogoUrl?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  homePenScore?: number | null;
  awayPenScore?: number | null;
};

export type TournamentTopScorerRow = {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  teamLogoUrl?: string | null;
  rank: number;
  goals: number;
  assists: number;
  matchesPlayed: number;
  minutesPlayed: number;
  position?: string | null;
};

export type TournamentStatsSummary = {
  matchesPlayed: number;
  goalsScored: number;
  avgGoalsPerMatch?: number | null;
  yellowCards: number;
  redCards: number;
  cleanSheets: number;
};

export type TournamentProfileDTO = {
  tournament: TournamentSummary | null;
  info: TournamentInfoMeta | null;
  table: TournamentStandingRow[];
  fixtures: TournamentFixtureRow[];
  topScorers: TournamentTopScorerRow[];
  stats: TournamentStatsSummary | null;
};

// ---------- Loader function: single entry point ----------

export async function loadTournamentProfile(
  tournamentId: string
): Promise<TournamentProfileDTO> {
  // 1. Tournament basic summary
  const { data: tournamentRow, error: tournamentError } = await supabase
    .from("tournaments")
    .select(
      `
      id,
      name,
      slug,
      logo_url,
      country,
      season,
      status,
      start_date,
      end_date,
      venue
    `
    )
    .eq("id", tournamentId)
    .maybeSingle();

  if (tournamentError) {
    console.error("[loadTournamentProfile] tournament error", tournamentError);
  }

  let tournament: TournamentSummary | null = null;
  if (tournamentRow) {
    tournament = {
      id: tournamentRow.id,
      name: tournamentRow.name,
      slug: tournamentRow.slug,
      logoUrl: tournamentRow.logo_url,
      country: tournamentRow.country,
      season: tournamentRow.season,
      status: tournamentRow.status,
      startDate: tournamentRow.start_date,
      endDate: tournamentRow.end_date,
      venue: tournamentRow.venue,
    };
  }

  // 2. Fetch the rest in parallel
  const [infoRes, standingsRes, fixturesRes, topScorersRes, statsRes] =
    await Promise.all([
      supabase
        .from("tournament_info")
        .select(
          `
        description,
        format,
        rules_markdown,
        prize_pool_text,
        sponsors_text,
        max_teams,
        points_for_win,
        points_for_draw,
        points_for_loss
      `
        )
        .eq("tournament_id", tournamentId)
        .maybeSingle(),

      supabase
        .from("tournament_standings")
        .select(
          `
        team_id,
        group_name,
        position,
        played,
        won,
        drawn,
        lost,
        goals_for,
        goals_against,
        goal_diff,
        points,
        last5
      `
        )
        .eq("tournament_id", tournamentId)
        .order("group_name", { ascending: true, nullsFirst: true })
        .order("position", { ascending: true }),

      supabase
        .from("tournament_fixtures")
        .select(
          `
        id,
        match_id,
        round_name,
        matchday,
        kickoff_at,
        venue,
        status,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        home_pen_score,
        away_pen_score
      `
        )
        .eq("tournament_id", tournamentId)
        .order("kickoff_at", { ascending: true }),

      supabase
        .from("tournament_top_scorers")
        .select(
          `
        player_id,
        team_id,
        rank,
        goals,
        assists,
        matches_played,
        minutes_played,
        position
      `
        )
        .eq("tournament_id", tournamentId)
        .order("rank", { ascending: true }),

      supabase
        .from("tournament_stats")
        .select(
          `
        matches_played,
        goals_scored,
        avg_goals_per_match,
        yellow_cards,
        red_cards,
        clean_sheets
      `
        )
        .eq("tournament_id", tournamentId)
        .maybeSingle(),
    ]);

  const infoRow = infoRes.data;
  const standingsRows = standingsRes.data ?? [];
  const fixturesRows = fixturesRes.data ?? [];
  const topScorersRows = topScorersRes.data ?? [];
  const statsRow = statsRes.data;

  // 3. Look up team names once and reuse
  const teamIdsSet = new Set<string>();

  standingsRows.forEach((row: any) => {
    if (row.team_id) teamIdsSet.add(row.team_id);
  });

  fixturesRows.forEach((row: any) => {
    if (row.home_team_id) teamIdsSet.add(row.home_team_id);
    if (row.away_team_id) teamIdsSet.add(row.away_team_id);
  });

  topScorersRows.forEach((row: any) => {
    if (row.team_id) teamIdsSet.add(row.team_id);
  });

  const teamIds = Array.from(teamIdsSet);
  let teamMap = new Map<string, { name: string }>();

  if (teamIds.length > 0) {
    const { data: teamRows, error: teamError } = await supabase
      .from("teams")
      .select("id, name")
      .in("id", teamIds);

    if (teamError) {
      console.error("[loadTournamentProfile] teams error", teamError);
    } else if (teamRows) {
      teamRows.forEach((t: any) => {
        teamMap.set(t.id, { name: t.name });
      });
    }
  }

  const getTeamName = (id: string | null | undefined): string => {
    if (!id) return "Unknown Team";
    const found = teamMap.get(id);
    if (found?.name) return found.name;
    // fallback label
    return "Team " + String(id).slice(0, 4);
  };

  const info: TournamentInfoMeta | null = infoRow
    ? {
        description: infoRow.description,
        format: infoRow.format,
        rulesMarkdown: infoRow.rules_markdown,
        prizePoolText: infoRow.prize_pool_text,
        sponsorsText: infoRow.sponsors_text,
        maxTeams: infoRow.max_teams,
        pointsForWin: infoRow.points_for_win ?? 3,
        pointsForDraw: infoRow.points_for_draw ?? 1,
        pointsForLoss: infoRow.points_for_loss ?? 0,
      }
    : null;

  const table: TournamentStandingRow[] = standingsRows.map((row: any) => ({
    teamId: row.team_id,
    teamName: getTeamName(row.team_id),
    teamLogoUrl: null,
    groupName: row.group_name,
    position: row.position,
    played: row.played,
    won: row.won,
    drawn: row.drawn,
    lost: row.lost,
    goalsFor: row.goals_for,
    goalsAgainst: row.goals_against,
    goalDiff: row.goal_diff,
    points: row.points,
    last5: row.last5,
  }));

  const fixtures: TournamentFixtureRow[] = fixturesRows.map((row: any) => ({
    id: row.id,
    matchId: row.match_id ?? null,
    roundName: row.round_name,
    matchday: row.matchday,
    kickoffAt: row.kickoff_at,
    venue: row.venue,
    status: row.status,
    homeTeamId: row.home_team_id,
    homeTeamName: getTeamName(row.home_team_id),
    homeTeamLogoUrl: null,
    awayTeamId: row.away_team_id,
    awayTeamName: getTeamName(row.away_team_id),
    awayTeamLogoUrl: null,
    homeScore: row.home_score,
    awayScore: row.away_score,
    homePenScore: row.home_pen_score,
    awayPenScore: row.away_pen_score,
  }));

  const topScorers: TournamentTopScorerRow[] = topScorersRows.map(
    (row: any) => ({
      playerId: row.player_id,
      playerName: "Player " + String(row.player_id).slice(0, 4), // we’ll wire real players later
      teamId: row.team_id,
      teamName: getTeamName(row.team_id),
      teamLogoUrl: null,
      rank: row.rank,
      goals: row.goals,
      assists: row.assists,
      matchesPlayed: row.matches_played,
      minutesPlayed: row.minutes_played,
      position: row.position,
    })
  );

  const stats: TournamentStatsSummary | null = statsRow
    ? {
        matchesPlayed: statsRow.matches_played,
        goalsScored: statsRow.goals_scored,
        avgGoalsPerMatch: statsRow.avg_goals_per_match,
        yellowCards: statsRow.yellow_cards,
        redCards: statsRow.red_cards,
        cleanSheets: statsRow.clean_sheets,
      }
    : null;

  return {
    tournament,
    info,
    table,
    fixtures,
    topScorers,
    stats,
  };
}
