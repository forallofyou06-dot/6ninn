import { pgTable, integer, text, timestamp, unique, serial } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const likesTable = pgTable("likes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [unique().on(t.userId, t.targetType, t.targetId)]);

export type Like = typeof likesTable.$inferSelect;
