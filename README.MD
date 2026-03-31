# Discord Challenge Bot

Run daily fitness challenges in any Discord channel. Log activities, track personal streaks, and post automatic leaderboards. Multiple challenges can run simultaneously across different channels in the same server.

## Features

- **Multiple challenge types** — Push-ups, sit-ups, pull-ups, any activities (open to all types), or a fully custom activity
- **Per-channel challenges** — Each Discord channel can host its own independent challenge
- **Activity logging** — Log via dedicated commands (`/pushup`, `/situp`, `/pullup`) or the generic `/submit_challenge_activity` for custom types
- **Cross-challenge fan-out** — A single log automatically contributes to every challenge the user is enrolled in that matches the activity type
- **Daily results** — Posted automatically at 5 PM, or triggered manually with `/challenge_daily_result`
- **Streak tracking** — "Any activities" challenges rank members by consecutive days contributed (global streak)
- **Web dashboard** — Sign in with Discord to view a monthly check-in calendar, fix past entries, and see stats (total count, this month vs last month, activity chart)
- **Multi-server support** — Users can participate in challenges across multiple servers; the dashboard auto-selects if only one challenge exists

---

## Setup

### Prerequisites

- Node.js 24+
- A [Discord application](https://discord.com/developers/applications) with a bot token
- A PostgreSQL database (e.g. Supabase)

### 1. Clone and install

```bash
git clone <repo-url>
cd discord-challenge-bot
npm install
```

### 2. Configure environment variables

Create a `.env` file at the project root:

```env
# Database
DATABASE_URL=postgresql://...        # Pooled connection (port 6543 on Supabase)
DIRECT_URL=postgresql://...          # Direct connection (port 5432 on Supabase)

# Discord bot
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_GUILD_ID=your_guild_id       # Optional: scopes commands to one guild (instant registration)

# Web app
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=a_random_secret
```

### 3. Set up the database

```bash
npx prisma db push
```

### 4. Register slash commands

```bash
npm run register
```

> If `DISCORD_GUILD_ID` is set, commands register instantly to that guild. Without it, global registration can take up to 1 hour.

### 5. Run the bot

```bash
npm run dev:bot
```

### 6. Run the web app

```bash
npm run dev
```

---

## Bot Commands

| Command | Permission | Description |
|---------|-----------|-------------|
| `/start_challenge` | Manage Server | Start a challenge in the current channel |
| `/pushup count` | Everyone | Log push-ups for today |
| `/situp count` | Everyone | Log sit-ups for today |
| `/pullup count` | Everyone | Log pull-ups for today |
| `/submit_challenge_activity count` | Everyone | Log activity resolved from the channel's challenge type |
| `/challenge_daily_result` | Everyone | Manually post today's results for this channel |

### `/start_challenge` options

| Type | Behaviour |
|------|-----------|
| `Push-ups` | Only push-up logs count |
| `Sit-ups` | Only sit-up logs count |
| `Pull-ups` | Only pull-up logs count |
| `Any activities` | All activity types count; daily results show a streak leaderboard |
| `Other` | Custom activity name (e.g. "Walking"); use `/submit_challenge_activity` to log |

---

## Web Dashboard

1. Navigate to `NEXTAUTH_URL/admin`
2. Sign in with Discord
3. If enrolled in multiple challenge channels, select one from the picker
4. View your **check-in calendar** — click any day to add, edit, or delete an entry
5. View **stats** — total count, this month vs last month, and an activity chart over time

---

## Tech Stack

- **Bot** — Discord.js v14, TypeScript, ts-node
- **Web** — Next.js 16 (App Router), NextAuth v5
- **Database** — PostgreSQL via Prisma v7 with `@prisma/adapter-pg`
- **Auth** — Discord OAuth2

# Know bugs/improvement area
Streak calculation could be improved and modifying your activities in the admin might not change your streak/re-calculate