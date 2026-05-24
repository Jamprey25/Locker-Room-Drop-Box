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

Edit **`.env`**: paste **two** Supabase URIs (**Settings → Database → Connection strings**):

- **`DATABASE_URL`** — **Transaction pool (Supavisor)** — **`…pooler.supabase.com:6543`** · what **Next.js** uses · append **`pgbouncer=true`** (plus **`sslmode=require`**) · [Supabase + Prisma](https://supabase.com/docs/guides/database/prisma).

- **`DIRECT_URL`** — **`prisma` `directUrl`** for **`db push` / migrate**. Prefer **`…pooler.supabase.com:5432`** (**Session pool**, user **`postgres.<ref>`**) so **IPv4** works. Avoid relying on **`db.<ref>.supabase.co:5432`** locally — many networks get **`P1001`** (often IPv6-only). Do **not** reuse the `:6543` string here (`db push` would hang).

Set **`AUTH_SECRET`** (`openssl rand -base64 32`; required on production).

| Variable       | Purpose |
|----------------|---------|
| `DATABASE_URL` | Pooled Postgres (**often `:6543`**) · app + cold starts. Loaded via **`npm run db:*` + `.env`/`.env.local`**. Raw **`npx prisma`** ignores `.env.local`. |
| `DIRECT_URL`   | **`5432`** **Session pool** on **`*pooler.supabase.com`** (or **`db.<ref>`** if reachable). Prisma DDL/migrate — **≠** txn `:6543` |
| `AUTH_SECRET`  | JWT signing · **required on Vercel prod** |
| `NEXTAUTH_SECRET` | Optional alias for `AUTH_SECRET` (NextAuth v4 naming). |

Dev auth fallback: Auth.js uses a deterministic dev JWT secret whenever `NODE_ENV !== "production"` and `AUTH_SECRET` is absent.

### 2) Install deps

`npm install` runs [`scripts/postinstall-prisma.mjs`](scripts/postinstall-prisma.mjs) so **`prisma generate`** works before `.env` exists (dual **sentinel** **`DATABASE_URL` / `DIRECT_URL`** — **no TCP**).

### 3) Push schema → database (once per empty database)

**Needs a different `directUrl`** than `:6543` txn — Ctrl+C stuck `db push` / fix **`P1001` on `db.*:5432`** by switching **`DIRECT_URL`** to **[Session `:5432` pool URI](https://supabase.com/docs/guides/database/prisma)** (same region as DATABASE_URL).

From the repo root:

```bash
npm run db:push
```

This creates **`users`**, **`videos`**, **`resources`**, **`video_watches`** in your Supabase project.

### 4) Dev server

```bash
npm run dev
```

Landing: [/](http://localhost:3000) · Sign up [/signup](http://localhost:3000/signup) (aliases [/register](http://localhost:3000/register)) · Log in [/login](http://localhost:3000/login) · Locker [/hub](http://localhost:3000/hub) · Profile (change password) [/hub/profile](http://localhost:3000/hub/profile).

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

1. **Supabase:** **`DATABASE_URL` (txn `:6543`)** + **`DIRECT_URL` (Session `:5432` on `*.pooler.supabase.com`)** · [official Prisma pairing](https://supabase.com/docs/guides/database/prisma).

2. **Vercel:** **Settings → Environment variables** · **`DATABASE_URL`**, **`DIRECT_URL`**, **`AUTH_SECRET`**, **`NEXTAUTH_URL`** (canonical site).

3. **Redeploy** after env tweaks (`npm run build` invokes `postinstall-prisma`; the live app reads **`DATABASE_URL`** only—the direct URL satisfies Prisma tooling during install).

**Production-only workflow:** You do **not** need `npm run dev` locally. You **do** need the Postgres URLs + secrets configured in **Vercel**. To create or evolve tables (**`npm run db:push`**), run Prisma **once from any machine or CI job** that can reach Supabase with the same `DATABASE_URL` / `DIRECT_URL` pair (not from the edge runtime). Merge & **redeploy** after server-side fixes so production serves the newest code.

[**`src/auth.ts`**](src/auth.ts) keeps `trustHost: true` for proxies; confirm **`NEXTAUTH_URL`** matches prod if redirects mis-route.

The Supabase **`db.*.supabase.co`** `:5432` endpoint can behave like **IPv6-only** on Free tiers ([Supabase connection docs](https://supabase.com/docs/guides/database/connecting-to-postgres)). If `:5432` never connects locally, toggle **IPv4 add-on/proxy** in Supabase or use their connectivity checker.


## Repo & inspiration

Upstream: [`https://github.com/Jamprey25/Locker-Room-Drop-Box.git`](https://github.com/Jamprey25/Locker-Room-Drop-Box.git).

Learning Tracker vault patterns (canonical URLs, duplicate guard): [`docs/learning-tracker-technical-reference.md`](docs/learning-tracker-technical-reference.md).

## Troubleshooting

- **`MissingSecret`:** On Vercel set **`AUTH_SECRET`**. Locally use `.env`/`.env.local`, then restart **`npm run dev`**.
- **“Server error / problem with the server configuration” (Auth.js `Configuration`):** Almost always **`AUTH_SECRET` or `NEXTAUTH_SECRET` is missing or empty** in **Vercel → Environment Variables** (easy to accidentally remove when rotating DB URLs). Set a new secret: `openssl rand -base64 32`, redeploy **Production** (and **Preview** if you use preview deploys — scope vars to **All** environments if unsure).
- **`Environment variable not found` (P1012 on `DATABASE_URL` / `DIRECT_URL`):** Copy [`.env.example`](.env.example) → `.env`; Prisma **`schema.prisma`** now expects **both** keys. Prefer **`npm run db:*`** so **`.env.local`** merges cleanly.
- **`P1001` / `Can't reach database`:** Wrong password, typo in URI, firewall, or **`sslmode`** missing (`sslmode=require`).
- **`P1001` on `db.<ref>.supabase.co:5432`:** Your network likely lacks IPv6 routing to Supabase **direct**. Set **`DIRECT_URL`** to the **Session** string (**`*.pooler.supabase.com`** + port **`5432`**, user **`postgres.<ref>`**) from **Dashboard → Connect → Prisma** ([docs](https://supabase.com/docs/guides/database/prisma)). Keep **`DATABASE_URL`** on **`:6543`** txn pool.
- **`npm run db:push` never finishes (`6543`):** **`DIRECT_URL`** must **not** match txn **`6543`** — use session **`5432`** on the pool host (see [`.env.example`](.env.example)).
- **`db:push` complains drift:** Run **`prisma migrate diff`**/`reset` only after understanding data loss implications.
- **Signup shows “tables may be missing” but Table Editor lists `users`:** The deployed app uses **`DATABASE_URL` on Vercel**, which may target a **different Supabase project** than the dashboard you checked — confirm the **`postgres.<project-ref>`** segment matches. Strip or fix **`schema=`** in the URI (wrong `schema=` points Prisma at an empty schema). Use **Vercel → Logs** for the actual Prisma error code (many codes are not fixed by **`db:push`**).
- **Signup shows only “Something went wrong”:** That was historically [`prismaToUserMessage`](/src/lib/prisma-user-message.ts)’s fallback when the driver error wasn’t classified or exceeded the displayed length. **Server-side `console.error("[registerAndSignIn]", …)`** now lands in **Vercel → Logs** — read the stack there first. If logs mention **`prepared statement`** with the pooler, add **`?sslmode=require&pgbouncer=true`** to **`DATABASE_URL`** on **`:6543`** (see [.env.example](.env.example)). Redeploy for clearer on-page messages.

## Security notes

- Never commit `.env` / `.env.local` containing Supabase passwords or JWT secrets.

- Run `openssl rand -base64 32` whenever you rotate **`AUTH_SECRET`** (sessions invalidate).

