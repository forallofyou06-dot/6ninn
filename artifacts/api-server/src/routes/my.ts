import { Router } from "express";
import { db, usersTable, eventsTable, participationsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/getOrCreateUser";
import { getAuth } from "@clerk/express";
import { buildEventResponse } from "./eventBuilder";

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
    // Connections: unique people met at 開催済 events
    const connections = await getConnectionCount(user.id);
    res.json({
      participated: Number(participatedRow?.count ?? 0),
      hosted: Number(hostedRow?.count ?? 0),
      connections,
    });
  } catch (err) {
    req.log.error({ err }, "getMyStats error");
    res.status(500).json({ error: "Internal server error" });
  }
});

async function getConnectionCount(userId: number): Promise<number> {
  // Find all 開催済 events this user participated in
  const myParts = await db.select().from(participationsTable)
    .where(and(eq(participationsTable.userId, userId), eq(participationsTable.status, "申込")));
  const myEventIds = myParts.map((p) => p.eventId);
  if (!myEventIds.length) return 0;
  const completedEvents = await db.select().from(eventsTable)
    .where(eq(eventsTable.status, "開催済"));
  const myCompletedEventIds = completedEvents.filter((e) => myEventIds.includes(e.id)).map((e) => e.id);
  if (!myCompletedEventIds.length) return 0;
  const uniqueUserIds = new Set<number>();
  for (const eventId of myCompletedEventIds) {
    const parts = await db.select().from(participationsTable)
      .where(and(eq(participationsTable.eventId, eventId), eq(participationsTable.status, "申込")));
    for (const p of parts) {
      if (p.userId !== userId) uniqueUserIds.add(p.userId);
    }
  }
  return uniqueUserIds.size;
}

router.get("/connections", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId;
    const auth = getAuth(req);
    const email = (auth?.sessionClaims?.email as string) || "";
    const user = await getOrCreateUser(clerkUserId, email);
    const myParts = await db.select().from(participationsTable)
      .where(and(eq(participationsTable.userId, user.id), eq(participationsTable.status, "申込")));
    const myEventIds = myParts.map((p) => p.eventId);
    if (!myEventIds.length) { res.json([]); return; }
    const completedEvents = await db.select().from(eventsTable)
      .where(eq(eventsTable.status, "開催済"));
    const myCompletedEvents = completedEvents.filter((e) => myEventIds.includes(e.id));
    const seen = new Map<number, { id: number; name: string | null; department: string | null; metAtEventId: number; metAtEventTheme: string }>();
    for (const event of myCompletedEvents) {
      const parts = await db.select().from(participationsTable)
        .where(and(eq(participationsTable.eventId, event.id), eq(participationsTable.status, "申込")));
      for (const p of parts) {
        if (p.userId !== user.id && !seen.has(p.userId)) {
          const users = await db.select().from(usersTable).where(eq(usersTable.id, p.userId)).limit(1);
          seen.set(p.userId, {
            id: p.userId,
            name: users[0]?.name ?? null,
            department: users[0]?.department ?? null,
            metAtEventId: event.id,
            metAtEventTheme: event.theme,
          });
        }
      }
    }
    res.json(Array.from(seen.values()));
  } catch (err) {
    req.log.error({ err }, "getConnections error");
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
      let eventData = null;
      if (events.length) {
        eventData = await buildEventResponse(events[0], user.id);
      }
      return {
        id: p.id, eventId: p.eventId, status: p.status,
        comment: p.comment ?? null,
        appliedAt: p.appliedAt.toISOString(),
        event: eventData,
      };
    }));
    res.json(results.reverse());
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
    const results = await Promise.all(events.map((e) => buildEventResponse(e, user.id)));
    res.json(results.reverse());
  } catch (err) {
    req.log.error({ err }, "listMyHostedEvents error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
