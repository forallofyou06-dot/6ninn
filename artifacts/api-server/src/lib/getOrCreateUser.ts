import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function getOrCreateUser(clerkUserId: string, email: string) {
  const existing = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
  if (existing.length > 0) return existing[0];
  const [newUser] = await db.insert(usersTable).values({
    clerkUserId,
    email,
    role: "member",
    interestTags: [],
  }).returning();
  return newUser;
}
