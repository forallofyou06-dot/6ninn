import { Router } from "express";
import { db, usersTable, eventsTable, reportsTable, participationsTable, likesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/getOrCreateUser";
import { getAuth } from "@clerk/express";

const router = Router();

async function formatReport(r: typeof reportsTable.$inferSelect, currentUserId: number | null) {
  const authors = await db.select().from(usersTable).where(eq(usersTable.id, r.authorId)).limit(1);
  const [likeRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(likesTable)
    .where(and(eq(likesTable.targetType, "report"), eq(likesTable.targetId, r.id)));
  const likesCount = Number(likeRow?.count ?? 0);
  let isLiked = false;
  if (currentUserId) {
    const liked = await db.select().from(likesTable)
      .where(and(eq(likesTable.targetType, "report"), eq(likesTable.targetId, r.id), eq(likesTable.userId, currentUserId)))
      .limit(1);
    isLiked = liked.length > 0;
  }
  return {
    id: r.id,
    eventId: r.eventId,
    authorId: r.authorId,
    type: r.type,
    content: r.content,
    photoUrl: r.photoUrl ?? null,
    authorName: authors[0]?.name ?? authors[0]?.email ?? "Unknown",
    likesCount,
    isLiked,
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/events/:id/reports", requireAuth, async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    if (isNaN(eventId)) { res.status(400).json({ error: "Invalid id" }); return; }
    const clerkUserId = (req as any).clerkUserId;
    const users = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
    const currentUserId = users[0]?.id ?? null;
    const reports = await db.select().from(reportsTable).where(eq(reportsTable.eventId, eventId));
    const results = await Promise.all(reports.map((r) => formatReport(r, currentUserId)));
    res.json(results);
  } catch (err) {
    req.log.error({ err }, "listReports error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/events/:id/reports", requireAuth, async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    if (isNaN(eventId)) { res.status(400).json({ error: "Invalid id" }); return; }
    const clerkUserId = (req as any).clerkUserId;
    const auth = getAuth(req);
    const email = (auth?.sessionClaims?.email as string) || "";
    const user = await getOrCreateUser(clerkUserId, email);
    const events = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
    if (!events.length) { res.status(404).json({ error: "会が見つかりません" }); return; }
    const event = events[0];
    const { type, content, photoUrl } = req.body;
    if (!type || !content) { res.status(400).json({ error: "type と content は必須です" }); return; }
    if (type !== "host" && type !== "participant") {
      res.status(400).json({ error: "type は host または participant のみ有効です" }); return;
    }
    if (type === "host") {
      if (event.hostId !== user.id) {
        res.status(403).json({ error: "ホスト報告はホストのみ投稿できます" }); return;
      }
    } else {
      // participant: 申込済みの参加者のみ（ホストは除く）
      const part = await db.select().from(participationsTable)
        .where(and(eq(participationsTable.eventId, eventId), eq(participationsTable.userId, user.id), eq(participationsTable.status, "申込")))
        .limit(1);
      if (!part.length) {
        res.status(403).json({ error: "参加申込済みの方のみ感想を投稿できます" }); return;
      }
    }
    const [report] = await db.insert(reportsTable).values({
      eventId, authorId: user.id, type, content, photoUrl: photoUrl || null,
    }).returning();
    res.status(201).json(await formatReport(report, user.id));
  } catch (err) {
    req.log.error({ err }, "createReport error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reports/:id/like", requireAuth, async (req, res) => {
  try {
    const reportId = Number(req.params.id);
    if (isNaN(reportId)) { res.status(400).json({ error: "Invalid id" }); return; }
    const clerkUserId = (req as any).clerkUserId;
    const auth = getAuth(req);
    const email = (auth?.sessionClaims?.email as string) || "";
    const user = await getOrCreateUser(clerkUserId, email);
    const reports = await db.select().from(reportsTable).where(eq(reportsTable.id, reportId)).limit(1);
    if (!reports.length) { res.status(404).json({ error: "レポートが見つかりません" }); return; }
    const existing = await db.select().from(likesTable)
      .where(and(eq(likesTable.targetType, "report"), eq(likesTable.targetId, reportId), eq(likesTable.userId, user.id)))
      .limit(1);
    let liked: boolean;
    if (existing.length > 0) {
      await db.delete(likesTable).where(eq(likesTable.id, existing[0].id));
      liked = false;
    } else {
      await db.insert(likesTable).values({ userId: user.id, targetType: "report", targetId: reportId });
      liked = true;
    }
    const [likeRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(likesTable)
      .where(and(eq(likesTable.targetType, "report"), eq(likesTable.targetId, reportId)));
    res.json({ liked, likesCount: Number(likeRow?.count ?? 0) });
  } catch (err) {
    req.log.error({ err }, "likeReport error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
