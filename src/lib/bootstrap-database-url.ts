/** Ensures Prisma sees a DATABASE_URL before the client initializes (runs via import side-effect). */
export function bootstrapDatabaseUrl() {
  const current = process.env.DATABASE_URL?.trim();
  if (current) return;

  if (process.env.NODE_ENV === "production") {
    console.error(
      "[db] DATABASE_URL is not set. Add SQLite or Postgres URL in your host env (see README).",
    );
    return;
  }

  /**
   * Resolves beside `prisma/schema.prisma` → `prisma/dev.db`.
   */
  process.env.DATABASE_URL = "file:dev.db";
  console.warn(
    "[db] DATABASE_URL unset — defaulting dev to SQLite prisma/dev.db (npm run db:push).",
  );
}

bootstrapDatabaseUrl();
