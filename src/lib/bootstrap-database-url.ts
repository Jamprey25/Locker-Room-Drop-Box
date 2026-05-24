/** Validates DATABASE_URL presence for PostgreSQL Prisma Client (runs via import side-effect). */
export function bootstrapDatabaseUrl() {
  const current = process.env.DATABASE_URL?.trim();
  if (current) return;

  if (process.env.NODE_ENV === "production") {
    console.error(
      "[db] DATABASE_URL is not set. Add Postgres (e.g. Supabase) URL in production env.",
    );
    return;
  }

  console.error(
    "[db] DATABASE_URL is not set — copy .env.example to .env/.env.local and add your Postgres URL.",
  );
}

bootstrapDatabaseUrl();
