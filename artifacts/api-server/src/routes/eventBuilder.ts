import { db, usersTable, participationsTable, eventsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { getEventTagNames } from "../lib/tags";
import { computeAndUpdateStatus } from "../lib/lifecycle";

export async function buildEventResponse(
  event: typeof eventsTable.$inferSelect,
  currentUserId: number | null
) {
  const host = await db.select().from(usersTable).where(eq(usersTable.id, event.hostId)).limit(1);
  const [partRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(participationsTable)
    .where(and(eq(participationsTable.eventId, event.id), eq(participationsTable.status, "申込")));
  const participantsCount = Number(partRow?.count ?? 0);
  const effectiveStatus = await computeAndUpdateStatus(event, participantsCount);
  const remainingSeats = Math.max(0, event.capacity - participantsCount);
  let isApplied = false;
  if (currentUserId) {
    const part = await db
      .select()
      .from(participationsTable)
      .where(and(eq(participationsTable.eventId, event.id), eq(participationsTable.userId, currentUserId), eq(participationsTable.status, "申込")))
      .limit(1);
    isApplied = part.length > 0;
  }
  const tags = await getEventTagNames(event.id);
  return {
    id: event.id,
    theme: event.theme,
    subTheme: event.subTheme ?? null,
    datetime: event.datetime instanceof Date ? event.datetime.toISOString() : event.datetime,
    durationMinutes: event.durationMinutes,
    location: event.location,
    locationUrl: event.locationUrl ?? null,
    fee: event.fee,
    capacity: event.capacity,
    minParticipants: event.minParticipants,
    deadline: event.deadline,
    notes: event.notes ?? null,
    tags,
    hostId: event.hostId,
    hostName: host[0]?.name ?? null,
    hostDepartment: host[0]?.department ?? null,
    participantsCount,
    remainingSeats,
    status: effectiveStatus,
    isApplied,
    isHost: currentUserId === event.hostId,
    createdAt: event.createdAt instanceof Date ? event.createdAt.toISOString() : event.createdAt,
  };
}
