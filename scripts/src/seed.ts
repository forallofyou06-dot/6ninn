import { db, usersTable, eventsTable, participationsTable, tagsTable, eventTagsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  // ユーザー
  const [host] = await db
    .insert(usersTable)
    .values({
      clerkUserId: "demo_host_001",
      name: "田中 めぐみ",
      email: "megumi@0101.co.jp",
      department: "マーケティング部",
      role: "member",
      interestTags: ["映画", "食", "旅"],
    })
    .onConflictDoUpdate({
      target: usersTable.clerkUserId,
      set: { name: "田中 めぐみ", email: "megumi@0101.co.jp" },
    })
    .returning();
  console.log("Host:", host.id, host.name);

  const [part2] = await db
    .insert(usersTable)
    .values({
      clerkUserId: "demo_part_002",
      name: "佐藤 こうき",
      email: "koki@0101.co.jp",
      department: "エンジニアリング部",
      role: "member",
      interestTags: ["音楽", "食", "テクノロジー"],
    })
    .onConflictDoUpdate({
      target: usersTable.clerkUserId,
      set: { name: "佐藤 こうき", email: "koki@0101.co.jp" },
    })
    .returning();
  console.log("Participant:", part2.id, part2.name);

  // タグ
  const tagNames = ["食", "映画", "読書", "音楽", "旅", "スポーツ", "テクノロジー", "韓国", "猫", "料理"];
  await db.insert(tagsTable).values(tagNames.map((name) => ({ name }))).onConflictDoNothing();
  const allTags = await db.select().from(tagsTable).where(inArray(tagsTable.name, tagNames));
  const tagByName = Object.fromEntries(allTags.map((t) => [t.name, t.id]));

  // 既にseeded済みなら何もしない
  const existing = await db.select().from(eventsTable).where(eq(eventsTable.hostId, host.id));
  if (existing.length > 0) {
    console.log("Events already seeded, skipping events.");
    console.log("Done!");
    process.exit(0);
  }

  const now = new Date();
  const d = (daysFromNow: number, hours = 19) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + daysFromNow);
    dt.setHours(hours, 0, 0, 0);
    return dt;
  };
  const deadlineStr = (daysFromNow: number): string => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + daysFromNow);
    return dt.toISOString().slice(0, 10);
  };

  await db.transaction(async (tx) => {
    const events = await tx
      .insert(eventsTable)
      .values([
        {
          hostId: host.id,
          theme: "ソウルの楽しみ方",
          subTheme: "韓国料理 × 最近のソウル事情",
          datetime: d(5),
          durationMinutes: 120,
          location: "渋谷 韓国料理店",
          fee: 4000,
          capacity: 6,
          minParticipants: 3,
          deadline: deadlineStr(3),
          status: "募集中",
        },
        {
          hostId: host.id,
          theme: "最近読んだ本を持ち寄る会",
          subTheme: "今年一番良かった一冊を語ろう",
          datetime: d(10),
          durationMinutes: 90,
          location: "渋谷 カフェ 羽當",
          fee: 1500,
          capacity: 4,
          minParticipants: 2,
          deadline: deadlineStr(8),
          status: "募集中",
        },
        {
          hostId: host.id,
          theme: "カメラ散歩 下北沢",
          datetime: d(15),
          durationMinutes: 120,
          location: "下北沢 駅前広場 集合",
          fee: 0,
          capacity: 5,
          minParticipants: 3,
          deadline: deadlineStr(13),
          status: "募集中",
        },
      ])
      .returning();

    console.log("Created", events.length, "events");

    // イベントタグ
    const tagsPerEvent: Record<number, string[]> = {
      0: ["食", "韓国", "旅"],
      1: ["読書"],
      2: ["旅", "スポーツ"],
    };
    for (const [idx, event] of events.entries()) {
      const names = tagsPerEvent[idx] ?? [];
      const ids = names.map((n) => tagByName[n]).filter(Boolean);
      if (ids.length) {
        await tx.insert(eventTagsTable).values(ids.map((tagId) => ({ eventId: event.id, tagId }))).onConflictDoNothing();
      }
    }

    // 参加申込
    await tx
      .insert(participationsTable)
      .values({
        eventId: events[0].id,
        userId: part2.id,
        status: "申込",
        comment: "よろしくお願いします！",
      })
      .onConflictDoNothing();

    console.log("Seeded participation for first event");
  });

  console.log("Done!");
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
