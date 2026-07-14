import { createClient, type Session, type User } from "@supabase/supabase-js";
import {
  useMutation,
  useQuery,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";

type ViteEnvironment = {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
};

const environment = (import.meta as ImportMeta & { env?: ViteEnvironment }).env ?? {};
const supabaseUrl = environment.VITE_SUPABASE_URL;
const supabaseKey = environment.VITE_SUPABASE_PUBLISHABLE_KEY ?? environment.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be configured at build time.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "guuzen-no-6nin-auth",
  },
});

export type { Session, User };

export type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  lastName: string | null;
  firstName: string | null;
  department: string | null;
  role: "member" | "office" | "maintainer";
  interestTags: string[];
  profileComplete: boolean;
  createdAt: string;
};

export type EventRecord = {
  id: number;
  theme: string;
  subTheme: string | null;
  datetime: string;
  durationMinutes: number;
  location: string;
  locationUrl: string | null;
  fee: number;
  capacity: number;
  minParticipants: number;
  deadline: string;
  notes: string | null;
  tags: string[];
  hostId: string;
  hostName: string | null;
  hostDepartment: string | null;
  participantsCount: number;
  remainingSeats: number;
  status: "募集中" | "実施確定" | "開催済" | "未実施";
  isDeadlineSoon: boolean;
  isApplied: boolean;
  isHost: boolean;
  createdAt: string;
};

export type ApplicationRecord = {
  id: number;
  eventId: number;
  status: "申込" | "キャンセル";
  comment: string | null;
  appliedAt: string;
  event: EventRecord | null;
};

export type ReportRecord = {
  id: number;
  eventId: number;
  authorId: string;
  type: "参加者感想" | "開催者報告";
  content: string;
  photoUrl: string | null;
  authorName: string;
  likesCount: number;
  isLiked: boolean;
  createdAt: string;
};

export type NotificationRecord = {
  id: number;
  type: string;
  content: string;
  isRead: boolean;
  createdAt: string;
};

export type ParticipantRecord = {
  id: number;
  userId: string;
  name: string | null;
  department: string | null;
  comment: string | null;
  appliedAt: string;
};

export type OfficeKpi = {
  totalEvents: number;
  completedEvents: number;
  cancelledEvents: number;
  eventsThisMonth: number;
  totalParticipants: number;
  participantsThisMonth: number;
  totalConnectionPairs: number;
  totalFeedbacks: number;
  topTags: Array<{ tag: string; count: number }>;
};

export type OfficeFeedback = {
  id: number;
  content: string;
  fromUserName: string | null;
  fromUserEmail: string;
  eventId: number | null;
  eventTheme: string | null;
  createdAt: string;
};

type QueryOptions<T> = { query?: Partial<UseQueryOptions<T, Error, T, any>> };
type MutationOptions<TData, TVariables> = {
  mutation?: UseMutationOptions<TData, Error, TVariables>;
};

function throwIfError<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error("データを取得できませんでした");
  return result.data;
}

function rpcRows<T>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value as T[];
}

function rpcObject<T>(value: unknown): T {
  return value as T;
}

function normalizeProfile(profile: UserProfile): UserProfile {
  const [lastName = "", ...firstNameParts] = (profile.name ?? "").trim().split(/\s+/).filter(Boolean);
  return {
    ...profile,
    lastName: (profile.lastName ?? lastName) || null,
    firstName: (profile.firstName ?? firstNameParts.join(" ")) || null,
  };
}

function toIsoDatetime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("開催日時が不正です");
  return date.toISOString();
}

function eventParams(data: Record<string, unknown>) {
  return {
    p_theme: String(data.theme ?? ""),
    p_sub_theme: String(data.subTheme ?? ""),
    p_datetime: toIsoDatetime(String(data.datetime ?? "")),
    p_duration_minutes: Number(data.durationMinutes),
    p_location: String(data.location ?? ""),
    p_location_url: String(data.locationUrl ?? ""),
    p_fee: Number(data.fee),
    p_capacity: Number(data.capacity),
    p_min_participants: 3,
    p_deadline: String(data.deadline ?? ""),
    p_notes: String(data.notes ?? ""),
    p_tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
  };
}

