import { Prisma } from "@prisma/client";

const DB_SETUP_HINT =
  "Run `npm run db:push` once to sync the local SQLite file (`prisma/dev.db`).";

export function prismaToUserMessage(
  cause: unknown,
  fallback = "Something went wrong. Try again."
): string {
  if (!(cause instanceof Error)) return fallback;

  const msg = cause.message;

  if (msg.includes("Environment variable not found: DATABASE_URL")) {
    return `Database URL is missing. ${DB_SETUP_HINT}`;
  }

  if (
    msg.includes("Error validating datasource") ||
    msg.includes("Datasource URL")
  ) {
    return `Database configuration failed. Copy .env.example to .env. ${DB_SETUP_HINT}`;
  }

  if (
    cause instanceof Prisma.PrismaClientInitializationError ||
    msg.includes("P1003") ||
    msg.includes("Database file does not exist")
  ) {
    return DB_SETUP_HINT;
  }

  if (msg.includes("P2002")) {
    return "That row already exists (duplicate). Refresh and try again.";
  }

  if (cause instanceof Prisma.PrismaClientKnownRequestError) {
    return `Database error (${cause.code}). ${DB_SETUP_HINT}`;
  }

  return msg.length && msg.length < 200 ? msg : fallback;
}
