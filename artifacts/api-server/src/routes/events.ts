import { Router } from "express";
import { db, usersTable, eventsTable, applicationsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/getOrCreateUser";
import { getAuth } from "@clerk/express";

const router = Router();

async function buildEventResponse(event: any, currentUserId: number | null) {
  const host = await db.select().from(usersTable).where(eq(usersTable.id, event.hostId)).limit(1);
  const [appCount] = await db.select({ count: sql<number>`count(*)` }).from(applicationsTable).where(and(eq(applicationsTable.eventId, event.id), eq(applicationsTable.status, "active")));
  const applicantsCount = Number(appCount?.count ?? 0);
  const remainingSeats = Math.max(0, event.capacity - applicantsCount);
  let isApplied = false;
  if (currentUserId) {
    const app = await db.select().from(applicationsTable).where(and(eq(applicationsTable.eventId, event.id), eq(applicationsTable.userId, currentUserId), eq(applicationsTable.status, "active"))).limit(1);
    isApplied = app.length > 0;
  }
  const now = new Date();
  let status = event.status;
  if (status === "open" && remainingSeats === 0) status = "closed";
  if (status === "open" && new Date(event.dateEnd) < now) status = "ended";
  return {
    id: event.id,
    theme: event.theme,
    subTheme: event.subTheme ?? null,
    dateStart: event.dateStart instanceof Date ? event.dateStart.toISOString() : event.dateStart,
    dateEnd: event.dateEnd instanceof Date ? event.dateEnd.toISOString() : event.dateEnd,
    location: event.location,
    locationUrl: event.locationUrl ?? null,
    fee: event.fee,
    capacity: event.capacity,
    tags: event.tags,
    hostId: event.hostId,
    hostName: host[0]?.displayName ?? "Unknown",
    applicantsCount,
    remainingSeats,
    status,
    isApplied,
    createdAt: event.createdAt instanceof Date ? event.createdAt.toISOString() : event.createdAt,
  };
}

router.get("/", async (req, res) => {
  try {
    const { status, tag } = req.query;
    let currentUserId: number | null = null;
    const clerkUserId = (req as any).clerkUserId;
    if (clerkUserId) {
      const users = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
      if (users.length) currentUserId = users[0].id;
    }
    let events = await db.select().from(eventsTable).orderBy(eventsTable.dateStart);
    if (tag) {
      events = events.filter((e) => e.tags.includes(tag as string));
    }
    const results = await Promise.all(events.map((e) => buildEventResponse(e, currentUserId)));
    let filtered = results;
    if (status === "open") filtered = results.filter((e) => e.status === "open");
    else if (status === "closed") filtered = results.filter((e) => e.status === "closed");
    res.json(filtered);
  } catch (err) {
    req.log.error({ err }, "listEvents error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId;
    const auth = getAuth(req);
    const email = auth?.sessionClaims?.email as string || "";
    const name = auth?.sessionClaims?.name as string || (auth?.sessionClaims?.firstName as string) || "";
    const user = await getOrCreateUser(clerkUserId, email, name);
    const { theme, subTheme, dateStart, dateEnd, location, locationUrl, fee, capacity, tags } = req.body;
    if (!theme || !dateStart || !dateEnd || !location || fee === undefined || !capacity) {
      res.status(400).json({ error: "Missing required fields" }); return;
    }
    if (fee > 5000) { res.status(400).json({ error: "Fee must be 5000 or less" }); return; }
    if (capacity > 6) { res.status(400).json({ error: "Capacity must be 6 or less" }); return; }
    const [event] = await db.insert(eventsTable).values({
      theme, subTheme: subTheme || null, dateStart: new Date(dateStart), dateEnd: new Date(dateEnd),
      location, locationUrl: locationUrl || null, fee, capacity, tags: tags || [], hostId: user.id, status: "open",
    }).returning();
    const response = await buildEventResponse(event, user.id);
    res.status(201).json(response);
  } catch (err) {
    req.log.error({ err }, "createEvent error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const clerkUserId = (req as any).clerkUserId;
    let currentUserId: number | null = null;
    if (clerkUserId) {
      const users = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
      if (users.length) currentUserId = users[0].id;
    }
    const events = await db.select().from(eventsTable).where(eq(eventsTable.id, id)).limit(1);
    if (!events.length) { res.status(404).json({ error: "Not found" }); return; }
    const response = await buildEventResponse(events[0], currentUserId);
    res.json(response);
  } catch (err) {
    req.log.error({ err }, "getEvent error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const clerkUserId = (req as any).clerkUserId;
    const auth = getAuth(req);
    const email = auth?.sessionClaims?.email as string || "";
    const name = auth?.sessionClaims?.name as string || (auth?.sessionClaims?.firstName as string) || "";
    const user = await getOrCreateUser(clerkUserId, email, name);
    const events = await db.select().from(eventsTable).where(eq(eventsTable.id, id)).limit(1);
    if (!events.length) { res.status(404).json({ error: "Not found" }); return; }
    if (events[0].hostId !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }
    const { theme, subTheme, dateStart, dateEnd, location, locationUrl, fee, capacity, tags } = req.body;
    const updates: any = {};
    if (theme !== undefined) updates.theme = theme;
    if (subTheme !== undefined) updates.subTheme = subTheme;
    if (dateStart !== undefined) updates.dateStart = new Date(dateStart);
    if (dateEnd !== undefined) updates.dateEnd = new Date(dateEnd);
    if (location !== undefined) updates.location = location;
    if (locationUrl !== undefined) updates.locationUrl = locationUrl;
    if (fee !== undefined) updates.fee = fee;
    if (capacity !== undefined) updates.capacity = capacity;
    if (tags !== undefined) updates.tags = tags;
    const [updated] = await db.update(eventsTable).set(updates).where(eq(eventsTable.id, id)).returning();
    const response = await buildEventResponse(updated, user.id);
    res.json(response);
  } catch (err) {
    req.log.error({ err }, "updateEvent error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const clerkUserId = (req as any).clerkUserId;
    const auth = getAuth(req);
    const email = auth?.sessionClaims?.email as string || "";
    const name = auth?.sessionClaims?.name as string || (auth?.sessionClaims?.firstName as string) || "";
    const user = await getOrCreateUser(clerkUserId, email, name);
    const events = await db.select().from(eventsTable).where(eq(eventsTable.id, id)).limit(1);
    if (!events.length) { res.status(404).json({ error: "Not found" }); return; }
    if (events[0].hostId !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.delete(eventsTable).where(eq(eventsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "deleteEvent error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
