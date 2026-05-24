import { Prisma } from "@prisma/client";

const SCHEMA_SYNC_HINT =
  "Run `npm run db:push` from the repo root if the schema hasn’t been applied yet (Supabase Postgres; see README for `DATABASE_URL` / `DIRECT_URL`).";

export function prismaToUserMessage(
  cause: unknown,
  fallback = "Something went wrong. Try again."
): string {
  if (!(cause instanceof Error)) return fallback;

  const msg = cause.message;

  if (msg.includes("Environment variable not found: DATABASE_URL")) {
    return `Database URL is missing. Copy .env.example to .env and set DATABASE_URL / DIRECT_URL (see README).`;
  }

  if (
    msg.includes("Error validating datasource") ||
    msg.includes("Datasource URL")
  ) {
    return `Database configuration failed. Copy .env.example to .env. ${SCHEMA_SYNC_HINT}`;
  }

  if (
    cause instanceof Prisma.PrismaClientInitializationError ||
    msg.includes("P1003") ||
    msg.includes("Database file does not exist") ||
    msg.includes("P1001")
  ) {
    return SCHEMA_SYNC_HINT;
  }

  if (msg.includes("P2002")) {
    return "That row already exists (duplicate). Refresh and try again.";
  }

  if (cause instanceof Prisma.PrismaClientKnownRequestError) {
    return `Database error (${cause.code}). ${SCHEMA_SYNC_HINT}`;
  }

  return msg.length && msg.length < 200 ? msg : fallback;
}
