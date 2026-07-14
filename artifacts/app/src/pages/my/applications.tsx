import { useListMyApplications, useListMyHostedEvents, useCancelParticipation, getListMyApplicationsQueryKey } from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { deadlineEndJst } from "@/lib/datetime";

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    "募集中": "bg-green-100 text-green-700",
    "実施確定": "bg-blue-100 text-blue-700",
    "開催済": "bg-gray-100 text-gray-600",
    "未実施": "bg-red-100 text-red-600",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || "bg-muted text-muted-foreground"}`}>{status}</span>;
}

export default function MyApplications() {
  const [tab, setTab] = useState<"applied" | "hosted">("applied");
  const { data: applications } = useListMyApplications();
  const { data: hostedEvents } = useListMyHostedEvents();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const cancelMutation = useCancelParticipation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMyApplicationsQueryKey() });
        toast({ title: "キャンセルしました" });
      },
      onError: () => toast({ title: "キャンセルに失敗しました", variant: "destructive" }),
    },
  });

  return (
    <MobileLayout>
      <div className="p-4 pb-24">
        <Link href="/my" className="inline-flex items-center text-sm text-muted-foreground mb-4">
          <ChevronLeft size={16} /> マイページ
        </Link>

        <div className="flex gap-1 mb-4 bg-muted rounded-lg p-1">
          <button onClick={() => setTab("applied")} className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${tab === "applied" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
            参加履歴
          </button>
          <button onClick={() => setTab("hosted")} className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${tab === "hosted" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
            ひらいた会
          </button>
        </div>

        {tab === "applied" ? (
          !applications?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">まだ参加申込がありません</p>
              <Link href="/events"><span className="text-xs text-primary mt-2 inline-block">会を探してみましょう →</span></Link>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app: any) => {
                const event = app.event;
                if (!event) return null;
                const isPastDeadline = new Date() > deadlineEndJst(event.deadline);
                const isActive = event.status === "募集中" || event.status === "実施確定";
                return (
                  <div key={app.id} className="bg-card border border-border rounded-xl overflow-hidden">
                    <Link href={`/events/${app.eventId}`}>
                      <div className="p-4 hover:bg-muted/20 cursor-pointer">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-semibold text-sm flex-1">{event.theme}</h3>
                          {statusBadge(event.status)}
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={11} />
                            <span>{format(new Date(event.datetime), "M月d日(E) HH:mm", { locale: ja })}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin size={11} />
                            <span>{event.location}</span>
                          </div>
                        </div>
                        {app.comment && <p className="text-xs text-muted-foreground mt-2 italic">「{app.comment}」</p>}
                        <p className="text-xs text-muted-foreground mt-2">申込日: {format(new Date(app.appliedAt), "yyyy/M/d", { locale: ja })}</p>
                      </div>
                    </Link>
                    {isActive && !isPastDeadline && (
                      <div className="border-t border-border px-4 py-2 flex justify-end">
                        <Button variant="ghost" size="sm" onClick={() => cancelMutation.mutate({ id: app.eventId })} disabled={cancelMutation.isPending} className="text-destructive hover:text-destructive text-xs h-7">
                          キャンセル
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          !hostedEvents?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <ChevronRight size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">まだ会を開いたことがありません</p>
              <Link href="/events/new"><span className="text-xs text-primary mt-2 inline-block">はじめての会をひらく →</span></Link>
            </div>
          ) : (
            <div className="space-y-3">
              {hostedEvents.map((event: any) => (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <div className="bg-card border border-border rounded-xl p-4 hover:shadow-sm cursor-pointer">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-sm flex-1">{event.theme}</h3>
                      {statusBadge(event.status)}
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={11} />
                        <span>{format(new Date(event.datetime), "M月d日(E) HH:mm", { locale: ja })}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin size={11} />
                        <span>{event.location}</span>
                      </div>
                      <div>参加者: {event.participantsCount}/{event.capacity}人</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}
      </div>
    </MobileLayout>
  );
}
