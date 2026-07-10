import { db, eventsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function computeAndUpdateStatus(
  event: typeof eventsTable.$inferSelect,
  participantsCount: number
): Promise<string> {
  const now = new Date();
  const deadline = new Date(event.deadline);
  const datetime = new Date(event.datetime);
  const endDatetime = new Date(datetime.getTime() + event.durationMinutes * 60 * 1000);

  let newStatus = event.status;

  if (event.status === "募集中") {
    if (now > deadline) {
      newStatus = participantsCount >= event.minParticipants ? "実施確定" : "未実施";
    }
  }

  if (newStatus === "実施確定" && now > endDatetime) {
    newStatus = "開催済";
  }

  if (newStatus !== event.status) {
    await db.update(eventsTable).set({ status: newStatus }).where(eq(eventsTable.id, event.id));
  }
  return newStatus;
}
