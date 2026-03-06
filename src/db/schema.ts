import {
  pgTable,
  serial,
  varchar,
  text,
  real,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const raters = pgTable("raters", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  blobUrl: text("blob_url").notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  contrast: real("contrast"),
  fontSize: integer("font_size"),
  position: varchar("position", { length: 64 }),
  hasInjection: boolean("has_injection").notNull().default(false),
  injectedText: text("injected_text"),
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
