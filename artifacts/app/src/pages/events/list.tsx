import { useState } from "react";
import { useListEvents } from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Link } from "wouter";
import { Calendar, MapPin, Users, ChevronRight, SlidersHorizontal, X, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deadlineEndJst } from "@/lib/datetime";

const PRESET_TAGS = ["食", "映画", "読書", "音楽", "旅", "スポーツ", "テクノロジー", "アート", "韓国", "猫", "歴史", "ゲーム", "料理"];
const SORT_OPTIONS = [
  { value: "new", label: "新着順" },
  { value: "near", label: "開催が近い順" },
  { value: "seats", label: "残席わずか順" },
];

function statusBadge(status: string) {
  if (status === "実施確定") return <span className="text-xs font-medium px-2 py-0.5 bg-green-100 text-green-700 rounded-full">実施確定</span>;
  if (status === "未実施") return <span className="text-xs font-medium px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">未実施</span>;
  if (status === "開催済") return <span className="text-xs font-medium px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">開催済</span>;
  return null;
}

function EventCard({ event }: { event: any }) {
  const dateObj = new Date(event.datetime);
  const isFull = event.remainingSeats === 0 && !["開催済", "未実施"].includes(event.status);
  return (
    <Link href={`/events/${event.id}`}>
      <div className={`border p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-[0.99] ${event.isDeadlineSoon ? "bg-amber-50/70 border-amber-300 ring-1 ring-amber-200" : "bg-card border-border"}`}>
        {event.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-2">
            {event.tags.slice(0, 3).map((tag: string) => (
              <span key={tag} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">#{tag}</span>
            ))}
          </div>
        )}
        <div className="flex justify-between items-start">
          <h2 className="text-base font-bold leading-snug flex-1 pr-2">{event.theme}</h2>
          <div className="flex items-center justify-end gap-1.5 flex-wrap">
            {event.isDeadlineSoon && <span className="text-xs font-semibold px-2 py-0.5 bg-amber-500 text-white rounded-full">締切間近</span>}
            {isFull && <span className="text-xs font-semibold px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full">満席</span>}
            {statusBadge(event.status)}
          </div>
        </div>
        {event.subTheme && <p className="text-xs text-muted-foreground mt-0.5">{event.subTheme}</p>}

        <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar size={13} />
            <span>{format(dateObj, "M月d日(E) HH:mm", { locale: ja })}</span>
          </div>
          <div className={`flex items-center gap-2 ${event.isDeadlineSoon ? "font-semibold text-amber-700" : ""}`}>
            <Clock3 size={13} />
            <span>申込締切: {format(deadlineEndJst(event.deadline), "M月d日(E)", { locale: ja })}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={13} />
            <span className="truncate">{event.location}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={13} />
              <div className="flex gap-1">
                {Array.from({ length: event.capacity }).map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${i < event.participantsCount ? "bg-primary" : "bg-muted border border-border"}`} />
                ))}
              </div>
              {event.remainingSeats > 0 ? (
                <span className="text-xs text-primary font-medium">あと{event.remainingSeats}席</span>
              ) : (
                <span className="text-xs font-semibold text-rose-700">満席</span>
              )}
            </div>
            <span className="font-medium text-foreground">¥{event.fee.toLocaleString()}</span>
          </div>
        </div>

        {event.isApplied && (
          <div className="mt-2 pt-2 border-t border-border">
            <span className="text-xs text-primary font-medium">✓ 申込済み</span>
          </div>
        )}
      </div>
    </Link>
  );
}

function ReportEventCard({ event }: { event: any }) {
  return (
    <Link href={`/events/${event.id}`}>
      <div className="bg-card border border-border p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            {event.tags.slice(0, 2).map((tag: string) => (
              <span key={tag} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full mr-1">#{tag}</span>
            ))}
            <h3 className="text-sm font-bold mt-1">{event.theme}</h3>
            <p className="text-xs text-muted-foreground mt-1">{format(new Date(event.datetime), "M月d日(E)", { locale: ja })} · {event.location}</p>
          </div>
          <ChevronRight size={14} className="text-muted-foreground mt-1" />
        </div>
        <div className="mt-2 text-xs text-primary hover:underline">レポートを見る →</div>
      </div>
    </Link>
  );
}

export default function EventsList() {
  const [tab, setTab] = useState<"open" | "closed">("open");
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<"new" | "near" | "seats">("new");
  const [showFilters, setShowFilters] = useState(false);

  const { data: openEvents, isLoading: openLoading } = useListEvents({
    status: "募集中",
    tag: selectedTag,
    sortBy,
  });
  const { data: confirmedEvents } = useListEvents({ status: "実施確定", tag: selectedTag, sortBy });
  const { data: closedEvents } = useListEvents({ status: "開催済", sortBy: "near" });

  const activeEvents = [...(openEvents ?? []), ...(confirmedEvents ?? [])]
    .sort((a, b) => {
      const deadlinePriority = Number(b.isDeadlineSoon) - Number(a.isDeadlineSoon);
      if (deadlinePriority !== 0) return deadlinePriority;
      if (sortBy === "near") return new Date(a.datetime).getTime() - new Date(b.datetime).getTime();
      if (sortBy === "seats") return a.remainingSeats - b.remainingSeats;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  const endedEvents = closedEvents ?? [];

  return (
    <MobileLayout>
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-serif font-bold">偶然の6人</h1>
          <Button variant="ghost" size="icon" onClick={() => setShowFilters((v) => !v)}>
            <SlidersHorizontal size={18} className={showFilters ? "text-primary" : ""} />
          </Button>
        </div>

        {showFilters && (
          <div className="mb-4 p-3 bg-muted/50 rounded-xl space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">タグで絞り込み</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_TAGS.map((t) => (
                  <button key={t} type="button"
                    onClick={() => setSelectedTag(selectedTag === t ? undefined : t)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${selectedTag === t ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border"}`}
                  >#{t}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">並び替え</p>
              <div className="flex gap-2">
                {SORT_OPTIONS.map((o) => (
                  <button key={o.value} type="button"
                    onClick={() => setSortBy(o.value as any)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${sortBy === o.value ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"}`}
                  >{o.label}</button>
                ))}
              </div>
            </div>
            {selectedTag && (
              <button onClick={() => setSelectedTag(undefined)} className="text-xs text-destructive flex items-center gap-1">
                <X size={12} /> フィルターをリセット
              </button>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-muted rounded-lg p-1">
          <button onClick={() => setTab("open")} className={`flex-1 text-sm py-1.5 rounded-md transition-colors font-medium ${tab === "open" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
            募集中 {activeEvents.length > 0 && <span className="text-primary">({activeEvents.length})</span>}
          </button>
          <button onClick={() => setTab("closed")} className={`flex-1 text-sm py-1.5 rounded-md transition-colors font-medium ${tab === "closed" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
            終了した会
          </button>
        </div>
      </div>

      <div className="px-4 pb-24">
        {tab === "open" ? (
          openLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="animate-pulse bg-muted h-36 rounded-xl" />)}</div>
          ) : activeEvents.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="mb-2">募集中の会がありません</p>
              {selectedTag && <button onClick={() => setSelectedTag(undefined)} className="text-xs text-primary">フィルターをリセット</button>}
            </div>
          ) : (
            <div className="space-y-3">
              {activeEvents.map(event => <EventCard key={event.id} event={event} />)}
            </div>
          )
        ) : (
          endedEvents.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p>まだ終了した会がありません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {endedEvents.map(event => <ReportEventCard key={event.id} event={event} />)}
            </div>
          )
        )}
      </div>
    </MobileLayout>
  );
}
