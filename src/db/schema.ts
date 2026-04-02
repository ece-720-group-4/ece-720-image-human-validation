import {
  pgTable,
  serial,
  varchar,
  text,
  real,
  integer,
  boolean,
  timestamp,
  json,
} from "drizzle-orm/pg-core";

export const raters = pgTable("raters", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const graphTypes = pgTable("graph_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 64 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const injectionTexts = pgTable("injection_texts", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  label: varchar("label", { length: 128 }),
  aiPrompt: text("ai_prompt"),
  injectionCheck: text("injection_check"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const taskPrompts = pgTable("task_prompts", {
  id: serial("id").primaryKey(),
  promptFamily: varchar("prompt_family", { length: 128 }).notNull().unique(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  blobUrl: text("blob_url").notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  graphTypeId: integer("graph_type_id").references(() => graphTypes.id),
  scenario: text("scenario"),
  promptFamily: text("prompt_family"),
  placementType: text("placement_type"),
  taskPromptId: integer("task_prompt_id").references(() => taskPrompts.id),
  groundTruth: json("ground_truth"),
  opacity: real("opacity"),
  fontSize: integer("font_size"),
  positionX: integer("position_x"),
  positionY: integer("position_y"),
  hasInjection: boolean("has_injection").notNull().default(false),
  injectionTextId: integer("injection_text_id").references(
    () => injectionTexts.id
  ),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const responses = pgTable("responses", {
  id: serial("id").primaryKey(),
  raterId: integer("rater_id")
    .notNull()
    .references(() => raters.id),
  imageId: integer("image_id")
    .notNull()
    .references(() => images.id),
  noticedAnomaly: boolean("noticed_anomaly").notNull(),
  responseTimeMs: integer("response_time_ms").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiResponses = pgTable("ai_responses", {
  id: serial("id").primaryKey(),
  imageId: integer("image_id"),
  rawResponse: text("raw_response"),
  isManipulated: boolean("is_manipulated"),
  humanOverride: boolean("human_override"),
  defenseType: varchar("defense_type", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow(),
});
