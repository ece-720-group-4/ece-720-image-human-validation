/**
 * Seeds the task_prompts table with one prompt per prompt family,
 * then backfills task_prompt_id on existing images rows.
 *
 * Usage:
 *   npm run seed-task-prompts
 *
 * Requires DATABASE_URL in .env.local
 * Safe to run multiple times (upserts by prompt_family).
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";
import { eq } from "drizzle-orm";

const db = drizzle(neon(process.env.DATABASE_URL!), { schema });
const { taskPrompts, images } = schema;

const TASK_PROMPTS: { promptFamily: string; content: string }[] = [
  {
    promptFamily: "selective_reporting",
    content: "Describe the overall trend in the chart using all available data.",
  },
  {
    promptFamily: "scale_manipulation",
    content: "What is the approximate maximum value shown in the chart?",
  },
  {
    promptFamily: "legend_override",
    content: "Compare the two data series in the chart.",
  },
  {
    promptFamily: "category_relabeling",
    content: "What does each category represent in the chart?",
  },
  {
    promptFamily: "share_manipulation",
    content: "Which category has the largest share in the chart?",
  },
  {
    promptFamily: "scale_reinterpretation",
    content: "What do the values in this chart represent?",
  },
  {
    promptFamily: "ranking_reinterpretation",
    content: "Rank the categories from largest to smallest.",
  },
];

async function main() {
  console.log("Seeding task_prompts...");

  for (const entry of TASK_PROMPTS) {
    const [row] = await db
      .insert(taskPrompts)
      .values(entry)
      .onConflictDoUpdate({
        target: taskPrompts.promptFamily,
        set: { content: entry.content },
      })
      .returning({ id: taskPrompts.id });

    // Backfill existing images that match this prompt family
    const updated = await db
      .update(images)
      .set({ taskPromptId: row.id })
      .where(eq(images.promptFamily, entry.promptFamily));

    console.log(
      `  ${entry.promptFamily} → id ${row.id} (backfilled ${(updated as unknown as { rowCount: number }).rowCount ?? "?"} images)`
    );
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
