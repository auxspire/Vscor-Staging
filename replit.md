# VScor App - Sports Scoring Application

## Project Overview
VScor is a React-based sports scoring and tournament management application built with TypeScript, Vite, and Supabase. It provides functionality for managing matches, tournaments, players, teams, and live scoring.

## Tech Stack
- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite 6
- **UI Components**: Radix UI, Tailwind CSS
- **Backend/Auth**: Supabase
- **State Management**: React Hooks
- **Mobile**: Capacitor (for native app builds)

## Project Structure
```
src/
├── components/       # React components (UI, screens, features)
│   ├── ui/          # Reusable UI components (Radix UI based)
│   ├── layout/      # Layout components
│   └── *.tsx        # Feature screens (Match, Tournament, Player management)
├── lib/             # Business logic and API clients
├── hooks/           # Custom React hooks
├── styles/          # Global CSS styles
└── utils/           # Utility functions
```

## Running the Application

### Development
The application runs on port 5000 and is configured for the Replit environment:
- Development server: `npm run dev`
- Build: `npm run build`
- The workflow "VScor App" is pre-configured to run the dev server

### Environment Variables
The following environment variables are required for Supabase integration:
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key

These are already configured in the shared environment.

## Key Features
- Live match scoring
- Tournament management and standings
- Player and team profiles
- Match events tracking
- Leaderboards and statistics
- Offline support with local database

## Deployment
The project is configured for static deployment:
- Build command: `npm run build`
- Output directory: `build/`
- Deployment type: Static (client-side only)

## Setup Date
Project imported and configured for Replit on December 01, 2025

## Design System (Updated December 01, 2025)

### Theme
- **Light theme** with purple (#8B5CF6) primary color
- Soft neutrals (slate palette) for backgrounds and text
- White cards with subtle slate borders and shadows
- Generous spacing throughout (16-24px)

### Key UI Components
- **VScor Logo**: Purple shield with checkmark and football - displayed on login screen and header
- **VSSection**: Light themed section cards with rounded corners (radius-3xl)
- **VSMatchCard**: Match cards with team info, scores, and status badges
- **VSQuickAction**: Square action tiles with centered icons and gradient backgrounds
- **VSPill**: Status badges (live=red, upcoming=blue, finished=slate)

### Navigation
- **MobileShell**: Bottom tab bar with Home (default), Live, Tournaments, Stats
- **Header**: VScor logo with app title and back navigation
- Card-based tab navigation in tournament profiles

### Design Principles
- Mobile-first, professional appearance
- Square action buttons with centered icons (not elongated rectangles)
- Card-based patterns with 16-20px radii and subtle shadows
- Proper accessibility: button elements for clickable items, role="button" for interactive divs

### Recent UI Fixes (December 01, 2025)
- **Home tab icon**: Uses Goal icon with solid purple background (`bg-purple-600 text-white`)
- **Quick Actions**: Uniform light purple cards (`bg-purple-100`) with circular purple icon containers
- **Home match cards**: Score/status column uses `ml-auto min-w-[90px]` with `whitespace-nowrap` for consistent alignment
- **Live match cards**: 3-column grid layout (`grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]`) for symmetric home-left/score-center/away-right presentation
- **Ad-hoc filtering**: Live tab filters out matches with "ad hoc" in tournament name, badge counts match filtered list

## Configuration Notes
- Vite is configured to bind to 0.0.0.0:5000 for Replit's proxy
- `allowedHosts: true` is set to allow Replit's proxy hosts
- HMR (Hot Module Replacement) is configured for the Replit environment
- The app uses Supabase for authentication and data storage
- All dependencies are managed via npm
