# Tech Stack

## Overview

| Layer | Technology | Reason |
|-------|------------|--------|
| **Discord Bot** | discord.js v14 | Standard library for Discord bots, well-supported |
| **Web / Admin Panel** | Next.js 14 (App Router, TypeScript) | Full-stack in one repo; handles API routes + UI |
| **Auth** | NextAuth.js v5 + Discord OAuth | Discord provider built-in; integrates natively with Next.js |
| **Database** | PostgreSQL (via Supabase) | Relational data fits the model; free tier available |
| **ORM** | Prisma | Type-safe queries, auto-migrations, best TypeScript DX |
| **Scheduler** | node-cron | Lightweight for 5PM daily cutoff + weekly/monthly leaderboard posts |
| **Charts** | Recharts | React-native charting library for stats/leaderboards |
| **Hosting** | Vercel (Next.js) + Railway/Render (bot process) | Simple deploy path for each service |

---

## Project Structure

```
discord-challenge-bot/
├── src/
│   ├── bot/                  # Discord bot
│   │   ├── index.ts          # Bot entry point
│   │   ├── commands/         # Slash commands (e.g. /pushup)
│   │   └── scheduler.ts      # node-cron jobs (5PM cutoff, leaderboards)
│   └── app/                  # Next.js web app
│       ├── app/              # App Router pages
│       ├── api/              # API routes
│       └── components/       # React components (calendar, charts, leaderboard)
├── prisma/
│   └── schema.prisma         # Database schema
├── docs/
│   └── tech-stack.md         # This file
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Database Models

| Model | Key Fields |
|-------|-----------|
| `User` | Discord ID, username, avatar |
| `Server` | Discord guild ID, challenge config |
| `Challenge` | Type (pushup), active flag, server |
| `Submission` | User, date, count, challenge |

Leaderboards are derived via Prisma queries (grouped by user, summed by count or check-in days).

---

## Dependencies

```json
{
  "dependencies": {
    "discord.js": "^14.0.0",
    "dotenv": "^16.0.0",
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "next-auth": "^5.0.0",
    "@prisma/client": "^5.0.0",
    "node-cron": "^3.0.0",
    "recharts": "^2.0.0"
  },
  "devDependencies": {
    "prisma": "^5.0.0",
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "ts-node": "^10.0.0"
  }
}
```

---

## Environment Variables

```env
# Discord
DISCORD_TOKEN=
CLIENT_ID=
DISCORD_CLIENT_SECRET=

# NextAuth
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Database
DATABASE_URL=
```
