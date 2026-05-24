#!/usr/bin/env node
/**
 * prisma generate parses env("DATABASE_URL") but does not open a TCP connection.
 * Fresh clones may not have .env yet; use a syntactically valid placeholder only for generate.
 */
import { execSync } from "node:child_process";

const FALLBACK_URL =
  "postgresql://postgres:postgres@127.0.0.1:5432/postgres_placeholder?schema=public&sslmode=require";

process.env.DATABASE_URL ??= FALLBACK_URL;
process.env.DIRECT_URL ??= FALLBACK_URL;

execSync("npx prisma generate", { stdio: "inherit", env: process.env });
