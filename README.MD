# Discord Challenge Bot

Run daily fitness challenges in any Discord channel. Log activities, track personal streaks, and compete on automatic leaderboards.

---

## Getting Started

### 1. Add the bot to your server

[Click here to invite the bot](https://discord.com/oauth2/authorize?client_id=1488172162887192718)

### 2. Start a challenge in a channel

Go to the channel where you want the challenge to run and type:

```
/start_challenge
```

Choose a challenge type:

| Type | Description |
|------|-------------|
| `Push-ups` | Members log push-ups daily |
| `Sit-ups` | Members log sit-ups daily |
| `Pull-ups` | Members log pull-ups daily |
| `Any activities` | All activity types count; leaderboard ranks by streak |
| `Other` | Custom activity (e.g. "Walking", "Steps") |

> Only members with **Manage Server** permission can run `/start_challenge`.
> Each channel can have its own independent challenge — you can run multiple challenges in the same server.

### 3. Log your activity

Use one of the logging commands each day to submit your count:

| Command | Description |
|---------|-------------|
| `/pushup <count>` | Log push-ups for today |
| `/situp <count>` | Log sit-ups for today |
| `/pullup <count>` | Log pull-ups for today |
| `/submit_challenge_activity <count>` | Log activity for custom or open challenges |

Your submission automatically counts toward every challenge you're enrolled in that matches the activity type.

---

## Daily Results

Results are **posted automatically every day at 5 PM UTC** in each challenge channel.

You can also trigger them manually at any time:

```
/challenge_daily_result
```

---

## Web Dashboard

Track your personal stats at any time:

```
/open_my_challenge_stats
```

This sends you a private link to your dashboard where you can:

- View your **current streak** and check-in stats
- Browse a **monthly calendar** of all your logged activities
- Add, edit, or delete past entries
- See a **progression chart** per activity type

---

## Daily Reminders

Opt in to receive a DM reminder if you haven't logged your activity for the day.

**Option 1 — Discord command:**
```
/enable_challenge_notification on
```
```
/enable_challenge_notification off
```

**Option 2 — Web dashboard:**

Go to your dashboard via `/open_my_challenge_stats`, then use the **Daily Reminders** toggle at the top of the page. When enabled, you can also set the time you want to be reminded (in New York / ET time).

> Reminders are only sent if you haven't logged any activity yet that day.

---

## Known Issues

- **Notification timezone** — Reminder times are set in New York time (ET). Users in other timezones have no way to select their local time.
- **Streak not recalculated on edit** — Editing or deleting a past entry via the calendar does not update the streak shown on the dashboard until the next page load, and the streak logic itself does not retroactively recompute from edited history.
- **Missed daily post on restart** — If the bot restarts exactly at 5 PM, the daily results cron job may be skipped. There is no "already posted today" guard per channel.
- **DM submissions require prior enrollment** — Users can submit activities via DM only if they have previously logged in a challenge channel. New users must use a channel command first.

---

<details>
<summary><strong>Developer & Deployment Guide</strong></summary>

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

# Web app
AUTH_URL=http://localhost:3000
AUTH_SECRET=a_random_secret
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

### 5. Run

**Bot only:**
```bash
npm run dev:bot
```

**Web app only:**
```bash
npm run dev:web
```

**Both together:**
```bash
npm run dev
```

### Deployment

The bot and web app are deployed separately:

- **Web app** — Deploy to [Vercel](https://vercel.com). Set all env vars in the Vercel dashboard. Build command: `prisma generate && next build`.
- **Bot** — Self-host on a Linux server (Debian recommended). Use [PM2](https://pm2.keymetrics.io/) to keep the process alive:

```bash
npm run build:bot
pm2 start dist/bot/index.js --name discord-bot
pm2 save
pm2 startup
```

### Tech Stack

- **Bot** — Discord.js v14, TypeScript
- **Web** — Next.js 16 (App Router), NextAuth v5
- **Database** — PostgreSQL via Prisma v7 with `@prisma/adapter-pg`
- **Auth** — Discord OAuth2

</details>
