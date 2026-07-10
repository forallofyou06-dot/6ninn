import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const tagsTable = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Tag = typeof tagsTable.$inferSelect;