function normalizeEvent(event: EventRecord): EventRecord {
  const deadlineTime = new Date(`${event.deadline}T23:59:59+09:00`).getTime();
  const remaining = deadlineTime - Date.now();
  return {
    ...event,
    minParticipants: 3,
    isDeadlineSoon: event.isDeadlineSoon ?? (
      ["募集中", "実施確定"].includes(event.status) && remaining >= 0 && remaining <= 3 * 24 * 60 * 60 * 1000
    ),
  };
}

export const getGetMeQueryKey = () => ["profile", "me"] as const;
export const getGetMyStatsQueryKey = () => ["profile", "stats"] as const;
export const getListEventsQueryKey = () => ["events"] as const;
export const getGetEventQueryKey = (id: number) => ["events", id] as const;
export const getListEventReportsQueryKey = (id: number) => ["events", id, "reports"] as const;
export const getListMyApplicationsQueryKey = () => ["my", "applications"] as const;
export const getListMyHostedEventsQueryKey = () => ["my", "hosted"] as const;
export const getListNotificationsQueryKey = () => ["notifications"] as const;

export function useGetMe(options: QueryOptions<UserProfile> = {}) {
  return useQuery<UserProfile>({
    queryKey: getGetMeQueryKey(),
    queryFn: async () => {
      const result = await supabase.rpc("get_my_profile");
      return normalizeProfile(rpcObject<UserProfile>(throwIfError(result)));
    },
    ...(options.query ?? {}),
  } as any);
}

export function useUpdateMe(options: MutationOptions<UserProfile, { data: Record<string, unknown> }> = {}) {
  return useMutation<UserProfile, Error, { data: Record<string, unknown> }>({
    mutationFn: async ({ data }: { data: Record<string, unknown> }) => {
      const lastName = String(data.lastName ?? "").trim();
      const firstName = String(data.firstName ?? "").trim();
      let result = await supabase.rpc("update_my_profile", {
        p_last_name: lastName,
        p_first_name: firstName,
        p_department: String(data.department ?? ""),
        p_interest_tags: Array.isArray(data.interestTags) ? data.interestTags.map(String) : [],
      });
      if (result.error?.message.includes("update_my_profile")) {
        result = await supabase.rpc("update_my_profile", {
          p_name: `${lastName} ${firstName}`,
          p_department: String(data.department ?? ""),
          p_interest_tags: Array.isArray(data.interestTags) ? data.interestTags.map(String) : [],
        });
      }
      return normalizeProfile(rpcObject<UserProfile>(throwIfError(result)));
    },
    ...(options.mutation ?? {}),
  } as any);
}

export function useListEvents(
  params: { status?: string; tag?: string; sortBy?: "new" | "near" | "seats" } = {},
  options: QueryOptions<EventRecord[]> = {},
) {
  return useQuery<EventRecord[]>({
    queryKey: ["events", params],
    queryFn: async () => {
      const result = await supabase.rpc("list_events", {
        p_status: params.status ?? null,
        p_tag: params.tag ?? null,
        p_sort_by: params.sortBy ?? "new",
      });
      const events = rpcRows<EventRecord>(throwIfError(result)).map(normalizeEvent);
      if ((params.sortBy ?? "new") === "new") {
        events.sort((a, b) => Number(b.isDeadlineSoon) - Number(a.isDeadlineSoon));
      }
      return events;
    },
    ...(options.query ?? {}),
  } as any);
}

