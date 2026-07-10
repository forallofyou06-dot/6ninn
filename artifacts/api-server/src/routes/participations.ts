import { Router } from "express";
import { db, usersTable, eventsTable, participationsTable } from "@workspace/db";
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
    const email = (auth?.sessionClaims?.email as string) || "";
    const user = await getOrCreateUser(clerkUserId, email);
    const events = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
    if (!events.length) { res.status(404).json({ error: "会が見つかりません" }); return; }
    const event = events[0];
    if (event.status !== "募集中") { res.status(400).json({ error: "この会は現在申し込めません" }); return; }
    const [partCount] = await db.select({ count: sql<number>`count(*)` })
      .from(participationsTable)
      .where(and(eq(participationsTable.eventId, eventId), eq(participationsTable.status, "申込")));
    if (Number(partCount?.count ?? 0) >= event.capacity) {
      res.status(400).json({ error: "定員に達しています" }); return;
    }
    const existing = await db.select().from(participationsTable)
      .where(and(eq(participationsTable.eventId, eventId), eq(participationsTable.userId, user.id))).limit(1);
    if (existing.length > 0 && existing[0].status === "申込") {
      res.status(400).json({ error: "すでに申し込み済みです" }); return;
    }
    const { comment } = req.body;
    if (existing.length > 0) {
      const [updated] = await db.update(participationsTable)
        .set({ status: "申込", comment: comment || null, appliedAt: new Date(), cancelledAt: null })
        .where(eq(participationsTable.id, existing[0].id)).returning();
      res.status(201).json(updated);
    } else {
      const [part] = await db.insert(participationsTable)
        .values({ eventId, userId: user.id, comment: comment || null, status: "申込" }).returning();
      res.status(201).json(part);
    }
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
    const email = (auth?.sessionClaims?.email as string) || "";
    const user = await getOrCreateUser(clerkUserId, email);
    const events = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
    if (!events.length) { res.status(404).json({ error: "会が見つかりません" }); return; }
    const event = events[0];
    if (event.status !== "募集中") {
      res.status(400).json({ error: "締切後はアプリからキャンセルできません。ホストに直接連絡してください。" }); return;
    }
    const parts = await db.select().from(participationsTable)
      .where(and(eq(participationsTable.eventId, eventId), eq(participationsTable.userId, user.id), eq(participationsTable.status, "申込"))).limit(1);
    if (!parts.length) { res.status(400).json({ error: "申し込みが見つかりません" }); return; }
    await db.update(participationsTable)
      .set({ status: "キャンセル", cancelledAt: new Date() })
      .where(eq(participationsTable.id, parts[0].id));
    res.json({ message: "キャンセルしました" });
  } catch (err) {
    req.log.error({ err }, "cancelParticipation error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
