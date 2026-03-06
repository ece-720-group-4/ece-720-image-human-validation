/**
 * Generates unique rater keys and inserts them into the database.
 *
 * Usage:
 *   npm run generate-keys -- --count 5 --base-url https://your-app.vercel.app
 *
 * Requires DATABASE_URL in .env.local
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import crypto from "crypto";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";

async function main() {
  const args = process.argv.slice(2);
  let count = 3;
  let baseUrl = "http://localhost:3000";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--count" && args[i + 1]) count = parseInt(args[i + 1]);
    if (args[i] === "--base-url" && args[i + 1]) baseUrl = args[i + 1];
  }

  if (!process.env.DATABASE_URL) {
    console.error("Missing DATABASE_URL in .env.local");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql, { schema });

  console.log(`Generating ${count} rater keys...\n`);

  const keys: string[] = [];

  for (let i = 0; i < count; i++) {
    const key = crypto.randomBytes(12).toString("hex");
    const name = `Rater ${i + 1}`;

    await db.insert(schema.raters).values({ key, name });
    keys.push(key);

    const url = `${baseUrl}/rate?key=${key}`;
    console.log(`  Rater ${i + 1}: ${url}`);
  }

  console.log(`\nDone! Generated ${count} rater keys.`);
  console.log("\nKeys:");
  keys.forEach((k, i) => console.log(`  ${i + 1}. ${k}`));
}

main().catch(console.error);