export function useGetEvent(id: number, options: QueryOptions<EventRecord> = {}) {
  return useQuery<EventRecord>({
    queryKey: getGetEventQueryKey(id),
    queryFn: async () => {
      const result = await supabase.rpc("get_event", { p_event_id: id });
      return normalizeEvent(rpcObject<EventRecord>(throwIfError(result)));
    },
    ...(options.query ?? {}),
  } as any);
}

export function useCreateEvent(options: MutationOptions<EventRecord, { data: Record<string, unknown> }> = {}) {
  return useMutation<EventRecord, Error, { data: Record<string, unknown> }>({
    mutationFn: async ({ data }: { data: Record<string, unknown> }) => {
      const result = await supabase.rpc("create_event", eventParams(data));
      return normalizeEvent(rpcObject<EventRecord>(throwIfError(result)));
    },
    ...(options.mutation ?? {}),
  } as any);
}

export function useUpdateEvent(options: MutationOptions<EventRecord, { id: number; data: Record<string, unknown> }> = {}) {
  return useMutation<EventRecord, Error, { id: number; data: Record<string, unknown> }>({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const result = await supabase.rpc("update_event", {
        p_event_id: id,
        ...eventParams(data),
      });
      return normalizeEvent(rpcObject<EventRecord>(throwIfError(result)));
    },
    ...(options.mutation ?? {}),
  } as any);
}

export function useApplyToEvent(options: MutationOptions<unknown, { id: number; data?: { comment?: string } }> = {}) {
  return useMutation<unknown, Error, { id: number; data?: { comment?: string } }>({
    mutationFn: async ({ id, data }: { id: number; data?: { comment?: string } }) => {
      const result = await supabase.rpc("apply_to_event", {
        p_event_id: id,
        p_comment: data?.comment ?? null,
      });
      return throwIfError(result);
    },
    ...(options.mutation ?? {}),
  } as any);
}

export function useCancelParticipation(options: MutationOptions<unknown, { id: number }> = {}) {
  return useMutation<unknown, Error, { id: number }>({
    mutationFn: async ({ id }: { id: number }) => {
      const result = await supabase.rpc("cancel_participation", { p_event_id: id });
      return throwIfError(result);
    },
    ...(options.mutation ?? {}),
  } as any);
}

export function useListMyApplications(options: QueryOptions<ApplicationRecord[]> = {}) {
  return useQuery<ApplicationRecord[]>({
    queryKey: getListMyApplicationsQueryKey(),
    queryFn: async () => rpcRows<ApplicationRecord>(throwIfError(await supabase.rpc("list_my_applications"))).map((application) => ({
      ...application,
      event: application.event ? normalizeEvent(application.event) : null,
    })),
    ...(options.query ?? {}),
  } as any);
}

export function useListMyHostedEvents(options: QueryOptions<EventRecord[]> = {}) {
  return useQuery<EventRecord[]>({
    queryKey: getListMyHostedEventsQueryKey(),
    queryFn: async () => rpcRows<EventRecord>(throwIfError(await supabase.rpc("list_my_hosted_events"))).map(normalizeEvent),
    ...(options.query ?? {}),
  } as any);
}

export function useGetMyStats(options: QueryOptions<{ participated: number; hosted: number; connections: number }> = {}) {
  return useQuery<{ participated: number; hosted: number; connections: number }>({
    queryKey: getGetMyStatsQueryKey(),
    queryFn: async () => rpcObject<{ participated: number; hosted: number; connections: number }>(
      throwIfError(await supabase.rpc("get_my_stats")),
    ),
    ...(options.query ?? {}),
  } as any);
}

export function useListEventReports(id: number, options: QueryOptions<ReportRecord[]> = {}) {
  return useQuery<ReportRecord[]>({
    queryKey: getListEventReportsQueryKey(id),
    queryFn: async () => rpcRows<ReportRecord>(throwIfError(await supabase.rpc("list_event_reports", { p_event_id: id }))),
    ...(options.query ?? {}),
  } as any);
}

