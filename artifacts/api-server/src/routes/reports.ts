import { Router } from "express";
import { db, usersTable, eventsTable, reportsTable, participationsTable, likesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/getOrCreateUser";
import { getAuth } from "@clerk/express";

const router = Router();

// OpenAPI spec・フロントエンドと統一した種別値
const REPORT_TYPES = ["参加者感想", "開催者報告"] as const;
type ReportType = typeof REPORT_TYPES[number];

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
    if (!REPORT_TYPES.includes(type as ReportType)) {
      res.status(400).json({ error: `type は ${REPORT_TYPES.join(" または ")} のみ有効です` }); return;
    }
    if (typeof content !== "string" || content.trim().length === 0) {
      res.status(400).json({ error: "content が空です" }); return;
    }
    if (content.length > 2000) {
      res.status(400).json({ error: "content は2000文字以内" }); return;
    }

    // 原則としてイベント開催後のみ投稿可
    if (event.status !== "開催済" && event.status !== "実施確定") {
      res.status(400).json({ error: "レポートはイベント実施確定後に投稿できます" }); return;
    }

    if (type === "開催者報告") {
      // ホストのみ投稿可
      if (event.hostId !== user.id) {
        res.status(403).json({ error: "開催者報告はホストのみ投稿できます" }); return;
      }
      // 重複チェック
      const existing = await db.select().from(reportsTable)
        .where(and(eq(reportsTable.eventId, eventId), eq(reportsTable.authorId, user.id), eq(reportsTable.type, "開催者報告")))
        .limit(1);
      if (existing.length > 0) {
        res.status(400).json({ error: "開催者報告はすでに投稿済みです" }); return;
      }
    } else {
      // 申込済み参加者のみ（ホスト除く）
      const part = await db.select().from(participationsTable)
        .where(and(eq(participationsTable.eventId, eventId), eq(participationsTable.userId, user.id), eq(participationsTable.status, "申込")))
        .limit(1);
      if (!part.length) {
        res.status(403).json({ error: "参加申込済みの方のみ感想を投稿できます" }); return;
      }
      // 重複チェック
      const existing = await db.select().from(reportsTable)
        .where(and(eq(reportsTable.eventId, eventId), eq(reportsTable.authorId, user.id), eq(reportsTable.type, "参加者感想")))
        .limit(1);
      if (existing.length > 0) {
        res.status(400).json({ error: "参加者感想はすでに投稿済みです" }); return;
      }
    }

    const [report] = await db.insert(reportsTable).values({
      eventId, authorId: user.id,
      type: type as ReportType,
      content: content.trim(),
      photoUrl: photoUrl || null,
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
