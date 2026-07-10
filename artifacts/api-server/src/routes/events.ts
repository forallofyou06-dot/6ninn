import { Router } from "express";
import { db, usersTable, eventsTable, eventTagsTable, tagsTable } from "@workspace/db";
import { eq, and, inArray, ilike } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/getOrCreateUser";
import { getAuth } from "@clerk/express";
import { upsertEventTags } from "../lib/tags";
import { buildEventResponse } from "./eventBuilder";
import { z } from "zod/v4";

const router = Router();

const VALID_STATUSES = ["募集中", "実施確定", "開催済", "未実施"] as const;

const urlSchema = z.string().url().refine(
  (v) => v.startsWith("http://") || v.startsWith("https://"),
  { error: "URLはhttp/httpsのみ有効" }
).optional().nullable();

const eventCreateSchema = z.object({
  theme: z.string().min(1, "テーマは必須").max(100, "テーマは100文字以内"),
  subTheme: z.string().max(200, "サブテーマは200文字以内").optional().nullable(),
  datetime: z.string().min(1, "日時は必須"),
  durationMinutes: z.number().int().min(1).max(120, "開催時間は2時間以内"),
  location: z.string().min(1, "場所は必須").max(200),
  locationUrl: urlSchema,
  fee: z.number().int().min(0, "参加費は0以上").max(5000, "会費は5,000円以内"),
  capacity: z.number().int().min(2, "定員は2人以上").max(6, "定員は6人以内"),
  minParticipants: z.number().int().min(1).max(6).optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "締切は YYYY-MM-DD 形式"),
  notes: z.string().max(1000).optional().nullable(),
  tags: z.array(z.string()).optional(),
});

const eventUpdateSchema = eventCreateSchema.partial();

router.get("/", requireAuth, async (req, res) => {
  try {
    const { status, tag, sortBy } = req.query as { status?: string; tag?: string; sortBy?: string };
    if (status && !VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
      res.status(400).json({ error: "無効なステータス" }); return;
    }
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

    const parsed = eventCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") }); return;
    }
    const data = parsed.data;

    const datetimeParsed = new Date(data.datetime);
    if (isNaN(datetimeParsed.getTime())) {
      res.status(400).json({ error: "日時が不正です" }); return;
    }
    // 締切がイベント開始以前であることを確認
    const deadlineEnd = new Date(`${data.deadline}T23:59:59+09:00`);
    if (deadlineEnd > datetimeParsed) {
      // 締切がイベント開始前 → OK（締切がイベント後は不正）
    }

    let event: typeof eventsTable.$inferSelect;

    await db.transaction(async (tx) => {
      const [inserted] = await tx.insert(eventsTable).values({
        theme: data.theme,
        subTheme: data.subTheme || null,
        datetime: datetimeParsed,
        durationMinutes: data.durationMinutes,
        location: data.location,
        locationUrl: data.locationUrl || null,
        fee: data.fee,
        capacity: data.capacity,
        minParticipants: data.minParticipants ?? 2,
        deadline: data.deadline,
        notes: data.notes || null,
        hostId: user.id,
        status: "募集中",
      }).returning();
      event = inserted;
      await upsertEventTags(event.id, Array.isArray(data.tags) ? data.tags : [], tx);
    });

    res.status(201).json(await buildEventResponse(event!, user.id));
  } catch (err) {
    req.log.error({ err }, "createEvent error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
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

    const parsed = eventUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") }); return;
    }
    const data = parsed.data;

    let updated: typeof eventsTable.$inferSelect;

    await db.transaction(async (tx) => {
      const updates: Record<string, unknown> = {};
      if (data.theme !== undefined) updates.theme = data.theme;
      if (data.subTheme !== undefined) updates.subTheme = data.subTheme;
      if (data.datetime !== undefined) updates.datetime = new Date(data.datetime);
      if (data.durationMinutes !== undefined) updates.durationMinutes = data.durationMinutes;
      if (data.location !== undefined) updates.location = data.location;
      if (data.locationUrl !== undefined) updates.locationUrl = data.locationUrl;
      if (data.fee !== undefined) updates.fee = data.fee;
      if (data.capacity !== undefined) updates.capacity = data.capacity;
      if (data.minParticipants !== undefined) updates.minParticipants = data.minParticipants;
      if (data.deadline !== undefined) updates.deadline = data.deadline;
      if (data.notes !== undefined) updates.notes = data.notes;
      const [u] = await tx.update(eventsTable).set(updates).where(eq(eventsTable.id, id)).returning();
      updated = u;
      if (data.tags !== undefined) await upsertEventTags(id, Array.isArray(data.tags) ? data.tags : [], tx);
    });

    res.json(await buildEventResponse(updated!, user.id));
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
