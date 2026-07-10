import { Router } from "express";
import { db, usersTable, eventsTable, participationsTable, reportsTable, feedbacksTable, eventTagsTable, tagsTable } from "@workspace/db";
import { eq, and, sql, gte } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/getOrCreateUser";
import { getAuth } from "@clerk/express";

const router = Router();

async function requireOffice(req: any, res: any): Promise<{ id: number; role: string } | null> {
  const clerkUserId = req.clerkUserId;
  const auth = getAuth(req);
  const email = (auth?.sessionClaims?.email as string) || "";
  const user = await getOrCreateUser(clerkUserId, email);
  if (user.role !== "office" && user.role !== "maintainer") {
    res.status(403).json({ error: "事務局権限が必要です" });
    return null;
  }
  return user;
}

router.get("/kpi", requireAuth, async (req, res) => {
  try {
    const user = await requireOffice(req, res);
    if (!user) return;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalEventsRow] = await db.select({ count: sql<number>`count(*)` }).from(eventsTable);
    const [completedRow] = await db.select({ count: sql<number>`count(*)` }).from(eventsTable).where(eq(eventsTable.status, "開催済"));
    const [cancelledRow] = await db.select({ count: sql<number>`count(*)` }).from(eventsTable).where(eq(eventsTable.status, "未実施"));
    const [monthEventsRow] = await db.select({ count: sql<number>`count(*)` }).from(eventsTable).where(gte(eventsTable.createdAt, monthStart));
    const [totalPartRow] = await db.select({ count: sql<number>`count(*)` }).from(participationsTable).where(eq(participationsTable.status, "申込"));
    const [monthPartRow] = await db.select({ count: sql<number>`count(*)` }).from(participationsTable).where(and(eq(participationsTable.status, "申込"), gte(participationsTable.appliedAt, monthStart)));
    const [feedbackRow] = await db.select({ count: sql<number>`count(*)` }).from(feedbacksTable);

    // つながり延べ数 = sum of n*(n-1)/2 for each 開催済 event
    const completedEvents = await db.select().from(eventsTable).where(eq(eventsTable.status, "開催済"));
    let totalConnectionPairs = 0;
    for (const event of completedEvents) {
      const [partCount] = await db.select({ count: sql<number>`count(*)` }).from(participationsTable).where(and(eq(participationsTable.eventId, event.id), eq(participationsTable.status, "申込")));
      const n = Number(partCount?.count ?? 0);
      totalConnectionPairs += Math.floor(n * (n - 1) / 2);
    }

    // Top tags
    const tagRows = await db
      .select({ name: tagsTable.name, count: sql<number>`count(*)` })
      .from(eventTagsTable)
      .innerJoin(tagsTable, eq(eventTagsTable.tagId, tagsTable.id))
      .groupBy(tagsTable.name)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    res.json({
      totalEvents: Number(totalEventsRow?.count ?? 0),
      completedEvents: Number(completedRow?.count ?? 0),
      cancelledEvents: Number(cancelledRow?.count ?? 0),
      eventsThisMonth: Number(monthEventsRow?.count ?? 0),
      totalParticipants: Number(totalPartRow?.count ?? 0),
      participantsThisMonth: Number(monthPartRow?.count ?? 0),
      totalConnectionPairs,
      totalFeedbacks: Number(feedbackRow?.count ?? 0),
      topTags: tagRows.map((r) => ({ tag: r.name, count: Number(r.count) })),
    });
  } catch (err) {
    req.log.error({ err }, "getOfficeKpi error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/feedbacks", requireAuth, async (req, res) => {
  try {
    const user = await requireOffice(req, res);
    if (!user) return;
    const feedbacks = await db.select().from(feedbacksTable).orderBy(feedbacksTable.createdAt);
    const results = await Promise.all(feedbacks.reverse().map(async (f) => {
      const fromUser = await db.select().from(usersTable).where(eq(usersTable.id, f.fromUserId)).limit(1);
      let eventTheme: string | null = null;
      if (f.eventId) {
        const events = await db.select().from(eventsTable).where(eq(eventsTable.id, f.eventId)).limit(1);
        eventTheme = events[0]?.theme ?? null;
      }
      return {
        id: f.id, content: f.content,
        fromUserName: fromUser[0]?.name ?? null,
        fromUserEmail: fromUser[0]?.email ?? "",
        eventId: f.eventId ?? null,
        eventTheme,
        createdAt: f.createdAt.toISOString(),
      };
    }));
    res.json(results);
  } catch (err) {
    req.log.error({ err }, "listOfficeFeedbacks error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/export/events", requireAuth, async (req, res) => {
  try {
    const user = await requireOffice(req, res);
    if (!user) return;
    const events = await db.select().from(eventsTable).orderBy(eventsTable.datetime);
    const rows = await Promise.all(events.map(async (e) => {
      const [partCount] = await db.select({ count: sql<number>`count(*)` }).from(participationsTable).where(and(eq(participationsTable.eventId, e.id), eq(participationsTable.status, "申込")));
      const host = await db.select().from(usersTable).where(eq(usersTable.id, e.hostId)).limit(1);
      return [
        e.id, e.theme, e.status,
        e.datetime instanceof Date ? e.datetime.toISOString() : e.datetime,
        e.location, e.fee, e.capacity,
        Number(partCount?.count ?? 0),
        host[0]?.name ?? host[0]?.email ?? "",
        e.deadline,
        e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt,
      ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",");
    }));
    const header = ["id", "テーマ", "状態", "開催日時", "場所", "会費", "定員", "参加者数", "ホスト", "締切日", "作成日時"]
      .map((v) => `"${v}"`).join(",");
    const csv = [header, ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="events.csv"');
    res.send("\ufeff" + csv); // BOM for Excel
  } catch (err) {
    req.log.error({ err }, "exportEventsCSV error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
