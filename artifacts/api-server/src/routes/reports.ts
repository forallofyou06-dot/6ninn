import { Router } from "express";
import { db, usersTable, eventsTable, reportsTable, participationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/getOrCreateUser";
import { getAuth } from "@clerk/express";

const router = Router();

router.get("/events/:id/reports", async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    if (isNaN(eventId)) { res.status(400).json({ error: "Invalid id" }); return; }
    const reports = await db.select().from(reportsTable).where(eq(reportsTable.eventId, eventId));
    const results = await Promise.all(reports.map(async (r) => {
      const authors = await db.select().from(usersTable).where(eq(usersTable.id, r.authorId)).limit(1);
      return {
        id: r.id, eventId: r.eventId, type: r.type, content: r.content,
        photoUrl: r.photoUrl ?? null,
        authorName: authors[0]?.name ?? authors[0]?.email ?? "Unknown",
        createdAt: r.createdAt.toISOString(),
      };
    }));
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
    const { type, content, photoUrl } = req.body;
    if (!type || !content) { res.status(400).json({ error: "type と content は必須です" }); return; }
    const [report] = await db.insert(reportsTable).values({
      eventId, authorId: user.id, type, content, photoUrl: photoUrl || null,
    }).returning();
    res.status(201).json({ ...report, createdAt: report.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "createReport error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
