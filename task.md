# Implementation Plan

## Context

Foundation already in place: Prisma schema (5 models), Discord bot scaffold, NextAuth Discord OAuth, cron scheduler stubs, and a bare Next.js admin route. The gaps are in connecting everything together — persisting data, building the UI, and wiring up the bot lifecycle.

---

## Tasks (ordered by dependency)

### Phase 1 — Database & Environment ✅

**Task 1 — Finalize Prisma schema & run initial migration** ✅
- Add any missing fields (e.g. `notificationsEnabled` on `User`, `channelId` on `Server` so the bot knows where to post)
- Run `prisma migrate dev --name init`
- Commit migration files

**Task 2 — Register Discord slash commands** ✅
- Create a one-off script (`src/scripts/register-commands.ts`) that calls the Discord REST API to register `/pushup` globally (or per-guild during dev)
- Add `npm run register` script to `package.json`
- Must run once after any command definition changes

---

### Phase 2 — Bot Core Logic

**Task 3 — Persist submission on `/pushup`** ✅
- On `/pushup <count>`, upsert a `Submission` row for `(userId, challengeId, today)`
- Auto-create `User` and `ServerUser` rows on first interaction (discord ID is available from interaction)
- Enforce the one-submission-per-day rule; if already submitted, update count and reply accordingly
- Reply ephemerally with confirmation

**Task 4 — Guild join handler (bot added to server)** ✅
- Listen for `guildCreate` event
- Create a `Server` row and a default `Challenge` (type: pushup, active: true)
- Store `channelId` of the system/default channel for posting results
- Post a welcome message with the registration link
- Bootstrap existing guilds on `clientReady` so setup isn't missed on restart

**Task 5 — Daily 5 PM result post**
- Fill in the scheduler stub: query all submissions for today across active challenges
- Format a ranked result message and post to each server's channel
- Handle the "no submissions today" edge case gracefully

**Task 6 — Opt-in DM notifications**
- Add `/notify on|off` command for users to toggle `notificationsEnabled`
- At a configurable time each morning, DM opted-in users a reminder to log their push-ups

---

### Phase 3 — Web Registration & Auth

**Task 7 — Registration landing page**
- Add a "Sign in with Discord" button on the home page using NextAuth's `signIn()`
- After OAuth callback, upsert the `User` record in the DB from the session `discordId`
- Redirect to `/admin` on success

**Task 8 — Auth guard on `/admin`**
- Check session server-side; redirect to `/` if unauthenticated
- Handle the multi-server case: if user belongs to one server, auto-select it; if multiple, show a server picker

---

### Phase 4 — Admin Dashboard

**Task 9 — API routes for dashboard data**
These are needed before building the UI components:
- `GET /api/submissions?month=YYYY-MM` — returns user's submissions for the given month (calendar view)
- `GET /api/stats` — returns total push-ups, last month vs this month delta
- `POST /api/submissions` — create/update a submission (for corrections)
- `DELETE /api/submissions/:id` — remove a submission

**Task 10 — Calendar view**
- Render a monthly calendar grid; highlight days with a check-in
- Clicking a day opens an edit modal (uses `POST /api/submissions`)

**Task 11 — Stats panel**
- Total push-ups (all time)
- Last month vs this month comparison (% delta)
- Line chart over time using Recharts (`<LineChart>` with date on X-axis, count on Y-axis)

**Task 12 — Leaderboard table on admin**
- Tabbed view: weekly / monthly
- Two columns: push-up count, check-in count
- Highlight the current user's row

---

### Phase 5 — Polish & Reliability

**Task 13 — Error handling & input validation**
- Wrap all Discord interaction handlers in try/catch; reply with a user-friendly error if something fails
- Validate `count` range on `/pushup` (already has `min: 1`, add a sane max e.g. 10,000)
- Handle DB connection errors gracefully at startup

**Task 14 — Environment & deployment config**
- Update `.env.example` with all required vars (DATABASE_URL, DISCORD_TOKEN, DISCORD_CLIENT_ID/SECRET, NEXTAUTH_SECRET, NEXTAUTH_URL)
- Add a startup check that fails fast with a clear message if required env vars are missing

---

### Phase 6 — Leaderboard Posts

**Task 15 — Weekly leaderboard (Sundays 8 PM)**
- Fill in scheduler stub: aggregate submissions for the current week
- Post two columns: total push-up count and total check-ins (days submitted)
- Reuse a shared `formatLeaderboard()` helper (also used by monthly)

**Task 16 — Monthly leaderboard (1st of month 8 PM)**
- Same as Task 15 but scoped to the previous calendar month
- Re-use `formatLeaderboard()` helper

---

## Risks & Edge Cases

### Data integrity
- **Duplicate submissions**: The `@@unique([userId, challengeId, date])` constraint handles this at the DB level, but the bot should still catch and explain the conflict to the user rather than throwing a raw error.
- **Timezone mismatches**: "Today" and "5 PM" are ambiguous — the cron jobs and date comparisons must all use a consistent timezone (store a `timezone` on `Server` or standardize on UTC with a configurable offset).

### Discord API limits
- **Slash command registration**: Global commands take up to 1 hour to propagate. During development, register to a specific guild instead.
- **Rate limits**: If many servers are active, posting leaderboards simultaneously could hit Discord's rate limits. Add a small delay between per-server posts.
- **DM failures**: Users can have DMs disabled. The notification sender must catch `DiscordAPIError` code `50007` and silently skip rather than crashing.

### Multi-server / multi-challenge
- A user in multiple servers will have multiple `ServerUser` rows. The admin dashboard needs to scope all queries by `(userId, serverId)` — don't leak data across servers.
- The `/pushup` command must resolve *which* challenge to log against. If a guild has one active challenge this is trivial; guard against the case where none exist (bot was removed and re-added, or challenge was deactivated).

### Scheduler reliability
- `node-cron` jobs are in-process and will be missed if the bot restarts at 5 PM. For production, consider persisting a "daily result posted" flag per server per day so a restart doesn't double-post or skip.

### Auth & session
- NextAuth Discord tokens expire. Ensure the session refresh is handled and that the `discordId` is always propagated into the session (already done in the auth route, but verify after next-auth beta updates).
- `/admin` must validate that the authenticated user actually belongs to the selected server before returning any data.

### Bot removal
- When the bot is kicked (`guildDelete` event), mark the `Server` and its `Challenge` as inactive rather than deleting rows, so historical data is preserved if the bot is re-added.
