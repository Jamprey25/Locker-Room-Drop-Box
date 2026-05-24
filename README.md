# Locker Room Dropbox

Locker Room Dropbox is the lightweight “crew vault” for your investing /
real‑estate study group: teammates sign in once, stash YouTube walkthroughs
with the same ingest flow as Learning Tracker’s vault, stash arbitrary links under
Resources, and mark videos as watched so everyone can see who has caught up.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- NextAuth credentials (JWT sessions, bcrypt hashed passwords)
- Prisma ORM + PostgreSQL
- Tailwind CSS 4 + YouTube oEmbed metadata ingest

## Quick start

### 1) Install deps

```bash
npm install
```

### 2) Environment

Copy [.env.example](.env.example) to `.env` and supply:

| Variable       | Purpose                                      |
|----------------|----------------------------------------------|
| `DATABASE_URL` | Postgres connection string (Supabase/neon/pg) |
| `AUTH_SECRET`  | Signing secret (`openssl rand -base64 32`)   |

### 3) Database

```bash
npm run db:migrate
```

(Use `npm run db:push` instead if you purely want prototyping without migrations.)

### 4) Dev server

```bash
npm run dev
```

Landing page: [/](http://localhost:3000) · Locker: [/hub](http://localhost:3000/hub).

## Scripts

```bash
npm run dev           # Turbopack dev server
npm run build         # Production build
npm run lint          # ESLint
npm run db:migrate    # prisma migrate dev
npm run db:studio     # Prisma Studio
```

## Repo & inspiration

Upstream Git remote: [`https://github.com/Jamprey25/Locker-Room-Drop-Box.git`](https://github.com/Jamprey25/Locker-Room-Drop-Box.git).

The YouTube ingestion pattern mirrors Learning Tracker (“vault”) — canonical watch URLs, duplicate guard, lightweight oEmbed enrichment. Reference copies live in `/docs`:

- [`docs/learning-tracker-readme-reference.md`](docs/learning-tracker-readme-reference.md)
- [`docs/learning-tracker-technical-reference.md`](docs/learning-tracker-technical-reference.md)

## Security notes

- Never commit `.env`.
- Prefer TLS (`sslmode=require`) for hosted Postgres URLs.
- Run `openssl rand -base64 32` (or similar) whenever you rotate `AUTH_SECRET`; doing so logs everyone out immediately.
