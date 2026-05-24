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

/** Supabase DDL (db push / migrate / introspection) hangs on Tx pool ; must use db.*.supabase.co:5432 */
function prismaNeedsDirectTcpBypass(args) {
  const cmd = args[0];
  const sub = args[1];

  if (cmd === "migrate") return true;
  if (cmd === "db" && ["push", "pull", "execute"].includes(sub)) return true;
  if (cmd === "introspect") return true;
  return false;
}

function looksLikePgBouncerTxnPool(urlStr) {
  if (!urlStr) return false;
  return (
    urlStr.includes(":6543") ||
    /pooler\.supabase\.com/i.test(urlStr) ||
    /pooler/i.test(urlStr)
  ); // heuristic; pooled hosts almost always advertise pooler subdomain
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
  /**
   * For non-DDL CLI (format, studio, version) Prisma still parses directUrl —
   * mirror pooled URL unless we need a real direct pipe for DDL.
   */
  if (!prismaNeedsDirectTcpBypass(prismaArgs)) {
    process.env.DIRECT_URL = trimmedPool;
  }
}

trimmedDirect = process.env.DIRECT_URL?.trim();

if (prismaNeedsDirectTcpBypass(prismaArgs)) {
  if (!trimmedDirect) {
    console.error(
      "[db] DIRECT_URL missing — Schema changes against Supabase’s **transaction pooler** (often :6543) often stall.",
    );
    console.error(
      "[db] Copy the **direct** Postgres URI from Supabase (host `db.<project-ref>.supabase.co`, port **5432**) into DIRECT_URL. Keep DATABASE_URL on the pooled 6543 string for runtime.",
    );
    process.exit(1);
  }
  if (
    looksLikePgBouncerTxnPool(trimmedDirect) &&
    trimmedDirect === trimmedPool
  ) {
    console.error(
      "[db] DIRECT_URL still points at a pooler `:6543` URL — prisma db push will hang.",
    );
    console.error(
      "[db] Set DIRECT_URL to the **direct** connection (port **5432**), DATABASE_URL stays on the pooler.",
    );
    process.exit(1);
  }
  if (looksLikePgBouncerTxnPool(trimmedDirect)) {
    console.error(
      "[db] DIRECT_URL looks like another pooler URI — DDL needs the **direct Postgres** `:5432` host (`db.<ref>.supabase.co`).",
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
