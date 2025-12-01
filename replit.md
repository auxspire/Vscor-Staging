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

## Configuration Notes
- Vite is configured to bind to 0.0.0.0:5000 for Replit's proxy
- HMR (Hot Module Replacement) is configured for the Replit environment
- The app uses Supabase for authentication and data storage
- All dependencies are managed via npm
