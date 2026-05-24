# Locker Room Dropbox

Locker Room Dropbox is the lightweight “crew vault” for your investing /
real‑estate study group: teammates sign in once, stash YouTube walkthroughs
with the same ingest flow as Learning Tracker’s vault, stash arbitrary links under
Resources, and mark videos as watched so everyone can see who has caught up.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- NextAuth credentials (JWT sessions, bcrypt hashed passwords)
- Prisma ORM + **PostgreSQL** (recommended: **[Supabase](https://supabase.com)** pooled URL · **port 6543** for Vercel/serverless)
- Tailwind CSS 4 + YouTube oEmbed metadata ingest

## Quick start

### 1) Environment variables (need this before Postgres works)

```bash
cp .env.example .env
```

Edit **`.env`**: paste your **`DATABASE_URL`** from Supabase (**Settings → Database**). Prefer the **transaction pool / shared pooler** (often **`…pooler.supabase.com`** and **`6543`**) and append **`sslmode=require&pgbouncer=true`** for Prisma + PgBouncer ([Supabase: connecting](https://supabase.com/docs/guides/database/connecting-to-postgres)).

Set **`AUTH_SECRET`** (`openssl rand -base64 32`; required on production).

| Variable       | Purpose |
|----------------|---------|
| `DATABASE_URL` | Supabase Postgres (pooled **`6543`** for app/serverless). Put it in **`.env` or `.env.local`** (`npm run db:*` loads both; **`npx prisma ...` alone does not read `.env.local`**). |

| `AUTH_SECRET`  | JWT signing · **required on Vercel prod** |
| `NEXTAUTH_SECRET` | Optional alias for `AUTH_SECRET` (NextAuth v4 naming). |

Dev auth fallback: Auth.js uses a deterministic dev JWT secret whenever `NODE_ENV !== "production"` and `AUTH_SECRET` is absent.

### 2) Install deps

`npm install` runs [`scripts/postinstall-prisma.mjs`](scripts/postinstall-prisma.mjs) so **`prisma generate`** succeeds **before** you have a `.env` (fallback URL **does not touch your DB**).

### 3) Push schema → database (once per empty database)

From the repo root:

```bash
npm run db:push
```

This creates **`users`**, **`videos`**, **`resources`**, **`video_watches`** in your Supabase project.

### 4) Dev server

```bash
npm run dev
```

Landing: [/](http://localhost:3000) · Sign up [/signup](http://localhost:3000/signup) (aliases [/register](http://localhost:3000/register)) · Log in [/login](http://localhost:3000/login) · Locker [/hub](http://localhost:3000/hub).

## Migrating existing **SQLite** data (optional)

Older clones stored data in **`prisma/dev.db`**. The codebase is **PostgreSQL-only** now; **`db:push`** does **not** copy SQLite rows automatically. Either start fresh or export users/videos/etc. manually (SQLite dump → transform → insert in Supabase).

## Scripts

```bash
npm run dev      # Turbopack dev server
npm run build    # Production build
npm run lint     # ESLint
npm run db:generate  # prisma generate (.env then .env.local)
npm run db:validate # prisma validate
npm run db:push  # sync schema → Postgres (Supabase-safe team workflow)
npm run db:migrate  # prisma migrate dev (advanced)
npm run db:studio # Prisma Studio
```

## Deploy (Vercel + Supabase)

1. **Supabase:** Project ready with **`DATABASE_URL`** (same pooled URI pattern as above).
2. **Vercel:** **Settings → Environment variables** · **`DATABASE_URL`**, **`AUTH_SECRET`**, **`NEXTAUTH_URL`** (canonical site URL).
3. **Redeploy** after env changes (`npm run build` runs `postinstall-prisma`, then Next build).

[**`src/auth.ts`**](src/auth.ts) keeps `trustHost: true` for proxies; confirm **`NEXTAUTH_URL`** matches production if redirects drift.

If **`prisma db push`** or migrations ever **hang/fail through the pooler**, add Supabase **direct Postgres** (**`db.<project>.supabase.co:5432`**) as a second URI and introduce **`directUrl = env("DIRECT_URL")`** on the datasource in [`prisma/schema.prisma`](prisma/schema.prisma) ([Prisma migrate + PgBouncer](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections)).

## Repo & inspiration

Upstream: [`https://github.com/Jamprey25/Locker-Room-Drop-Box.git`](https://github.com/Jamprey25/Locker-Room-Drop-Box.git).

Learning Tracker vault patterns (canonical URLs, duplicate guard): [`docs/learning-tracker-technical-reference.md`](docs/learning-tracker-technical-reference.md).

## Troubleshooting

- **`MissingSecret`:** Define `AUTH_SECRET` (or `NEXTAUTH_SECRET`) in `.env`/`.env.local`, restart dev server.
- **`Environment variable not found: DATABASE_URL` (P1012):** Define **`DATABASE_URL`** in repo-root **`.env`** or **`.env.local`**, then use **`npm run db:push`** (not raw `npx prisma db push` unless you **`export DATABASE_URL`** first). Prisma’s CLI ignores **`.env.local`** unless you wrap it—as this repo does for **`npm run db:*`**.
- **`P1001` / `Can't reach database`:** Wrong password, typo in URI, firewall, or **`sslmode`** missing (`sslmode=require`).
- **`prisma db push` stalls on pool host:** Prefer **direct** URL for DDL (see Deploy section) or Retry from network without VPN interference.
- **`db:push` complains drift:** Run **`prisma migrate diff`**/`reset` only after understanding data loss implications.

## Security notes

- Never commit `.env` / `.env.local` containing Supabase passwords or JWT secrets.

- Run `openssl rand -base64 32` whenever you rotate **`AUTH_SECRET`** (sessions invalidate).

