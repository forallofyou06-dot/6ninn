import { Router } from "express";
import { db, usersTable, eventsTable, participationsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/getOrCreateUser";
import { getAuth } from "@clerk/express";

const router = Router();

router.get("/stats", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId;
    const auth = getAuth(req);
    const email = (auth?.sessionClaims?.email as string) || "";
    const user = await getOrCreateUser(clerkUserId, email);
    const [participatedRow] = await db.select({ count: sql<number>`count(*)` })
      .from(participationsTable)
      .where(and(eq(participationsTable.userId, user.id), eq(participationsTable.status, "申込")));
    const [hostedRow] = await db.select({ count: sql<number>`count(*)` })
      .from(eventsTable).where(eq(eventsTable.hostId, user.id));
    res.json({
      participated: Number(participatedRow?.count ?? 0),
      hosted: Number(hostedRow?.count ?? 0),
      connections: 0,
    });
  } catch (err) {
    req.log.error({ err }, "getMyStats error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/applications", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId;
    const auth = getAuth(req);
    const email = (auth?.sessionClaims?.email as string) || "";
    const user = await getOrCreateUser(clerkUserId, email);
    const parts = await db.select().from(participationsTable)
      .where(eq(participationsTable.userId, user.id))
      .orderBy(participationsTable.appliedAt);
    const results = await Promise.all(parts.map(async (p) => {
      const events = await db.select().from(eventsTable).where(eq(eventsTable.id, p.eventId)).limit(1);
      return {
        id: p.id, eventId: p.eventId, status: p.status,
        comment: p.comment, appliedAt: p.appliedAt.toISOString(),
        event: events[0] ? {
          id: events[0].id, theme: events[0].theme,
          datetime: events[0].datetime.toISOString(),
          location: events[0].location, status: events[0].status,
        } : null,
      };
    }));
    res.json(results);
  } catch (err) {
    req.log.error({ err }, "listMyApplications error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/hosted-events", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId;
    const auth = getAuth(req);
    const email = (auth?.sessionClaims?.email as string) || "";
    const user = await getOrCreateUser(clerkUserId, email);
    const events = await db.select().from(eventsTable)
      .where(eq(eventsTable.hostId, user.id)).orderBy(eventsTable.datetime);
    const results = await Promise.all(events.map(async (e) => {
      const [partCount] = await db.select({ count: sql<number>`count(*)` })
        .from(participationsTable)
        .where(and(eq(participationsTable.eventId, e.id), eq(participationsTable.status, "申込")));
      return {
        id: e.id, theme: e.theme,
        datetime: e.datetime.toISOString(),
        location: e.location, capacity: e.capacity,
        participantsCount: Number(partCount?.count ?? 0), status: e.status,
      };
    }));
    res.json(results);
  } catch (err) {
    req.log.error({ err }, "listMyHostedEvents error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
