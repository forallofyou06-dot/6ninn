import { Router } from "express";
import { db, feedbacksTable, eventsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/getOrCreateUser";
import { getAuth } from "@clerk/express";

const router = Router();

router.post("/", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId;
    const auth = getAuth(req);
    const email = (auth?.sessionClaims?.email as string) || "";
    const user = await getOrCreateUser(clerkUserId, email);
    const { content, eventId } = req.body;
    if (!content?.trim()) { res.status(400).json({ error: "内容を入力してください" }); return; }
    await db.insert(feedbacksTable).values({
      fromUserId: user.id,
      content: content.trim(),
      eventId: eventId || null,
    });
    res.status(201).json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "submitFeedback error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
