import { Router } from "express";
import { db, usersTable, eventsTable, participationsTable, notificationsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/getOrCreateUser";
import { getAuth } from "@clerk/express";
import { checkApplyable, deadlineEndJST } from "../lib/eventStatus";

const router = Router();

router.post("/:id/apply", requireAuth, async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    if (isNaN(eventId)) { res.status(400).json({ error: "Invalid id" }); return; }
    const clerkUserId = (req as any).clerkUserId;
    const auth = getAuth(req);
    const email = (auth?.sessionClaims?.email as string) || "";
    const user = await getOrCreateUser(clerkUserId, email);
    const { comment } = req.body;

    let resultPart: typeof participationsTable.$inferSelect;
    let notifyUserId: number;
    let notifyContent: string;

    await db.transaction(async (tx) => {
      // SELECT FOR UPDATE でイベント行をロック（同時申込の競合防止）
      const events = await tx
        .select()
        .from(eventsTable)
        .where(eq(eventsTable.id, eventId))
        .for("update");
      if (!events.length) throw Object.assign(new Error("会が見つかりません"), { status: 404 });
      const event = events[0];

      // ホストチェック
      if (event.hostId === user.id) throw Object.assign(new Error("ホストは自分の会に申し込めません"), { status: 400 });

      // 申込可否を時刻から直接再判定（保存statusに依存しない）
      const applyError = checkApplyable(event);
      if (applyError) throw Object.assign(new Error(applyError.message), { status: 400 });

      // 定員チェック（ホスト1席分を引く）
      const [partCount] = await tx
        .select({ count: sql<number>`count(*)` })
        .from(participationsTable)
        .where(and(eq(participationsTable.eventId, eventId), eq(participationsTable.status, "申込")));
      if (Number(partCount?.count ?? 0) >= event.capacity - 1) {
        throw Object.assign(new Error("定員に達しています"), { status: 400 });
      }

      // 重複チェック
      const existing = await tx
        .select()
        .from(participationsTable)
        .where(and(eq(participationsTable.eventId, eventId), eq(participationsTable.userId, user.id)))
        .limit(1);
      if (existing.length > 0 && existing[0].status === "申込") {
        throw Object.assign(new Error("すでに申し込み済みです"), { status: 400 });
      }

      if (existing.length > 0) {
        const [updated] = await tx
          .update(participationsTable)
          .set({ status: "申込", comment: comment || null, appliedAt: new Date(), cancelledAt: null })
          .where(eq(participationsTable.id, existing[0].id))
          .returning();
        resultPart = updated;
      } else {
        const [inserted] = await tx
          .insert(participationsTable)
          .values({ eventId, userId: user.id, comment: comment || null, status: "申込" })
          .returning();
        resultPart = inserted;
      }

      notifyUserId = event.hostId;
      notifyContent = `${user.name || user.email || "参加者"}さんが「${event.theme}」に申し込みました`;
    });

    // 通知はトランザクション外で送る（失敗しても申込は成功扱い）
    try {
      await db.insert(notificationsTable).values({
        userId: notifyUserId!,
        type: "apply",
        content: notifyContent!,
      });
    } catch (notifErr) {
      req.log.warn({ err: notifErr }, "apply notification failed");
    }

    res.status(201).json(resultPart!);
  } catch (err: any) {
    if (err?.status) { res.status(err.status).json({ error: err.message }); return; }
    req.log.error({ err }, "applyToEvent error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/cancel", requireAuth, async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    if (isNaN(eventId)) { res.status(400).json({ error: "Invalid id" }); return; }
    const clerkUserId = (req as any).clerkUserId;
    const auth = getAuth(req);
    const email = (auth?.sessionClaims?.email as string) || "";
    const user = await getOrCreateUser(clerkUserId, email);

    let notifyUserId: number;
    let notifyContent: string;

    await db.transaction(async (tx) => {
      const events = await tx
        .select()
        .from(eventsTable)
        .where(eq(eventsTable.id, eventId))
        .for("update");
      if (!events.length) throw Object.assign(new Error("会が見つかりません"), { status: 404 });
      const event = events[0];

      // キャンセル可能期間の判定
      if (event.status === "開催済") {
        throw Object.assign(new Error("開催済みの会はキャンセルできません"), { status: 400 });
      }
      if (event.status === "未実施") {
        throw Object.assign(new Error("中止された会はキャンセルできません"), { status: 400 });
      }
      const deadlineEnd = deadlineEndJST(event.deadline);
      if (new Date() > deadlineEnd) {
        throw Object.assign(
          new Error("締切後はアプリからキャンセルできません。ホストに直接連絡してください。"),
          { status: 400 }
        );
      }

      const parts = await tx
        .select()
        .from(participationsTable)
        .where(and(eq(participationsTable.eventId, eventId), eq(participationsTable.userId, user.id), eq(participationsTable.status, "申込")))
        .limit(1);
      if (!parts.length) throw Object.assign(new Error("申し込みが見つかりません"), { status: 400 });

      await tx
        .update(participationsTable)
        .set({ status: "キャンセル", cancelledAt: new Date() })
        .where(eq(participationsTable.id, parts[0].id));

      notifyUserId = event.hostId;
      notifyContent = `${user.name || user.email || "参加者"}さんが「${event.theme}」への参加をキャンセルしました`;
    });

    // 通知はトランザクション外（失敗してもキャンセルは成功扱い）
    try {
      await db.insert(notificationsTable).values({
        userId: notifyUserId!,
        type: "cancel",
        content: notifyContent!,
      });
    } catch (notifErr) {
      req.log.warn({ err: notifErr }, "cancel notification failed");
    }

    res.json({ message: "キャンセルしました" });
  } catch (err: any) {
    if (err?.status) { res.status(err.status).json({ error: err.message }); return; }
    req.log.error({ err }, "cancelParticipation error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
