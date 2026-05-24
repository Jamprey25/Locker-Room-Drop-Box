# Locker Room Dropbox

Locker Room Dropbox is the lightweight “crew vault” for your investing /
real‑estate study group: teammates sign in once, stash YouTube walkthroughs
with the same ingest flow as Learning Tracker’s vault, stash arbitrary links under
Resources, and mark videos as watched so everyone can see who has caught up.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- NextAuth credentials (JWT sessions, bcrypt hashed passwords)
- Prisma ORM — **SQLite on your laptop** (`prisma/dev.db`) · **PostgreSQL on Supabase** once you ship (recommended with Vercel)
- Tailwind CSS 4 + YouTube oEmbed metadata ingest

## Quick start

### 1) Install deps

```bash
npm install
```

### 2) Create the local database (required once per clone)

```bash
npm run db:push
```

[`prisma/.env`](prisma/.env) sets `DATABASE_URL="file:dev.db"`, which Prisma resolves to **`prisma/dev.db`** (next to `schema.prisma`). If runtime still lacks `DATABASE_URL` during dev (before you copy [.env.example](.env.example)), [`src/lib/bootstrap-database-url.ts`](src/lib/bootstrap-database-url.ts) injects that same SQLite URL automatically.

### 3) Environment (recommended)

Copy [.env.example](.env.example) to `.env` or `.env.local` when you want explicit control:

| Variable       | Purpose |
|----------------|---------|
| `DATABASE_URL` | Local default `file:dev.db` → **`prisma/dev.db`**. Prod: Supabase Postgres URI (often the **transaction pooler**, port **6543** — see Supabase docs). |
| `AUTH_SECRET`  | JWT signing secret (`openssl rand -base64 32`) · **required on Vercel prod** |
| `NEXTAUTH_SECRET` | Optional alias for `AUTH_SECRET` (NextAuth v4 naming). |

Dev auth fallback: Auth.js uses a deterministic dev JWT secret whenever `NODE_ENV !== "production"` and `AUTH_SECRET` is absent.

### 4) Dev server

```bash
npm run dev
```

Landing: [/](http://localhost:3000) · Sign up [/signup](http://localhost:3000/signup) (aliases [/register](http://localhost:3000/register)) · Log in [/login](http://localhost:3000/login) · Locker [/hub](http://localhost:3000/hub).

## Scripts

```bash
npm run dev      # Turbopack dev server
npm run build    # Production build
npm run lint     # ESLint
npm run db:push  # sync schema → SQLite (default team workflow)
npm run db:migrate  # prisma migrate dev (advanced / custom DB)
npm run db:studio # Prisma Studio
```

### Deploy roadmap: SQLite → Supabase + Vercel

This repo is deliberately **SQLite-first** so your group hacks locally with no cloud DB. When you are ready:

1. **Supabase:** create a project → **Settings → Database**. Copy the **connection string**. For Node/Vercel + Prisma, Supabase recommends the **transaction pooler** URI (often port **6543**) with `sslmode=require` so serverless bursts do not exhaust direct connections ([Supabase: connecting](https://supabase.com/docs/guides/database/connecting-to-postgres)).

2. **Prisma:** in [`prisma/schema.prisma`](prisma/schema.prisma) switch:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
   Optionally add **`DIRECT_URL`** (Supabase **direct/session** Postgres host on port **5432**) for **`prisma migrate`** from your laptop only—keep **`DATABASE_URL`** as the pooled string for runtime. *(If you skip migrations and only ever use `db:push`, a single pooled `DATABASE_URL` is often enough to start.)*

3. **Push schema once (from your machine, pointed at Supabase):**
   ```bash
   export DATABASE_URL="postgresql://..."   # pooled Supabase URI
   npx prisma generate
   npm run db:push
   ```

4. **Vercel:** import the repo → **Settings → Environment variables** · set **`DATABASE_URL`** (+ **`DIRECT_URL`** if you use split URLs) · set **`AUTH_SECRET`** (production). Redeploy. `npm run build` already runs `prisma generate` via `postinstall`.

5. **Auth.js hosts:** [`src/auth.ts`](src/auth.ts) uses `trustHost: true`; set your production **`NEXTAUTH_URL`** / site URL per Vercel domain if redirects ever mis-route (Auth.js docs for your beta version).

SQLite files do **not** migrate automatically—tables are recreated on Supabase with `db:push`; if you seeded real data locally, export/import separately.

## Repo & inspiration

Upstream: [`https://github.com/Jamprey25/Locker-Room-Drop-Box.git`](https://github.com/Jamprey25/Locker-Room-Drop-Box.git).

Learning Tracker vault patterns (canonical URLs, duplicate guard): [`docs/learning-tracker-technical-reference.md`](docs/learning-tracker-technical-reference.md).

## Troubleshooting

- **`MissingSecret`:** Define `AUTH_SECRET` (or `NEXTAUTH_SECRET`) in `.env.local`, restart dev server.
- **Signup / hub errors referencing `DATABASE_URL` or missing tables:** Run `npm run db:push` from the repo root.
- **Prod `Can't reach database` on Vercel:** confirm Supabase pooling URI, firewall/IP allowlists (if enabled), and that `sslmode=require` is present where Supabase expects it.

## Security notes

- Never commit `.env` with secrets; [`prisma/.env`](prisma/.env) only pins a non-secret SQLite file path for local Prisma CLI.
- Run `openssl rand -base64 32` whenever you rotate `AUTH_SECRET` (sessions invalidate).