export function useListEventParticipants(id: number, options: QueryOptions<ParticipantRecord[]> = {}) {
  return useQuery<ParticipantRecord[]>({
    queryKey: ["events", id, "participants"],
    queryFn: async () => rpcRows<ParticipantRecord>(throwIfError(await supabase.rpc("list_event_participants", { p_event_id: id }))),
    ...(options.query ?? {}),
  } as any);
}

export function useCreateReport(options: MutationOptions<unknown, { id: number; data: Record<string, unknown> }> = {}) {
  return useMutation<unknown, Error, { id: number; data: Record<string, unknown> }>({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const result = await supabase.rpc("create_report", {
        p_event_id: id,
        p_type: String(data.type ?? ""),
        p_content: String(data.content ?? ""),
        p_photo_url: String(data.photoUrl ?? ""),
      });
      return throwIfError(result);
    },
    ...(options.mutation ?? {}),
  } as any);
}

export function useLikeReport(options: MutationOptions<unknown, { id: number }> = {}) {
  return useMutation<unknown, Error, { id: number }>({
    mutationFn: async ({ id }: { id: number }) => {
      const result = await supabase.rpc("toggle_report_like", { p_report_id: id });
      return throwIfError(result);
    },
    ...(options.mutation ?? {}),
  } as any);
}

export function useListNotifications(options: QueryOptions<NotificationRecord[]> = {}) {
  return useQuery<NotificationRecord[]>({
    queryKey: getListNotificationsQueryKey(),
    queryFn: async () => rpcRows<NotificationRecord>(throwIfError(await supabase.rpc("list_notifications"))),
    refetchInterval: 60_000,
    ...(options.query ?? {}),
  } as any);
}

export function useMarkAllNotificationsRead(options: MutationOptions<unknown, void> = {}) {
  return useMutation<unknown, Error, void>({
    mutationFn: async () => throwIfError(await supabase.rpc("mark_all_notifications_read")),
    ...(options.mutation ?? {}),
  } as any);
}

export function useSubmitFeedback(options: MutationOptions<unknown, { data: Record<string, unknown> }> = {}) {
  return useMutation<unknown, Error, { data: Record<string, unknown> }>({
    mutationFn: async ({ data }: { data: Record<string, unknown> }) => {
      return throwIfError(await supabase.rpc("submit_feedback", {
        p_content: String(data.content ?? ""),
        p_event_id: data.eventId == null ? null : Number(data.eventId),
      }));
    },
    ...(options.mutation ?? {}),
  } as any);
}

export function useGetOfficeKpi(options: QueryOptions<OfficeKpi> = {}) {
  return useQuery<OfficeKpi>({
    queryKey: ["office", "kpi"],
    queryFn: async () => rpcObject<OfficeKpi>(throwIfError(await supabase.rpc("get_office_kpi"))),
    ...(options.query ?? {}),
  } as any);
}

export function useListOfficeFeedbacks(options: QueryOptions<OfficeFeedback[]> = {}) {
  return useQuery<OfficeFeedback[]>({
    queryKey: ["office", "feedbacks"],
    queryFn: async () => rpcRows<OfficeFeedback>(throwIfError(await supabase.rpc("list_office_feedbacks"))),
    ...(options.query ?? {}),
  } as any);
}

function csvCell(value: unknown): string {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function exportOfficeEventsCsv(): Promise<void> {
  const events = rpcRows<EventRecord>(throwIfError(await supabase.rpc("list_office_events"))).map(normalizeEvent);
  const header = ["id", "テーマ", "状態", "開催日時", "場所", "会費", "定員", "参加者数", "ホスト", "締切日", "作成日時"];
  const rows = events.map((event) => [
    event.id, event.theme, event.status, event.datetime, event.location, event.fee,
    event.capacity, event.participantsCount, event.hostName, event.deadline, event.createdAt,
  ]);
  const csv = `\ufeff${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "events.csv";
  link.click();
  URL.revokeObjectURL(url);
}
