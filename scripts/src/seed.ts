import { db, usersTable, eventsTable, applicationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  const [host] = await db
    .insert(usersTable)
    .values({ clerkUserId: "demo_host_001", displayName: "田中 めぐみ", email: "megumi@0101.co.jp", tags: ["映画", "食", "旅"] })
    .onConflictDoUpdate({ target: usersTable.clerkUserId, set: { displayName: "田中 めぐみ" } })
    .returning();
  console.log("Host:", host.id, host.displayName);

  const [part2] = await db
    .insert(usersTable)
    .values({ clerkUserId: "demo_part_002", displayName: "佐藤 こうき", email: "koki@0101.co.jp", tags: ["音楽", "食"] })
    .onConflictDoUpdate({ target: usersTable.clerkUserId, set: { displayName: "佐藤 こうき" } })
    .returning();
  console.log("Participant:", part2.id, part2.displayName);

  const now = new Date();
  const d = (daysFromNow: number, hours = 0) =>
    new Date(now.getTime() + daysFromNow * 86400000 + hours * 3600000);

  const existing = await db.select().from(eventsTable).where(eq(eventsTable.hostId, host.id));
  if (existing.length > 0) {
    console.log("Events already seeded, skipping.");
    return;
  }

  const events = await db
    .insert(eventsTable)
    .values([
      {
        hostId: host.id,
        theme: "Seoulの楽しみ方",
        subTheme: "韓国料理 × 最近のソウル事情",
        dateStart: d(3),
        dateEnd: d(3, 2),
        location: "soban 韓国創作料理 渋谷",
        fee: 4000,
        capacity: 6,
        tags: ["食", "旅", "韓国"],
        status: "open",
      },
      {
        hostId: host.id,
        theme: "最近読んだ本",
        subTheme: "今年一番良かった一冊を持ち寄る会",
        dateStart: d(7),
        dateEnd: d(7, 2),
        location: "渋谷 茶亭 羽當",
        fee: 1500,
        capacity: 4,
        tags: ["読書", "本", "文化"],
        status: "open",
      },
      {
        hostId: host.id,
        theme: "カメラ散歩 下北沢",
        dateStart: d(14),
        dateEnd: d(14, 2),
        location: "下北沢 駅前広場 集合",
        fee: 0,
        capacity: 5,
        tags: ["写真", "散歩", "アウトドア"],
        status: "open",
      },
    ])
    .returning();

  console.log("Created", events.length, "events");

  await db.insert(applicationsTable).values({
    eventId: events[0].id,
    userId: part2.id,
    status: "active",
  }).onConflictDoNothing();

  console.log("Seeded application for first event");
  console.log("Done!");
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
