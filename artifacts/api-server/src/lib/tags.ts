import { db, tagsTable, eventTagsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function upsertEventTags(eventId: number, tagNames: string[], ctx: DbOrTx = db): Promise<void> {
  await ctx.delete(eventTagsTable).where(eq(eventTagsTable.eventId, eventId));
  if (!tagNames.length) return;
  const tagIds: number[] = [];
  for (const name of tagNames) {
    const existing = await ctx.select().from(tagsTable).where(eq(tagsTable.name, name)).limit(1);
    if (existing.length) {
      tagIds.push(existing[0].id);
    } else {
      const [t] = await ctx.insert(tagsTable).values({ name }).returning();
      tagIds.push(t.id);
    }
  }
  if (tagIds.length) {
    await ctx.insert(eventTagsTable).values(tagIds.map((tagId) => ({ eventId, tagId })));
  }
}

export async function getEventTagNames(eventId: number): Promise<string[]> {
  const rows = await db
    .select({ name: tagsTable.name })
    .from(eventTagsTable)
    .innerJoin(tagsTable, eq(eventTagsTable.tagId, tagsTable.id))
    .where(eq(eventTagsTable.eventId, eventId));
  return rows.map((r) => r.name);
}

export async function getTopTags(limit = 10): Promise<{ tag: string; count: number }[]> {
  const rows = await db
    .select({ name: tagsTable.name, count: sql<number>`count(*)` })
    .from(eventTagsTable)
    .innerJoin(tagsTable, eq(eventTagsTable.tagId, tagsTable.id))
    .groupBy(tagsTable.name)
    .orderBy(sql`count(*) desc`)
    .limit(limit);
  return rows.map((r) => ({ tag: r.name, count: Number(r.count) }));
}
