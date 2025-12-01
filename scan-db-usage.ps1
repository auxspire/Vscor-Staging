# scan-db-usage.ps1
$tables = @(
    "organizations",
    "profiles",
    "organization_members",
    "teams",
    "players",
    "tournaments",
    "tournament_teams",
    "tournament_players",
    "tournament_info",
    "tournament_standings",
    "tournament_stats",
    "tournament_top_scorers",
    "matches",
    "tournament_fixtures",
    "match_lineups",
    "match_events"
)

$root = Join-Path (Get-Location) "src"
if (-not (Test-Path $root)) {
    Write-Error "src folder not found. Run this from your project root."
    exit 1
}

$files = Get-ChildItem -Path $root -Recurse -Include *.ts, *.tsx

foreach ($table in $tables) {
    Write-Host ""
    Write-Host "=== Usage for table: $table ===" -ForegroundColor Cyan

    # look for supabase.from("table") or supabase.from('table')
    $pattern1 = "from\(`"$table`"\)"
    $pattern2 = "from\('$table'\)"

    $hits = $files | Select-String -Pattern $pattern1, $pattern2

    if (-not $hits) {
        Write-Host "  (no direct supabase.from(...) usage found)"
        continue
    }

    foreach ($hit in $hits) {
        $relativePath = $hit.Path.Replace((Get-Location).Path + "\", "")
        Write-Host ("  - {0}:{1}  {2}" -f $relativePath, $hit.LineNumber, $hit.Line.Trim())
    }
}
