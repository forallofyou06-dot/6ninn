import { Router } from "express";
import { db, usersTable, eventsTable, participationsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/getOrCreateUser";
import { getAuth } from "@clerk/express";

const router = Router();

async function buildEventResponse(event: any, currentUserId: number | null) {
  const host = await db.select().from(usersTable).where(eq(usersTable.id, event.hostId)).limit(1);
  const [partCount] = await db.select({ count: sql<number>`count(*)` })
    .from(participationsTable)
    .where(and(eq(participationsTable.eventId, event.id), eq(participationsTable.status, "申込")));
  const participantsCount = Number(partCount?.count ?? 0);
  const remainingSeats = Math.max(0, event.capacity - participantsCount);
  let isApplied = false;
  if (currentUserId) {
    const part = await db.select().from(participationsTable)
      .where(and(eq(participationsTable.eventId, event.id), eq(participationsTable.userId, currentUserId), eq(participationsTable.status, "申込")))
      .limit(1);
    isApplied = part.length > 0;
  }
  return {
    id: event.id,
    theme: event.theme,
    subTheme: event.subTheme ?? null,
    datetime: event.datetime instanceof Date ? event.datetime.toISOString() : event.datetime,
    durationMinutes: event.durationMinutes,
    location: event.location,
    locationUrl: event.locationUrl ?? null,
    fee: event.fee,
    capacity: event.capacity,
    minParticipants: event.minParticipants,
    deadline: event.deadline,
    notes: event.notes ?? null,
    hostId: event.hostId,
    hostName: host[0]?.name ?? host[0]?.email ?? "Unknown",
    participantsCount,
    remainingSeats,
    status: event.status,
    isApplied,
    createdAt: event.createdAt instanceof Date ? event.createdAt.toISOString() : event.createdAt,
  };
}

router.get("/", async (req, res) => {
  try {
    const { status } = req.query;
    const clerkUserId = (req as any).clerkUserId;
    let currentUserId: number | null = null;
    if (clerkUserId) {
      const users = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
      if (users.length) currentUserId = users[0].id;
    }
    let events = await db.select().from(eventsTable).orderBy(eventsTable.datetime);
    const results = await Promise.all(events.map((e) => buildEventResponse(e, currentUserId)));
    const filtered = status ? results.filter((e) => e.status === status) : results;
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
    const email = (auth?.sessionClaims?.email as string) || "";
    const user = await getOrCreateUser(clerkUserId, email);
    const { theme, subTheme, datetime, durationMinutes, location, locationUrl, fee, capacity, minParticipants, deadline, notes } = req.body;
    if (!theme || !datetime || !location || fee === undefined || !capacity || !deadline) {
      res.status(400).json({ error: "Missing required fields" }); return;
    }
    if (fee > 5000) { res.status(400).json({ error: "会費は5,000円以内" }); return; }
    if (capacity > 6 || capacity < 2) { res.status(400).json({ error: "定員は2〜6人" }); return; }
    const [event] = await db.insert(eventsTable).values({
      theme, subTheme: subTheme || null,
      datetime: new Date(datetime), durationMinutes: durationMinutes || 120,
      location, locationUrl: locationUrl || null,
      fee, capacity, minParticipants: minParticipants || 2,
      deadline, notes: notes || null,
      hostId: user.id, status: "募集中",
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
    res.json(await buildEventResponse(events[0], currentUserId));
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
    const email = (auth?.sessionClaims?.email as string) || "";
    const user = await getOrCreateUser(clerkUserId, email);
    const events = await db.select().from(eventsTable).where(eq(eventsTable.id, id)).limit(1);
    if (!events.length) { res.status(404).json({ error: "Not found" }); return; }
    if (events[0].hostId !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }
    const { theme, subTheme, datetime, durationMinutes, location, locationUrl, fee, capacity, minParticipants, deadline, notes } = req.body;
    const updates: Record<string, unknown> = {};
    if (theme !== undefined) updates.theme = theme;
    if (subTheme !== undefined) updates.subTheme = subTheme;
    if (datetime !== undefined) updates.datetime = new Date(datetime);
    if (durationMinutes !== undefined) updates.durationMinutes = durationMinutes;
    if (location !== undefined) updates.location = location;
    if (locationUrl !== undefined) updates.locationUrl = locationUrl;
    if (fee !== undefined) updates.fee = fee;
    if (capacity !== undefined) updates.capacity = capacity;
    if (minParticipants !== undefined) updates.minParticipants = minParticipants;
    if (deadline !== undefined) updates.deadline = deadline;
    if (notes !== undefined) updates.notes = notes;
    const [updated] = await db.update(eventsTable).set(updates).where(eq(eventsTable.id, id)).returning();
    res.json(await buildEventResponse(updated, user.id));
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
    const email = (auth?.sessionClaims?.email as string) || "";
    const user = await getOrCreateUser(clerkUserId, email);
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
