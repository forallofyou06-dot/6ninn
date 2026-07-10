import { pgTable, integer, primaryKey } from "drizzle-orm/pg-core";
import { eventsTable } from "./events";
import { tagsTable } from "./tags";

export const eventTagsTable = pgTable("event_tags", {
  eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
  tagId: integer("tag_id").notNull().references(() => tagsTable.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.eventId, t.tagId] })]);

export type EventTag = typeof eventTagsTable.$inferSelect;
