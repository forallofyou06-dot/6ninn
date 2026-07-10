import { Router } from "express";
import { db, usersTable, eventsTable, eventTagsTable, tagsTable } from "@workspace/db";
import { eq, and, inArray, ilike } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/getOrCreateUser";
import { getAuth } from "@clerk/express";
import { upsertEventTags } from "../lib/tags";
import { buildEventResponse } from "./eventBuilder";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { status, tag, sortBy } = req.query as { status?: string; tag?: string; sortBy?: string };
    const clerkUserId = (req as any).clerkUserId;
    let currentUserId: number | null = null;
    if (clerkUserId) {
      const users = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
      if (users.length) currentUserId = users[0].id;
    }
    let events = await db.select().from(eventsTable);

    if (tag) {
      const tagRows = await db.select().from(tagsTable).where(ilike(tagsTable.name, tag));
      if (tagRows.length) {
        const tagIds = tagRows.map((t) => t.id);
        const eventTagRows = await db.select().from(eventTagsTable).where(inArray(eventTagsTable.tagId, tagIds));
        const eventIds = [...new Set(eventTagRows.map((et) => et.eventId))];
        events = events.filter((e) => eventIds.includes(e.id));
      } else {
        events = [];
      }
    }

    const results = await Promise.all(events.map((e) => buildEventResponse(e, currentUserId)));
    const filtered = status ? results.filter((e) => e.status === status) : results;

    if (sortBy === "near") {
      filtered.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
    } else if (sortBy === "seats") {
      filtered.sort((a, b) => a.remainingSeats - b.remainingSeats);
    } else {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
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
    const { theme, subTheme, datetime, durationMinutes, location, locationUrl, fee, capacity, minParticipants, deadline, notes, tags } = req.body;
    if (!theme || !datetime || !location || fee === undefined || !capacity || !deadline || !durationMinutes) {
      res.status(400).json({ error: "Missing required fields" }); return;
    }
    if (fee > 5000) { res.status(400).json({ error: "会費は5,000円以内" }); return; }
    if (capacity > 6 || capacity < 3) { res.status(400).json({ error: "定員は3〜6人" }); return; }
    if (durationMinutes > 120) { res.status(400).json({ error: "開催時間は2時間以内" }); return; }
    const [event] = await db.insert(eventsTable).values({
      theme, subTheme: subTheme || null,
      datetime: new Date(datetime), durationMinutes,
      location, locationUrl: locationUrl || null,
      fee, capacity, minParticipants: minParticipants || 2,
      deadline, notes: notes || null,
      hostId: user.id, status: "募集中",
    }).returning();
    await upsertEventTags(event.id, Array.isArray(tags) ? tags : []);
    res.status(201).json(await buildEventResponse(event, user.id));
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
    const { theme, subTheme, datetime, durationMinutes, location, locationUrl, fee, capacity, minParticipants, deadline, notes, tags } = req.body;
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
    if (tags !== undefined) await upsertEventTags(id, Array.isArray(tags) ? tags : []);
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
