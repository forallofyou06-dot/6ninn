import { db, notificationsTable } from "@workspace/db";

export async function createNotification(userId: number, type: string, content: string) {
  try {
    await db.insert(notificationsTable).values({ userId, type, content });
  } catch (_) {
    // notifications are non-critical
  }
}
