import { pgTable, serial, text, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  hostId: integer("host_id").notNull().references(() => usersTable.id),
  theme: text("theme").notNull(),
  subTheme: text("sub_theme"),
  datetime: timestamp("datetime").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(120),
  location: text("location").notNull(),
  locationUrl: text("location_url"),
  fee: integer("fee").notNull().default(0),
  capacity: integer("capacity").notNull().default(6),
  minParticipants: integer("min_participants").notNull().default(2),
  deadline: date("deadline").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("募集中"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true, createdAt: true });
export const selectEventSchema = createSelectSchema(eventsTable);
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;
