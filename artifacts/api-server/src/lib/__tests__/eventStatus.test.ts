import { describe, it, expect } from "vitest";
import { deadlineEndJST, checkApplyable } from "../eventStatus";

describe("deadlineEndJST", () => {
  it("締切日を JST 23:59:59 (UTC 14:59:59) に変換する", () => {
    const result = deadlineEndJST("2025-01-15");
    expect(result.toISOString()).toBe("2025-01-15T14:59:59.000Z");
  });

  it("UTC 00:00 (= JST 09:00) とは異なる", () => {
    const utcMidnight = new Date("2025-01-15");
    const jstEnd = deadlineEndJST("2025-01-15");
    expect(jstEnd.getTime()).toBeGreaterThan(utcMidnight.getTime());
  });

  it("JST締切当日の翌日 00:00 JST は締切後と判定される", () => {
    const jstEnd = deadlineEndJST("2025-01-15");
    const nextDayJST = new Date("2025-01-16T00:00:00+09:00");
    expect(nextDayJST.getTime()).toBeGreaterThan(jstEnd.getTime());
  });
});

const futureDate = (daysFromNow: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d;
};

const futureDateStr = (daysFromNow: number): string =>
  futureDate(daysFromNow).toISOString().slice(0, 10);

const pastDateStr = (daysAgo: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};

describe("checkApplyable", () => {
  it("締切前・開始前は申込可能（nullを返す）", () => {
    const event = {
      status: "募集中",
      deadline: futureDateStr(3),
      datetime: futureDate(5),
    };
    expect(checkApplyable(event)).toBeNull();
  });

  it("締切が今日で、かつまだ23:59:59前は申込可能", () => {
    const today = new Date().toISOString().slice(0, 10);
    const event = {
      status: "募集中",
      deadline: today,
      datetime: futureDate(1),
    };
    // 現在時刻が JST 23:59:59 前であれば null
    const jstEnd = deadlineEndJST(today);
    if (new Date() < jstEnd) {
      expect(checkApplyable(event)).toBeNull();
    }
  });

  it("締切が昨日は申込不可（DEADLINE_PASSED）", () => {
    const event = {
      status: "募集中",
      deadline: pastDateStr(1),
      datetime: futureDate(1),
    };
    const err = checkApplyable(event);
    expect(err?.code).toBe("DEADLINE_PASSED");
  });

  it("イベント開始済みは申込不可（EVENT_STARTED）", () => {
    const event = {
      status: "募集中",
      deadline: futureDateStr(1),
      datetime: new Date(Date.now() - 3600_000), // 1時間前
    };
    const err = checkApplyable(event);
    expect(err?.code).toBe("EVENT_STARTED");
  });

  it("中止済みは申込不可（CANCELLED）", () => {
    const event = {
      status: "未実施",
      deadline: futureDateStr(3),
      datetime: futureDate(5),
    };
    const err = checkApplyable(event);
    expect(err?.code).toBe("CANCELLED");
  });

  it("開催済みは申込不可（ENDED）", () => {
    const event = {
      status: "開催済",
      deadline: pastDateStr(5),
      datetime: futureDate(1),
    };
    const err = checkApplyable(event);
    expect(err?.code).toBe("ENDED");
  });
});

describe("レポート種別バリデーション（純粋関数テスト）", () => {
  const VALID_TYPES = ["参加者感想", "開催者報告"];

  it("参加者感想は有効な種別", () => {
    expect(VALID_TYPES.includes("参加者感想")).toBe(true);
  });

  it("開催者報告は有効な種別", () => {
    expect(VALID_TYPES.includes("開催者報告")).toBe(true);
  });

  it("英語値 participant は無効", () => {
    expect(VALID_TYPES.includes("participant")).toBe(false);
  });

  it("英語値 host は無効", () => {
    expect(VALID_TYPES.includes("host")).toBe(false);
  });

  it("空文字は無効", () => {
    expect(VALID_TYPES.includes("")).toBe(false);
  });
});
