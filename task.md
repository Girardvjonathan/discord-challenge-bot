# Implementation Plan

## Context

A Discord challenge bot with a Next.js admin dashboard. Users log daily activities via slash commands, the bot posts daily results per channel, and the web dashboard shows global personal stats, streaks, and a multi-activity calendar.

---

## Tasks (ordered by dependency)

### Phase 1 — Database & Environment ✅

**Task 1 — Prisma schema & migrations** ✅
- Models: `User`, `Channel` (per Discord channel, unique by `discordChannelId`), `ChannelUser`, `ActivityLog`
- `Channel` holds flattened challenge config: `challengeType`, `challengeName`, `challengeActive`
- `ActivityLog` unique on `(userId, type, date)` — one entry per user per activity type per day
- Prisma v7 with `@prisma/adapter-pg`; `prisma.config.ts` holds `DIRECT_URL` for CLI

**Task 2 — Register Discord slash commands** ✅
- Script at `src/scripts/register-commands.ts`
- `npm run register` — guild-scoped if `DISCORD_GUILD_ID` is set, otherwise global
- Commands: `/pushup`, `/situp`, `/pullup`, `/submit_challenge_activity`, `/challenge_daily_result`, `/start_challenge`

---

### Phase 2 — Bot Core Logic ✅

**Task 3 — Activity logging** ✅
- `/pushup`, `/situp`, `/pullup` log fixed types; `/submit_challenge_activity` resolves type from the channel's active challenge
- Shared `logSubmission()` handles upsert, `ChannelUser` enrollment, and cross-challenge fan-out
- One-submission-per-day-per-type rule enforced by DB unique constraint; updates count if already logged
- Replies ephemerally with confirmation and list of matching challenges

**Task 4 — Guild lifecycle handlers** ✅
- `guildCreate`: posts welcome message to default channel
- `guildDelete`: deactivates all `Channel` records for the guild via `updateMany`
- `clientReady`: logs connected guilds

**Task 5 — Daily result post** ✅
- Cron at 5 PM via `node-cron`; also triggerable with `/challenge_daily_result` (scoped to current channel)
- Specific type challenges: ranked by total count, medals for top 3
- "Any activities" challenges: submission count, 5 recent entries (one per user), streak leaderboard (top 5, global streak, consecutive days)
- Each Discord channel gets its own independent results post

**Task 6 — Opt-in DM notifications** ⬜
- `/notify on|off` command to toggle `notificationsEnabled`
- Morning DM reminders for opted-in users

---

### Phase 3 — Web Registration & Auth ✅

**Task 7 — Sign-in landing page** ✅
- "Sign in with Discord" via NextAuth v5 on the home page
- Redirects to `/admin` on success

**Task 8 — Auth guard & session** ✅
- Server-side session check on `/admin`; redirects to `/` if unauthenticated
- Discord snowflake ID stored via JWT callback (`profile.id` → `token.discordId`)

---

### Phase 4 — Admin Dashboard ✅

**Task 9 — API routes** ✅
- `GET /api/stats` — global streak, check-in counts, per-type totals
- `GET /api/activity-history?type=` — history data for chart
- `GET /api/activity-types` — distinct types the user has logged (for calendar dropdown)
- `GET /api/submissions?month=YYYY-MM` — all logs for the month
- `POST /api/submissions` — create/update a log entry
- `DELETE /api/submissions/:id` — remove a log entry

**Task 10 — Calendar view** ✅
- Monthly grid; days with any activity show a blue dot
- Click a day → modal lists all activities for that day
- Edit counts, delete individual activities, add new via dropdown of known types (+ "Custom…" option)

**Task 11 — Stats panel** ✅
- Streak badge (counts from today or yesterday if today not yet logged)
- Check-in stat cards: total, this month, last month (with % delta)
- Activity type total cards (clickable to update chart)
- Progression line chart with type dropdown

---

### Phase 5 — Polish & Reliability

**Task 13 — Error handling & input validation** ✅ (partial)
- All interaction handlers wrapped in try/catch with user-friendly replies
- Count range enforced (`min: 1`, `max: 1,000,000`) on all log commands
- Remaining: startup env var validation; DB connection error handling

**Task 14 — Environment & deployment config** ✅
- Add `.env.example` with all required vars
- Add startup check that fails fast with a clear message if required vars are missing

---

### Phase 6 — Leaderboard Posts

**Task 15 — Weekly leaderboard (Sundays 8 PM)** ⬜
- Aggregate activity logs for the current week per server channel
- Post two columns: total count and total check-ins (days logged)

**Task 16 — Monthly leaderboard (1st of month 8 PM)** ⬜
- Same as Task 15 but scoped to the previous calendar month

---

## Known Issues / Improvements

- Streak shown on dashboard is not recalculated when editing past entries via the calendar
- `node-cron` jobs are in-process — a restart at 5 PM could miss a daily post; consider a "posted today" flag per channel
- DM notifications (Task 6) not yet implemented
- No `.env.example` file yet
