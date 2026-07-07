import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/getOrCreateUser";
import { getAuth } from "@clerk/express";

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId;
    const auth = getAuth(req);
    const email = auth?.sessionClaims?.email as string || "";
    const name = auth?.sessionClaims?.name as string || (auth?.sessionClaims?.firstName as string) || "";
    const user = await getOrCreateUser(clerkUserId, email, name);
    res.json({
      id: user.id,
      clerkUserId: user.clerkUserId,
      displayName: user.displayName,
      email: user.email,
      tags: user.tags,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "getMe error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/me", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId;
    const { displayName, tags } = req.body;
    const updates: any = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (tags !== undefined) updates.tags = tags;
    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.clerkUserId, clerkUserId)).returning();
    if (!updated) { res.status(404).json({ error: "User not found" }); return; }
    res.json({
      id: updated.id,
      clerkUserId: updated.clerkUserId,
      displayName: updated.displayName,
      email: updated.email,
      tags: updated.tags,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "updateMe error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
