import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { eventsTable } from "./events";

export const participationsTable = pgTable("participations", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  comment: text("comment"),
  status: text("status").notNull().default("申込"),
  appliedAt: timestamp("applied_at").notNull().defaultNow(),
  cancelledAt: timestamp("cancelled_at"),
}, (t) => [unique().on(t.eventId, t.userId)]);

export const insertParticipationSchema = createInsertSchema(participationsTable).omit({ id: true, appliedAt: true, cancelledAt: true });
export type InsertParticipation = z.infer<typeof insertParticipationSchema>;
export type Participation = typeof participationsTable.$inferSelect;
