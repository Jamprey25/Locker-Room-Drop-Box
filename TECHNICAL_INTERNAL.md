# Locker Room Dropbox — TECHNICAL_INTERNAL

_Last updated: 2026-05-24_

## Architecture

Traffic flows Next.js middleware → guarded `/hub/**` routes → React server components hydrate Prisma payloads → Tailwind-rendered lockers. Credentials hit NextAuth’s authorize hook, bcrypt compares `password_hash`, JWT stores `sub = user.id`, middleware blocks anonymous `/hub`.

YouTube ingestion keeps the invariant from Learning Tracker: every saved clip maps to canonical `https://www.youtube.com/watch?v=<videoId>` with `videos.url` enforcing uniqueness (`docs/learning-tracker-technical-reference.md` §3 / §4.1 mirror this rationale at a trimmed scope).

## State management

Mutable state splits three ways:

| Concern               | Persistence                         | Mutation surface                          |
|-----------------------|--------------------------------------|--------------------------------------------|
| Auth session          | NextAuth JWT (no server session tbl) | `signIn`, `signOut`, middleware guard      |
| Videos / Resources    | Postgres via Prisma                 | `/src/app/actions/hub.ts` server actions    |
| Per-user watched flag | `video_watches` join table (`@@unique [userId, videoId]`) | `toggleVideoWatched` + optimistic Hub UI |

Videos never embed watch progress from YouTube APIs; teammates must explicitly toggle “I watched this,” which emits a join row surfaced in the Locker UI roster.

## Logic flows

1. **Signup** (`/signup`) — `registerAndSignIn` lowers email case, bcrypt-hashes passwords (cost 12), creates `users`, invokes `signIn("credentials")`, then redirects `/hub`. Unauthenticated `/hub` visitors land on `/login`, which surfaces the same signup links in chrome + footer (`src/app/login/page.tsx`).
2. **YouTube ingest** (`ingestYoutubeVideo`) extracts ID (`src/lib/youtube.ts`), rejects invalid strings, resolves duplicates early, grabs oEmbed (fallback title + CDN thumbnail), persists `videos.added_by_id`.
3. **Resource ingest** validates URL (`z.string().url()`), optional title/note trimming, persists `resources`.
4. **Watch roster** renders `videos.watches` sorted ascending by timestamp; duplicates impossible per uniqueness constraint — React keys use watcher `user.id`.

## Dependencies

| Package        | Reason |
|----------------|--------|
| `next` / `react` | App Router SSR + streaming-friendly UI shells |
| `next-auth`    | Batteries-included credentials JWT without standing up custom session cookies |
| `prisma`       | Typed Postgres access + relational constraints enforcing vault dedupe/watch uniqueness |
| `bcryptjs`     | Stable password hashing in pure JS (easier deployment story than native bcrypt) |
| `zod`          | Shared validation for signup + ingest boundaries |
| `tailwindcss`  | Utility styling with zero bespoke CSS tooling beyond `globals.css` |

## Edge cases / gotchas

- YouTube shorts, embed URLs, legacy `youtu.be` links funnel through regex parsing; unrecognized patterns throw a user-facing validation error rather than silently failing.
- oEmbed outages fall back to `YouTube video <id>` + `hqdefault.jpg` thumbnails so lockers stay usable offline from Google metadata endpoints.
- Re-pasting duplicates returns `{ duplicate: true }` so UX can shout that the locker already tracked the lesson while still triggering `router.refresh()` to sync ordering.
- The Hub balances optimistic watch toggles with a fingerprint keyed `useEffect`, so subsequent `router.refresh()` payloads hydrate `watchedIds` without trapping React state behind stale `useState` initializers (`src/components/hub/hub-client.tsx`).
- `resolveAuthSecret` (`src/auth.ts`) reads `AUTH_SECRET` or `NEXTAUTH_SECRET`, logs a dev fallback when `NODE_ENV !== "production"` if both are missing (so Auth routes don’t 500 during first-time setup), and leaves `secret` undefined during production builds/run without env so deploys must supply a real secret.
- `trustHost` is enabled for deployments behind proxies (Vercel). Lock down hosts via official NextAuth guides if exposing custom infra.

### Pedagogical note

Canonicalizing hostile user URLs before persistence is textbook **input sanitation + invariant preservation**: you derive a deterministic key (`videoId`) and refuse ambiguous states, analogous to normalization layers in compilers or relational dedupe pipelines. Teach this alongside database unique indexes so students connect application validation with constraint enforcement.

## Documentation maintenance checklist

Whenever routing, schema, env vars, or auth flows diverge:

1. Reflect “what/how” updates in `/README.md`.
2. Extend this `/TECHNICAL_INTERNAL.md` with new flows and edge reasoning.
3. Mention behavioral deltas in commits so collaborators know README expectations changed.
