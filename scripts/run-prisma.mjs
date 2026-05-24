#!/usr/bin/env node
/**
 * Loads `.env` then `.env.local` (matching Next precedence) before proxying Prisma CLI.
 * Prisma only reads `.env` by default — not `.env.local` — which causes P1012 on Mac/Linux.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { config } from "dotenv";

const root = process.cwd();
const envFiles = [
  resolve(root, ".env"),
  resolve(root, ".env.local"),
];

if (existsSync(envFiles[0])) config({ path: envFiles[0] });
if (existsSync(envFiles[1])) config({ path: envFiles[1], override: true });

const prismaArgs = process.argv.slice(2);
let trimmedPool = process.env.DATABASE_URL?.trim();
let trimmedDirect = process.env.DIRECT_URL?.trim();

const wantsGenerateOnly =
  prismaArgs.length === 1 && prismaArgs[0] === "generate";

// prisma generate validates schema but never connects
const GENERATE_SENTINEL =
  "postgresql://postgres:postgres@127.0.0.1:5432/prisma_placeholder?schema=public&sslmode=require";

/** Commands that exercise Prisma DDL / introspection plumbing (prefer non-txn URLs). */
function prismaNeedsSeparateDirectUrl(args) {
  const cmd = args[0];
  const sub = args[1];

  if (cmd === "migrate") return true;
  if (cmd === "db" && ["push", "pull", "execute"].includes(sub)) return true;
  if (cmd === "introspect") return true;
  return false;
}

/** Supabase/Vercel txn pool `:6543` — Prisma DDL here often hangs; must not be used alone for migrate/db push. */
function looksLikeTxnPool6543(urlStr) {
  return Boolean(urlStr?.includes(":6543"));
}

if (!trimmedPool) {
  if (wantsGenerateOnly) {
    process.env.DATABASE_URL = GENERATE_SENTINEL;
    process.env.DIRECT_URL = GENERATE_SENTINEL;
    trimmedPool = process.env.DATABASE_URL;
    trimmedDirect = process.env.DIRECT_URL;
  } else {
    console.error(
      "[db] DATABASE_URL is unset. Copy .env.example → .env and add your Postgres URL.",
    );
    console.error(
      "[db] If you already use `.env.local` for secrets, npm run db:* loads it automatically.",
    );
    process.exit(1);
  }
} else if (!trimmedDirect) {
  if (!prismaNeedsSeparateDirectUrl(prismaArgs)) {
    process.env.DIRECT_URL = trimmedPool;
  }
}

trimmedDirect = process.env.DIRECT_URL?.trim();

if (prismaNeedsSeparateDirectUrl(prismaArgs)) {
  if (!trimmedDirect) {
    console.error(
      "[db] DIRECT_URL missing — `db push`/migrate cannot use txn pool `:6543` alone.",
    );
    console.error(
      "[db] Prefer Supabase **Session pool** (`*.pooler.supabase.com`, port **`5432`**, user `postgres.<ref>`). If your network has IPv6, `db.<ref>.supabase.co:5432` also works.",
    );
    process.exit(1);
  }
  if (
    looksLikeTxnPool6543(trimmedDirect) &&
    trimmedDirect === trimmedPool
  ) {
    console.error(
      "[db] DIRECT_URL matches DATABASE_URL on port :6543 — prisma db push will hang on transaction pool DDL.",
    );
    console.error(
      "[db] Use **Session mode** on the same pool host with port **5432** for DIRECT_URL (Supabase Connect → Prisma).",
    );
    process.exit(1);
  }
}

const spawn = spawnSync("npx", ["prisma", ...prismaArgs], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: process.env,
});

process.exit(typeof spawn.status === "number" ? spawn.status : 1);
