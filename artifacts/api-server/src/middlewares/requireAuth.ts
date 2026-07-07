import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

const ALLOWED_DOMAIN = "@0101.co.jp";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const email = (auth?.sessionClaims?.email as string) ?? "";
  if (email && !email.endsWith(ALLOWED_DOMAIN)) {
    res.status(403).json({ error: `このサービスは ${ALLOWED_DOMAIN} のメールアドレスのみ利用できます。` });
    return;
  }

  (req as any).clerkUserId = userId;
  next();
}
