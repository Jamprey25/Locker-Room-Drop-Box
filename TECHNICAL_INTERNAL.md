# Locker Room Dropbox — TECHNICAL_INTERNAL

_Last updated: 2026-05-24_

## Architecture

Traffic flows Next.js middleware → guarded `/hub/**` routes → React server components hydrate Prisma payloads → Tailwind-rendered lockers. Credentials hit NextAuth’s authorize hook, bcrypt compares `password_hash`, JWT stores `sub = user.id`, middleware blocks anonymous `/hub`.

**Presentation shell:** [`src/app/hub/layout.tsx`](src/app/hub/layout.tsx) renders [`HubNav`](src/components/hub/hub-nav.tsx) plus `max-w-6xl` main content; if JWT decode yields no usable `user` (id + email), guests see a glass-styled reconnect card linking to `/login` instead of the hub. **`src/app/hub/loading.tsx`** provides route-level skeleton placeholders; **`src/app/not-found.tsx`** is the App Router global 404 with matching sky/indigo accents. Tokens align with **`src/app/globals.css`** (`@theme inline` Geist stacks, dark `color-scheme`, focus-visible ring).

**Persistence:** Prisma datasource is **`postgresql`** with **`DATABASE_URL`** (Supabase **pooler**/PgBouncer recommended—see README). [`scripts/postinstall-prisma.mjs`](scripts/postinstall-prisma.mjs) supplies a **non-connecting fallback** `DATABASE_URL` only during `npm install` so `prisma generate` succeeds without a populated `.env`. Runtime [`bootstrap-database-url.ts`](src/lib/bootstrap-database-url.ts) does **not** invent URLs; Next loads **`.env` / `.env.local`**. Older **SQLite (`prisma/dev.db`)** is no longer the default.

**Hosting path:** **Supabase Postgres + Vercel** with pooled **`DATABASE_URL`** + **`AUTH_SECRET`**; run **`npm run db:push`** against an empty Postgres project whenever the schema evolves.

YouTube ingestion keeps the invariant from Learning Tracker: every saved clip maps to canonical `https://www.youtube.com/watch?v=<videoId>` with `videos.url` enforcing uniqueness (`docs/learning-tracker-technical-reference.md` §3 / §4.1 mirrors this rationale at a trimmed scope).

## State management

| Concern               | Persistence                         | Mutation surface                          |
|-----------------------|--------------------------------------|--------------------------------------------|
| Auth session          | NextAuth JWT (no server session tbl) | `signIn`, `signOut`, middleware guard      |
| Videos / Resources    | Postgres via Prisma / Supabase      | `/src/app/actions/hub.ts` server actions    |
| Per-user watched flag | `video_watches` (`@@unique [userId, videoId]`) | `toggleVideoWatched` + optimistic Hub UI |

Schema sync ships as **`npm run db:push`**. Checked-in migrations were intentionally dropped early on so every clone avoids toolchain drift while the schema is simple; Postgres-focused teams can reintroduce `prisma migrate` once URLs stabilize.

## Logic flows

1. **Signup** (`/signup`) — `registerAndSignIn` lowers email case, bcrypt-hashes passwords (cost 12), creates `users`, invokes `signIn("credentials")`, then redirects `/hub`. Unauthenticated `/hub` visitors land on `/login`, which surfaces signup links (`src/app/login/page.tsx`). Prisma faults map to teammate-readable copy via [`src/lib/prisma-user-message.ts`](src/lib/prisma-user-message.ts).
2. **YouTube ingest** (`ingestYoutubeVideo`) extracts ID (`src/lib/youtube.ts`), rejects invalid strings, resolves duplicates early, grabs oEmbed (fallback title + CDN thumbnail), persists `videos.added_by_id`.
3. **Resource ingest** validates URL (`z.string().url()`), optional title/note trimming, persists `resources`.
4. **Watch roster** renders `videos.watches` sorted ascending by timestamp; duplicates blocked by uniqueness constraint — React keys reuse watcher `user.id`.

## Dependencies

| Package        | Reason |
|----------------|--------|
| `next` / `react` | App Router SSR + streaming-friendly UI shells |
| `next-auth`    | Credentials JWT sessions without relational session rows |
| `prisma`       | Typed relational access + FK/cascade deletes + dedupe uniqueness |
| `bcryptjs`     | Stable password hashing in pure JS |
| `zod`          | Signup / ingest boundaries |
| `tailwindcss`  | Utility styling |

### Pedagogical note

Canonicalizing hostile URLs into deterministic keys mirrors **compiler IR normalization**: refuse ambiguous parses, persist only canonical reps, rely on relational constraints (`UNIQUE`) as the enforcement layer students can inspect in SQLite (`prisma studio`).

## Edge cases / gotchas

- YouTube shorts, embed URLs, legacy `youtu.be` links funnel through regex parsing; unrecognized patterns throw a validation error surfaced to UI.
- oEmbed outages fall back to `YouTube video <id>` + `hqdefault.jpg` thumbnails so lockers remain usable offline from Google endpoints.
- Re-pasting duplicates returns `{ duplicate: true }`; UI explains the vault already tracked the lesson.
- The Hub fingerprints server watch lists (`src/components/hub/hub-client.tsx`) so optimistic toggles reconcile with refreshed RSC payloads.
- `authorize` catches Prisma failures and returns `null` (generic “invalid credentials” UX avoids leaking infra).
- SQLite on ephemeral serverless disks is **legacy** for this repo (Postgres is required). Supabase + pooled `DATABASE_URL` is the production baseline.
- `trustHost` remains enabled for proxies (Vercel). Align `NEXTAUTH_URL` with your canonical domain once deployed.

## Documentation maintenance checklist

Whenever routing, schema, env bootstrap, DB provider, or auth flows diverge:

1. Reflect onboarding steps in `/README.md`.
2. Extend this `/TECHNICAL_INTERNAL.md`.
3. Call out deltas in commits so teammates know SQLite vs Postgres drift.
