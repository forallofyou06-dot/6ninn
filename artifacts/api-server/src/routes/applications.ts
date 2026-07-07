import { Router } from "express";
import { db, usersTable, eventsTable, applicationsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/getOrCreateUser";
import { getAuth } from "@clerk/express";

const router = Router();

router.post("/:id/apply", requireAuth, async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const clerkUserId = (req as any).clerkUserId;
    const auth = getAuth(req);
    const email = auth?.sessionClaims?.email as string || "";
    const name = auth?.sessionClaims?.name as string || (auth?.sessionClaims?.firstName as string) || "";
    const user = await getOrCreateUser(clerkUserId, email, name);
    const events = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
    if (!events.length) { res.status(404).json({ error: "Event not found" }); return; }
    const event = events[0];
    const [appCount] = await db.select({ count: sql<number>`count(*)` }).from(applicationsTable).where(and(eq(applicationsTable.eventId, eventId), eq(applicationsTable.status, "active")));
    if (Number(appCount?.count ?? 0) >= event.capacity) {
      res.status(400).json({ error: "Event is full" }); return;
    }
    const existing = await db.select().from(applicationsTable).where(and(eq(applicationsTable.eventId, eventId), eq(applicationsTable.userId, user.id))).limit(1);
    if (existing.length > 0 && existing[0].status === "active") {
      res.status(400).json({ error: "Already applied" }); return;
    }
    if (existing.length > 0 && existing[0].status === "cancelled") {
      const [updated] = await db.update(applicationsTable).set({ status: "active" }).where(eq(applicationsTable.id, existing[0].id)).returning();
      res.status(201).json({ id: updated.id, eventId: updated.eventId, userId: updated.userId, status: updated.status, createdAt: updated.createdAt.toISOString() });
      return;
    }
    const [app] = await db.insert(applicationsTable).values({ eventId, userId: user.id, status: "active" }).returning();
    res.status(201).json({ id: app.id, eventId: app.eventId, userId: app.userId, status: app.status, createdAt: app.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "applyToEvent error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/cancel", requireAuth, async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const clerkUserId = (req as any).clerkUserId;
    const auth = getAuth(req);
    const email = auth?.sessionClaims?.email as string || "";
    const name = auth?.sessionClaims?.name as string || (auth?.sessionClaims?.firstName as string) || "";
    const user = await getOrCreateUser(clerkUserId, email, name);
    const apps = await db.select().from(applicationsTable).where(and(eq(applicationsTable.eventId, eventId), eq(applicationsTable.userId, user.id), eq(applicationsTable.status, "active"))).limit(1);
    if (!apps.length) { res.status(400).json({ error: "No active application to cancel" }); return; }
    await db.update(applicationsTable).set({ status: "cancelled" }).where(eq(applicationsTable.id, apps[0].id));
    res.json({ message: "Cancelled" });
  } catch (err) {
    req.log.error({ err }, "cancelApplication error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
