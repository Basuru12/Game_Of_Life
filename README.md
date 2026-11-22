# Life RPG (Game of Life)

A personal RPG-style habit tracker built with **React**, **TypeScript**, **Vite**, and **Supabase** (Auth + PostgreSQL).

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env and fill in your Supabase project URL and anon key (Project Settings → API):

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

3. Apply database migrations (see [supabase/MIGRATIONS.md](supabase/MIGRATIONS.md)).

## Scripts

```bash
npm run dev      # local SPA at http://localhost:5173
npm run build    # production build → dist/
npm run preview  # serve dist/
```

## App routes

| Path | Purpose |
|------|---------|
| `/login` | Sign in / sign up |
| `/create` | Create avatar (`?new=1` forces a new one) |
| `/quests` | Quest paths + Wheel of Life |

## Stack

- Frontend: React + TypeScript + Vite + React Router
- Backend / DB: Supabase Auth + PostgreSQL (RLS)
- Migrations: `supabase/migrations/` (auto-deploy via GitHub Actions on `main`)
