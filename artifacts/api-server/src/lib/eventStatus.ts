/**
 * 締切日（YYYY-MM-DD）を日本時間23:59:59のDateに変換する。
 * new Date("YYYY-MM-DD") はUTC 00:00として扱われてしまうため、
 * JST終端を明示的に指定する。
 */
export function deadlineEndJST(deadline: string): Date {
  return new Date(`${deadline}T23:59:59+09:00`);
}

export type EventApplyError =
  | { code: "CANCELLED"; message: string }
  | { code: "ENDED"; message: string }
  | { code: "DEADLINE_PASSED"; message: string }
  | { code: "EVENT_STARTED"; message: string }
  | null;

/**
 * 現時点で申込可能かを判定する。
 * DBのstatusに依存せず、時刻から直接導出する。
 */
export function checkApplyable(event: {
  status: string;
  deadline: string;
  datetime: Date | string;
}): EventApplyError {
  const now = new Date();
  if (event.status === "未実施") return { code: "CANCELLED", message: "この会は中止されました" };
  if (event.status === "開催済") return { code: "ENDED", message: "この会はすでに終了しました" };
  if (now > deadlineEndJST(event.deadline)) return { code: "DEADLINE_PASSED", message: "申込締切を過ぎています" };
  if (now > new Date(event.datetime)) return { code: "EVENT_STARTED", message: "イベントはすでに開始しています" };
  return null;
}
