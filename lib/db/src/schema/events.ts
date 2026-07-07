import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  theme: text("theme").notNull(),
  subTheme: text("sub_theme"),
  dateStart: timestamp("date_start").notNull(),
  dateEnd: timestamp("date_end").notNull(),
  location: text("location").notNull(),
  locationUrl: text("location_url"),
  fee: integer("fee").notNull().default(0),
  capacity: integer("capacity").notNull().default(6),
  tags: text("tags").array().notNull().default([]),
  hostId: integer("host_id").notNull().references(() => usersTable.id),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true, createdAt: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;
