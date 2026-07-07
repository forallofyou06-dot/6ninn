import { Router } from "express";
import { db, usersTable, eventsTable, applicationsTable, reportsTable, commentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/getOrCreateUser";
import { getAuth } from "@clerk/express";

const router = Router();

async function buildReportResponse(report: any) {
  const comments = await db.select().from(commentsTable).where(eq(commentsTable.reportId, report.id)).orderBy(commentsTable.createdAt);
  const commentResults = await Promise.all(comments.map(async (c) => {
    const authors = await db.select().from(usersTable).where(eq(usersTable.id, c.authorId)).limit(1);
    return {
      id: c.id,
      reportId: c.reportId,
      authorId: c.authorId,
      authorName: authors[0]?.displayName ?? "Unknown",
      text: c.text,
      createdAt: c.createdAt.toISOString(),
    };
  }));
  return {
    id: report.id,
    eventId: report.eventId,
    photoUrl: report.photoUrl ?? null,
    reportText: report.reportText,
    likesCount: report.likesCount,
    comments: commentResults,
    createdAt: report.createdAt.toISOString(),
  };
}

router.get("/:id/report", async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const reports = await db.select().from(reportsTable).where(eq(reportsTable.eventId, eventId)).limit(1);
    if (!reports.length) { res.status(404).json({ error: "Report not found" }); return; }
    res.json(await buildReportResponse(reports[0]));
  } catch (err) {
    req.log.error({ err }, "getEventReport error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/report", requireAuth, async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const clerkUserId = (req as any).clerkUserId;
    const auth = getAuth(req);
    const email = auth?.sessionClaims?.email as string || "";
    const name = auth?.sessionClaims?.name as string || (auth?.sessionClaims?.firstName as string) || "";
    const user = await getOrCreateUser(clerkUserId, email, name);
    const events = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
    if (!events.length) { res.status(404).json({ error: "Event not found" }); return; }
    if (events[0].hostId !== user.id) { res.status(403).json({ error: "Only the host can post a report" }); return; }
    const { reportText, photoUrl } = req.body;
    if (!reportText) { res.status(400).json({ error: "reportText is required" }); return; }
    const existing = await db.select().from(reportsTable).where(eq(reportsTable.eventId, eventId)).limit(1);
    if (existing.length) {
      const [updated] = await db.update(reportsTable).set({ reportText, photoUrl: photoUrl || null }).where(eq(reportsTable.id, existing[0].id)).returning();
      res.status(201).json(await buildReportResponse(updated));
      return;
    }
    const [report] = await db.insert(reportsTable).values({ eventId, reportText, photoUrl: photoUrl || null }).returning();
    await db.update(eventsTable).set({ status: "ended" }).where(eq(eventsTable.id, eventId));
    res.status(201).json(await buildReportResponse(report));
  } catch (err) {
    req.log.error({ err }, "createReport error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/comments", requireAuth, async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const clerkUserId = (req as any).clerkUserId;
    const auth = getAuth(req);
    const email = auth?.sessionClaims?.email as string || "";
    const name = auth?.sessionClaims?.name as string || (auth?.sessionClaims?.firstName as string) || "";
    const user = await getOrCreateUser(clerkUserId, email, name);
    const reports = await db.select().from(reportsTable).where(eq(reportsTable.eventId, eventId)).limit(1);
    if (!reports.length) { res.status(404).json({ error: "Report not found" }); return; }
    const { text } = req.body;
    if (!text || text.length > 200) { res.status(400).json({ error: "Invalid text" }); return; }
    const app = await db.select().from(applicationsTable).where(and(eq(applicationsTable.eventId, eventId), eq(applicationsTable.userId, user.id), eq(applicationsTable.status, "active"))).limit(1);
    const events = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
    const isHost = events.length && events[0].hostId === user.id;
    if (!app.length && !isHost) { res.status(403).json({ error: "Only participants can comment" }); return; }
    const [comment] = await db.insert(commentsTable).values({ reportId: reports[0].id, authorId: user.id, text }).returning();
    res.status(201).json({
      id: comment.id,
      reportId: comment.reportId,
      authorId: comment.authorId,
      authorName: user.displayName,
      text: comment.text,
      createdAt: comment.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "addComment error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
