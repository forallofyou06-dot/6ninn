import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/getOrCreateUser";
import { getAuth } from "@clerk/express";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId;
    const auth = getAuth(req);
    const email = (auth?.sessionClaims?.email as string) || "";
    const user = await getOrCreateUser(clerkUserId, email);
    const notifications = await db.select().from(notificationsTable)
      .where(eq(notificationsTable.userId, user.id))
      .orderBy(notificationsTable.createdAt);
    res.json(notifications.reverse().map((n) => ({
      id: n.id, type: n.type, content: n.content,
      isRead: n.isRead, createdAt: n.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "listNotifications error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/read-all", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId;
    const auth = getAuth(req);
    const email = (auth?.sessionClaims?.email as string) || "";
    const user = await getOrCreateUser(clerkUserId, email);
    await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.userId, user.id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "markAllRead error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id/read", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const clerkUserId = (req as any).clerkUserId;
    const auth = getAuth(req);
    const email = (auth?.sessionClaims?.email as string) || "";
    const user = await getOrCreateUser(clerkUserId, email);
    await db.update(notificationsTable).set({ isRead: true })
      .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, user.id)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "markRead error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
