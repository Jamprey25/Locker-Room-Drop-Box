# Locker Room Dropbox

Locker Room Dropbox is the lightweight “crew vault” for your investing /
real‑estate study group: teammates sign in once, stash YouTube walkthroughs
with the same ingest flow as Learning Tracker’s vault, stash arbitrary links under
Resources, and mark videos as watched so everyone can see who has caught up.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- NextAuth credentials (JWT sessions, bcrypt hashed passwords)
- Prisma ORM + **SQLite by default** (local `prisma/dev.db`, zero Postgres setup)
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
| `DATABASE_URL` | Default `file:dev.db` → **`prisma/dev.db`**. For Postgres later use `postgresql://...`. |
| `AUTH_SECRET`  | JWT signing secret (`openssl rand -base64 32`) |
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

### Moving to Postgres (Neon / Supabase) later

1. Provision a Postgres URL and put it in `DATABASE_URL`.
2. In [`prisma/schema.prisma`](prisma/schema.prisma) change `provider` from `"sqlite"` to `"postgresql"`.
3. Run `npm run db:push` (or `npm run db:migrate` once you regenerate migrations).

Serverless hosts (for example Vercel) normally expect Postgres rather than SQLite.

## Repo & inspiration

Upstream: [`https://github.com/Jamprey25/Locker-Room-Drop-Box.git`](https://github.com/Jamprey25/Locker-Room-Drop-Box.git).

Learning Tracker vault patterns (canonical URLs, duplicate guard): [`docs/learning-tracker-technical-reference.md`](docs/learning-tracker-technical-reference.md).

## Troubleshooting

- **`MissingSecret`:** Define `AUTH_SECRET` (or `NEXTAUTH_SECRET`) in `.env.local`, restart dev server.
- **Signup / hub errors referencing `DATABASE_URL` or missing tables:** Run `npm run db:push` from the repo root.

## Security notes

- Never commit `.env` with secrets; [`prisma/.env`](prisma/.env) only pins a non-secret SQLite file path.
- Run `openssl rand -base64 32` whenever you rotate `AUTH_SECRET` (sessions invalidate).
