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
const trimmedUrl = process.env.DATABASE_URL?.trim();

const wantsGenerateOnly =
  prismaArgs.length === 1 && prismaArgs[0] === "generate";

// Same rationale as scripts/postinstall-prisma.mjs: generate validates env but never connects.
const GENERATE_SENTINEL =
  "postgresql://postgres:postgres@127.0.0.1:5432/prisma_placeholder?schema=public&sslmode=require";

if (!trimmedUrl) {
  if (wantsGenerateOnly) {
    process.env.DATABASE_URL = GENERATE_SENTINEL;
  } else {
    console.error(
      "[db] DATABASE_URL is unset. Copy .env.example → .env and add your Postgres URL.",
    );
    console.error(
      "[db] If you already use `.env.local` for secrets, npm run db:* loads it automatically.",
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
