import { Prisma } from "@prisma/client";

/** Applies when Postgres is up but migrations/schema were never pushed. */
const SCHEMA_SYNC_HINT =
  "Tables may be missing. From the repo root run `npm run db:push` (Supabase: `DATABASE_URL` txn :6543 + `DIRECT_URL` Session :5432 — see README).";

/** Pool / network / paused project — not fixed by schema push alone. */
const CONNECT_HINT =
  "Could not connect to Postgres. Check `DATABASE_URL` in `.env`/`.env.local`, that the Supabase project is not paused, and that your network allows outbound Postgres (often port 6543 for the txn pool).";

export function prismaToUserMessage(
  cause: unknown,
  fallback = "Something went wrong. Try again.",
): string {
  if (!(cause instanceof Error)) return fallback;

  const msg = cause.message;

  // SQL layer / migrations — granular codes beat generic wrappers
  if (cause instanceof Prisma.PrismaClientKnownRequestError) {
    switch (cause.code) {
      case "P2002": {
        const target = cause.meta?.target;
        const fields = Array.isArray(target)
          ? target.map(String)
          : target != null
            ? [String(target)]
            : [];
        if (fields.some((f) => /email/i.test(f))) {
          return "That email is already registered.";
        }
        return "That row already exists (duplicate). Refresh and try again.";
      }
      case "P1001":
        return CONNECT_HINT;
      case "P1003":
        return `${CONNECT_HINT} (Database/catalog not reachable or wrong name.)`;
      case "P2021":
        return SCHEMA_SYNC_HINT;
      default:
        if (
          cause.code.startsWith("P20") ||
          msg.toLowerCase().includes("does not exist")
        ) {
          return `${SCHEMA_SYNC_HINT} (${cause.code})`;
        }
        return `Database issue (${cause.code}). Retry in a minute; check Supabase status if it persists.`;
    }
  }

  if (cause instanceof Prisma.PrismaClientInitializationError) {
    if (msg.includes("Environment variable not found: DATABASE_URL")) {
      return "Database URL is missing. Copy .env.example to .env and set DATABASE_URL / DIRECT_URL (see README).";
    }
    if (/can'?t reach database server|timed out|P1001/i.test(msg)) {
      return CONNECT_HINT;
    }
    if (
      /error validating datasource|datasource url|invalid.*?connection/i.test(
        msg,
      )
    ) {
      return `Database URL looks invalid or TLS failed. Verify .env string and sslmode/pgBouncer params. ${CONNECT_HINT}`;
    }
    return `${CONNECT_HINT} (${msg.split("\n")[0]?.slice(0, 140) ?? "init error"})`;
  }

  if (msg.includes("Environment variable not found: DATABASE_URL")) {
    return "Database URL is missing. Copy .env.example to .env and set DATABASE_URL / DIRECT_URL (see README).";
  }

  if (
    msg.includes("Error validating datasource") ||
    msg.includes("Datasource URL")
  ) {
    return `Database URL was rejected during validation — check copy/paste, URL-encoded password characters, sslmode/pgBouncer query params. ${CONNECT_HINT}`;
  }

  if (/can'?t reach database server|P1001|connection refused|EHOSTUNREACH|ETIMEDOUT/i.test(msg)) {
    return CONNECT_HINT;
  }

  // Legacy SQLite-era message still seen in cached builds
  if (msg.includes("Database file does not exist")) {
    return SCHEMA_SYNC_HINT;
  }

  return msg.length > 0 && msg.length < 220 ? msg : fallback;
}
