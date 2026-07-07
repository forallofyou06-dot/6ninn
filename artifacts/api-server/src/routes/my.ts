import { Router } from "express";
import { db, usersTable, eventsTable, applicationsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/getOrCreateUser";
import { getAuth } from "@clerk/express";

const router = Router();

router.get("/stats", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId;
    const users = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
    if (!users.length) { res.json({ participated: 0, hosted: 0, connections: 0 }); return; }
    const user = users[0];
    const [participatedRow] = await db.select({ count: sql<number>`count(*)` }).from(applicationsTable).where(and(eq(applicationsTable.userId, user.id), eq(applicationsTable.status, "active")));
    const [hostedRow] = await db.select({ count: sql<number>`count(*)` }).from(eventsTable).where(eq(eventsTable.hostId, user.id));
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
    const email = auth?.sessionClaims?.email as string || "";
    const name = auth?.sessionClaims?.name as string || (auth?.sessionClaims?.firstName as string) || "";
    const user = await getOrCreateUser(clerkUserId, email, name);
    const apps = await db.select().from(applicationsTable).where(eq(applicationsTable.userId, user.id)).orderBy(applicationsTable.createdAt);
    const results = await Promise.all(apps.map(async (app) => {
      const events = await db.select().from(eventsTable).where(eq(eventsTable.id, app.eventId)).limit(1);
      const hosts = events.length ? await db.select().from(usersTable).where(eq(usersTable.id, events[0].hostId)).limit(1) : [];
      const [appCount] = await db.select({ count: sql<number>`count(*)` }).from(applicationsTable).where(and(eq(applicationsTable.eventId, app.eventId), eq(applicationsTable.status, "active")));
      const applicantsCount = Number(appCount?.count ?? 0);
      const event = events[0];
      const remainingSeats = event ? Math.max(0, event.capacity - applicantsCount) : 0;
      return {
        id: app.id,
        eventId: app.eventId,
        status: app.status,
        createdAt: app.createdAt.toISOString(),
        event: event ? {
          id: event.id,
          theme: event.theme,
          subTheme: event.subTheme ?? null,
          dateStart: event.dateStart.toISOString(),
          dateEnd: event.dateEnd.toISOString(),
          location: event.location,
          locationUrl: event.locationUrl ?? null,
          fee: event.fee,
          capacity: event.capacity,
          tags: event.tags,
          hostId: event.hostId,
          hostName: hosts[0]?.displayName ?? "Unknown",
          applicantsCount,
          remainingSeats,
          status: event.status,
          isApplied: app.status === "active",
          createdAt: event.createdAt.toISOString(),
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
    const email = auth?.sessionClaims?.email as string || "";
    const name = auth?.sessionClaims?.name as string || (auth?.sessionClaims?.firstName as string) || "";
    const user = await getOrCreateUser(clerkUserId, email, name);
    const events = await db.select().from(eventsTable).where(eq(eventsTable.hostId, user.id)).orderBy(eventsTable.dateStart);
    const results = await Promise.all(events.map(async (event) => {
      const [appCount] = await db.select({ count: sql<number>`count(*)` }).from(applicationsTable).where(and(eq(applicationsTable.eventId, event.id), eq(applicationsTable.status, "active")));
      const applicantsCount = Number(appCount?.count ?? 0);
      const remainingSeats = Math.max(0, event.capacity - applicantsCount);
      return {
        id: event.id,
        theme: event.theme,
        subTheme: event.subTheme ?? null,
        dateStart: event.dateStart.toISOString(),
        dateEnd: event.dateEnd.toISOString(),
        location: event.location,
        locationUrl: event.locationUrl ?? null,
        fee: event.fee,
        capacity: event.capacity,
        tags: event.tags,
        hostId: event.hostId,
        hostName: user.displayName,
        applicantsCount,
        remainingSeats,
        status: event.status,
        isApplied: false,
        createdAt: event.createdAt.toISOString(),
      };
    }));
    res.json(results);
  } catch (err) {
    req.log.error({ err }, "listMyHostedEvents error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
